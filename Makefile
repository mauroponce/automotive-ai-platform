.DEFAULT_GOAL := help
.PHONY: help up down status logs db-backup db-verify clean-safe

help:
	@echo "make up | down | status | logs SERVICE=worker | db-backup | db-verify FILE=... | clean-safe"
	@echo "For the VPS: COMPOSE_FILE=compose.prod.yaml make status"
up:
	docker compose -f $${COMPOSE_FILE:-compose.yaml} up -d --build
down:
	docker compose -f $${COMPOSE_FILE:-compose.yaml} down
status:
	bash ops/status.sh
logs:
	bash ops/logs.sh $${SERVICE:-worker}
db-backup:
	bash ops/backup-db.sh
db-verify:
	bash ops/verify-db-backup.sh "$(FILE)"
clean-safe:
	bash ops/docker-clean-safe.sh
