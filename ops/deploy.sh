#!/usr/bin/env bash
# Backend deployment script for IONOS VPS
# Frontend is deployed on Vercel automatically
# Usage: ./deploy.sh user@vps-ip

set -euo pipefail

REMOTE="${1:-}"
REMOTE_DIR="/home/deploy/app/backend"
SSH_OPTS="-o StrictHostKeyChecking=no"

if [ -z "$REMOTE" ]; then
  echo "Error: Remote host not specified"
  echo "Usage: ./deploy.sh user@vps-ip"
  exit 1
fi

echo "=== MakeBelieve Imprints - Backend Deployment ==="
echo "Target: $REMOTE"
echo ""

# Build backend
echo "[1/5] Building backend..."
cd backend
npm ci
npm run test || { echo "Tests failed! Aborting deployment."; exit 1; }
npm run build
cd ..

# Archive artifacts
echo "[2/5] Creating archive..."
tar -czf /tmp/backend.tar.gz -C backend dist package.json package-lock.json prisma

# Copy to server
echo "[3/5] Copying to $REMOTE..."
scp $SSH_OPTS /tmp/backend.tar.gz "$REMOTE:/tmp/"

# Deploy on server
echo "[4/5] Deploying on server..."
ssh $SSH_OPTS "$REMOTE" <<'SSH'
set -e
echo "  - Extracting files..."
sudo mkdir -p /home/deploy/app/backend
sudo tar -xzf /tmp/backend.tar.gz -C /home/deploy/app/backend

echo "  - Installing production dependencies..."
cd /home/deploy/app/backend
npm ci --production

echo "  - Running database migrations..."
npx prisma migrate deploy

echo "  - Restarting backend service..."
pm2 restart backend || pm2 start dist/index.js --name backend --node-args="--max-old-space-size=512"

echo "  - Cleaning up..."
rm /tmp/backend.tar.gz
SSH

# Cleanup local files
echo "[5/5] Cleaning up local artifacts..."
rm /tmp/backend.tar.gz

echo ""
echo "=== Deployment completed successfully ==="
echo "Backend API is now running at: https://api.makebelieveimprints.com"
echo "Frontend (Vercel): https://makebelieveimprints.com"
echo ""
