#!/usr/bin/env bash
# Disposable runtime verification. Never points at a deployed database or provider.
set -Eeuo pipefail
suffix="${GITHUB_RUN_ID:-$$}"
network="automotive-smoke-$suffix"
postgres="automotive-smoke-postgres-$suffix"
web="automotive-smoke-web-$suffix"
worker="automotive-smoke-worker-$suffix"
cleanup() {
  docker rm -f "$web" "$worker" "$postgres" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker network create "$network" >/dev/null
docker run -d --name "$postgres" --network "$network" --network-alias postgres \
  -e POSTGRES_USER=automotive -e POSTGRES_PASSWORD=smoke_owner_only -e POSTGRES_DB=automotive postgres:16 >/dev/null
ready=false
for attempt in {1..60}; do
  if docker exec "$postgres" pg_isready -U automotive >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
if [[ "$ready" != true ]]; then docker logs "$postgres"; exit 1; fi

owner_url=postgresql://automotive:smoke_owner_only@postgres:5432/automotive
app_url=postgresql://automotive_app:smoke_app_only@postgres:5432/automotive

docker run --rm --network "$network" -e MIGRATION_DATABASE_URL="$owner_url" \
  -e POSTGRES_APP_PASSWORD=smoke_app_only -e POSTGRES_DB=automotive automotive-ci:migrator
for service in web worker; do
  name="$web"; [[ "$service" == worker ]] && name="$worker"
  docker run -d --name "$name" --network "$network" \
    -e DATABASE_URL="$app_url" -e MIGRATION_DATABASE_URL="$owner_url" \
    -e NEXTAUTH_URL=http://localhost:3000 -e NEXTAUTH_SECRET=disposable-smoke-secret-only \
    -e APP_DEMO_MODE=true -e OPENAI_PAID_PROCESSING_ENABLED=false "automotive-ci:$service" >/dev/null
done
for name in "$web" "$worker"; do
  ready=false
  for attempt in {1..90}; do
    status="$(docker inspect --format '{{.State.Health.Status}}' "$name")"
    if [[ "$status" == healthy ]]; then ready=true; break; fi
    if [[ "$status" == unhealthy ]]; then break; fi
    sleep 1
  done
  if [[ "$ready" != true ]]; then docker logs "$name"; exit 1; fi
  echo "$name: healthy"
done

# Exercise the native/runtime dependencies that a liveness route alone cannot load.
docker exec "$web" node -e 'const {PrismaClient}=require("@prisma/client"); const db=new PrismaClient(); db.$queryRawUnsafe("SELECT 1").then(()=>db.$disconnect()).catch((error)=>{console.error(error.message);process.exit(1)});'
docker exec "$worker" node -e 'require("sharp")({create:{width:1,height:1,channels:3,background:"white"}}).png().toBuffer().then(()=>console.log("Worker Sharp runtime ready")).catch((error)=>{console.error(error.message);process.exit(1)});'
