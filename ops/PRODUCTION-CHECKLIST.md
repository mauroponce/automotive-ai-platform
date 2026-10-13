# Hetzner Production Checklist

- [ ] VPS SSH keys and firewall are configured; only required ports are public.
- [ ] `web`, `worker`, `postgres`, and `caddy` are healthy.
- [ ] Caddy has issued a valid HTTPS certificate.
- [ ] PostgreSQL is not publicly exposed.
- [ ] Secrets are outside Git with minimal permissions.
- [ ] Hetzner Object Storage is private and uses least-privilege credentials.
- [ ] PostgreSQL backups have been restored successfully in an isolated test environment.
- [ ] Encrypted off-host database and media backup destinations are configured.
- [ ] Alerting, log rotation, disk monitoring, and a rollback procedure are tested.
- [ ] `docker compose down -v` and volume pruning are prohibited in production.
