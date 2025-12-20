# Deployment Guide

## Architecture Overview

**Frontend:** Deployed on Vercel (automatic deployment from GitHub)
**Backend:** Deployed on IONOS VPS (manual or GitHub Actions deployment)
**Database:** IONOS Managed PostgreSQL
**Object Storage:** IONOS S3-compatible Object Storage

## Frontend Deployment (Vercel)

### Initial Setup

1. **Connect GitHub Repository to Vercel:**
   - Visit https://vercel.com and sign in with GitHub
   - Click "New Project" and import the repository
   - Select the `frontend` directory as the root directory
   - Framework Preset: Next.js

2. **Configure Environment Variables:**
   ```bash
   NEXT_PUBLIC_API_URL=https://api.makebelieveimprints.com
   # Add other public env vars as needed
   ```

3. **Build Settings:**
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm ci`
   - Node Version: 22.x

4. **Deployment:**
   - Automatic deployment on every push to `main` branch
   - Preview deployments on pull requests
   - Production URL: https://makebelieveimprints.com (configure custom domain in Vercel)

### Capacitor Mobile App Builds

The frontend code is also used for native mobile apps via Capacitor:

1. **Build static export:**
   ```bash
   cd frontend
   npm run build
   npx cap sync
   ```

2. **iOS Build:**
   ```bash
   npx cap open ios
   # Build in Xcode and submit to App Store
   ```

3. **Android Build:**
   ```bash
   npx cap open android
   # Build in Android Studio and submit to Google Play
   ```

**Important:** Capacitor requires `output: 'export'` in Next.js config (static build only).

## Backend Deployment (IONOS VPS)

### Initial VPS Setup

1. **Provision IONOS Cloud VPS:**
   - Ubuntu 22.04 LTS
   - Minimum: 2 vCPU, 4GB RAM, 80GB SSD
   - Enable firewall: Allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS), 4000 (API - internal only)

2. **Install Dependencies:**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y

   # Install Node.js 22.x
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt install -y nodejs

   # Install PM2 globally
   sudo npm install -g pm2

   # Install Nginx
   sudo apt install -y nginx

   # Install Certbot for SSL
   sudo apt install -y certbot python3-certbot-nginx
   ```

3. **Setup Deployment Directory:**
   ```bash
   sudo mkdir -p /home/deploy/app/backend
   sudo chown -R $USER:$USER /home/deploy/app
   ```

4. **Configure Nginx:**
   - Copy `ops/nginx-site.conf` to `/etc/nginx/sites-available/api.makebelieveimprints.com`
   - Create symlink: `sudo ln -s /etc/nginx/sites-available/api.makebelieveimprints.com /etc/nginx/sites-enabled/`
   - Test config: `sudo nginx -t`
   - Reload: `sudo systemctl reload nginx`

5. **Setup SSL Certificate:**
   ```bash
   sudo certbot --nginx -d api.makebelieveimprints.com
   ```

6. **Configure Environment Variables:**
   Create `/home/deploy/app/backend/.env`:
   ```bash
   NODE_ENV=production
   PORT=4000
   DATABASE_URL=postgresql://user:password@ionos-postgres-host:5432/mkbl_production
   JWT_ACCESS_SECRET=<generate-random-secret>
   JWT_REFRESH_SECRET=<generate-different-random-secret>
   IONOS_S3_ENDPOINT=https://s3.ionos.com
   IONOS_S3_BUCKET=mkbl-uploads
   IONOS_S3_ACCESS_KEY=<ionos-access-key>
   IONOS_S3_SECRET_KEY=<ionos-secret-key>
   ROYAL_MAIL_API_KEY=<royal-mail-api-key>
   ROYAL_MAIL_API_URL=https://api.parcel.royalmail.com
   ```

### Deployment Methods

#### Method 1: GitHub Actions (Recommended)

Automatically deploys on push to `main` branch with changes to `backend/` directory.

**Required GitHub Secrets:**
- `VPS_HOST`: IONOS VPS IP address or hostname
- `VPS_USER`: SSH username (e.g., `deploy`)
- `VPS_SSH_KEY`: Private SSH key for authentication
- `VPS_SSH_PORT`: SSH port (usually 22)

**Setup SSH Key:**
```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions"

# Copy public key to VPS
ssh-copy-id -i ~/.ssh/id_ed25519.pub deploy@vps-ip

# Add private key to GitHub Secrets
cat ~/.ssh/id_ed25519  # Copy this to VPS_SSH_KEY secret
```

#### Method 2: Manual Deployment

Use the `ops/deploy.sh` script:

```bash
cd /path/to/mkbl
./ops/deploy.sh deploy@vps-ip
```

This script:
1. Builds the backend
2. Runs tests (aborts if tests fail)
3. Creates tar.gz archive
4. Copies to VPS via SCP
5. Extracts and installs on VPS
6. Runs database migrations
7. Restarts PM2 process

### Database Migrations

