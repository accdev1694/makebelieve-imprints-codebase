# IONOS Migration & Deployment Guide

This document describes concrete steps, commands, and examples to migrate and deploy the MakeBelieve Imprints app to IONOS (Web Hosting, Cloud VPS, Managed Postgres, Object Storage).

Prerequisites

- IONOS account with Cloud VPS and Object Storage access.
- SSH access to VPS (user@your-vps-ip) and sudo privileges.
- Local dev environment with Node.js, pnpm/npm, Docker (optional), `rclone`, and `psql`/`pg_dump`.
- A deploy user and SSH key configured for GitHub Actions or local deploy.

1. Frontend (Next.js)

Option A — Static export (cheapest, simple CDN hosting)

```bash
# build static export
cd frontend
npm ci
npm run build
# if using next export
npm run export
# output in `out/` — upload to IONOS Webspace or Object Storage + CDN
# example using rsync to VPS webroot
rsync -avz --delete out/ user@your-vps-ip:/var/www/mkbl
```

Option B — SSR (run Next.js Node server)

```bash
# build and copy to VPS
cd frontend
npm ci
npm run build
# copy build and node_modules (or build on server)
scp -r .next package.json package-lock.json user@your-vps-ip:/home/user/app/frontend
# then SSH to server and run
ssh user@your-vps-ip
cd /home/user/app/frontend
npm ci --production
# start with pm2
pm2 start npm --name frontend -- start
```

2. Backend (Express)

```bash
cd backend
npm ci
npm run build
scp -r dist package.json package-lock.json user@your-vps-ip:/home/user/app/backend
ssh user@your-vps-ip
cd /home/user/app/backend
npm ci --production
pm2 start dist/index.js --name backend
```

3. Database migration (Postgres)

Dump from source (AWS RDS or local):

```bash
PGPASSWORD="$SRC_PG_PASSWORD" pg_dump -h $SRC_PG_HOST -U $SRC_PG_USER -Fc -d $SRC_PG_DB -f /tmp/mkbl.dump
scp /tmp/mkbl.dump user@your-vps-ip:/tmp/mkbl.dump
ssh user@your-vps-ip
# if using IONOS Managed Postgres, upload to a machine that has psql access or use psql from CI
PGPASSWORD="$DEST_PG_PASSWORD" pg_restore -h $DEST_PG_HOST -U $DEST_PG_USER -d $DEST_PG_DB -v /tmp/mkbl.dump
```

4. Object storage migration (S3 -> IONOS Object Storage)

Use `rclone` (s3-compatible) or `aws s3 sync` with S3-compatible endpoint.

Example with `rclone`:

```bash
# on local or a temporary machine
rclone config # add source (aws) and dest (ionos)
# then sync
rclone sync s3:mkbl-bucket ionos:mkbl-bucket --progress
```

5. Sessions & Caching

- Option: run Redis on VPS (`apt install redis-server`) for cache. For simplicity, store sessions in Postgres using `connect-pg-simple`.

6. Nginx as reverse proxy and TLS (Let's Encrypt)

- Use `certbot` for TLS and configure Nginx to reverse proxy `/api` to backend and frontend SSR or static files for the rest.

7. CI/CD (GitHub Actions)

- Use SSH deploy: build artifacts in Actions and `scp` to VPS, then `ssh` to run `pm2 reload` and database migrations.

8. Backups & Monitoring

- Schedule `pg_dump` to object storage daily.
- Snapshot object storage or enable versioning.
- Basic monitoring: Healthchecks, UptimeRobot, or small Prometheus + Grafana stack if needed.

Notes & Safety

- Test migrations on a staging VPS first.
- Confirm credentials and firewall rules (open ports 80/443 only; restrict SSH with key-based auth).
- Rotate DB credentials and minimize public exposure.

---

This guide is a starting point; let me know which parts you want as runnable scripts that I can add to `ops/` (deploy.sh, pg_migrate.sh, rclone-sync.sh, nginx conf, pm2 ecosystem, and a GitHub Actions workflow).