Migrations are run automatically during deployment via `npx prisma migrate deploy`.

**Manual Migration:**
```bash
ssh deploy@vps-ip
cd /home/deploy/app/backend
npx prisma migrate deploy
```

**Create New Migration (Development):**
```bash
# On local machine
cd backend
npx prisma migrate dev --name add_new_field
git add prisma/migrations
git commit -m "feat: add new database field"
git push  # Will deploy migration automatically
```

### Monitoring and Logs

**PM2 Commands:**
```bash
pm2 status              # Check process status
pm2 logs backend        # View logs
pm2 restart backend     # Restart backend
pm2 monit              # Real-time monitoring
```

**Log Files:**
- `/var/log/pm2/backend-out.log` - Application stdout
- `/var/log/pm2/backend-error.log` - Application stderr
- `/var/log/nginx/access.log` - Nginx access logs
- `/var/log/nginx/error.log` - Nginx error logs

**Restart PM2 on Boot:**
```bash
pm2 startup systemd
pm2 save
```

## Database Setup (IONOS Managed PostgreSQL)

1. **Provision Database:**
   - IONOS Cloud Console → Managed PostgreSQL
   - Version: PostgreSQL 16.x
   - Minimum: 2 vCPU, 4GB RAM, 25GB SSD
   - Enable automated backups (daily)

2. **Create Database:**
   ```sql
   CREATE DATABASE mkbl_production;
   CREATE USER mkbl_user WITH PASSWORD 'strong-password';
   GRANT ALL PRIVILEGES ON DATABASE mkbl_production TO mkbl_user;
   ```

3. **Run Initial Migration:**
   ```bash
   cd backend
   DATABASE_URL="postgresql://mkbl_user:password@host:5432/mkbl_production" npx prisma migrate deploy
   ```

4. **Verify Connection:**
   ```bash
   DATABASE_URL="..." npx prisma db pull  # Should complete without errors
   ```

## Object Storage Setup (IONOS S3)

1. **Create Bucket:**
   - IONOS Cloud Console → Object Storage
   - Create bucket: `mkbl-uploads`
   - Region: Same as VPS for low latency
   - Enable versioning (for backup/recovery)

2. **Create Access Keys:**
   - Generate S3 access key and secret key
   - Add to backend `.env` file

3. **Configure CORS (if needed):**
   ```json
   {
     "CORSRules": [
       {
         "AllowedOrigins": ["https://makebelieveimprints.com"],
         "AllowedMethods": ["GET", "PUT", "POST"],
         "AllowedHeaders": ["*"],
         "MaxAgeSeconds": 3000
       }
     ]
   }
   ```

## Rollback Procedures

### Frontend Rollback (Vercel)
1. Go to Vercel Dashboard → Deployments
2. Find previous successful deployment
3. Click "Promote to Production"

### Backend Rollback
```bash
ssh deploy@vps-ip
cd /home/deploy/app/backend

# Stop current process
pm2 stop backend

# Restore from backup (create backups before each deploy)
# Or redeploy previous version from Git
git checkout <previous-commit-hash>
./ops/deploy.sh deploy@vps-ip
```

### Database Rollback
```bash
# Restore from IONOS automated backup
# Or run reverse migration
cd backend
npx prisma migrate resolve --rolled-back <migration-name>
```

## Health Checks

**Backend Health Endpoint:**
```bash
curl https://api.makebelieveimprints.com/health
# Expected: {"status":"ok","timestamp":"2025-01-15T12:00:00Z"}
```

**Database Connection Check:**
```bash
ssh deploy@vps-ip
cd /home/deploy/app/backend
npx prisma db execute --stdin <<< "SELECT 1"
```

**Monitor Uptime:**
- Use UptimeRobot or similar service
- Monitor: https://api.makebelieveimprints.com/health
- Alert on downtime > 2 minutes

## Security Checklist

- [ ] Firewall configured (ufw or IONOS firewall)
- [ ] SSH key authentication only (disable password auth)
- [ ] SSL certificates active and auto-renewing
- [ ] Environment variables in `.env` (not committed to Git)
- [ ] Database connection uses strong password
- [ ] PM2 running as non-root user
- [ ] Nginx security headers configured (see `nginx-site.conf`)
- [ ] Object storage bucket not publicly accessible (use signed URLs)
- [ ] Regular security updates: `sudo apt update && sudo apt upgrade`

## Troubleshooting

### Backend Not Starting
```bash
pm2 logs backend  # Check for errors
node -v           # Verify Node.js version is 22.x
npm ci            # Reinstall dependencies
```

### Database Connection Failed
```bash
# Test connection from VPS
psql postgresql://user:pass@host:5432/dbname
# If fails, check firewall rules and database credentials
```

### Out of Memory
```bash
# Increase PM2 memory limit
pm2 delete backend
pm2 start dist/index.js --name backend --max-memory-restart 1G
```

### SSL Certificate Expired
```bash
sudo certbot renew
sudo systemctl reload nginx
```
