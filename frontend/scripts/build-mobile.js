#!/usr/bin/env node
/**
 * Mobile Build Script
 *
 * This script handles building the Next.js app for Capacitor mobile deployment.
 * It temporarily moves API routes out of the way since static export doesn't support them.
 * The mobile app will call the Vercel-hosted API instead.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const API_DIR = path.join(__dirname, '../app/api');
const API_BACKUP_DIR = path.join(__dirname, '../app/_api_backup');
const ADMIN_DIR = path.join(__dirname, '../app/admin');
const ADMIN_BACKUP_DIR = path.join(__dirname, '../app/_admin_backup');

function moveRoutesForMobile() {
  // Move API routes (not supported in static export)
  if (fs.existsSync(API_DIR)) {
    console.log('Moving API routes to backup location for static export...');
    fs.renameSync(API_DIR, API_BACKUP_DIR);
  }
  // Move admin routes (not needed in mobile app)
  if (fs.existsSync(ADMIN_DIR)) {
    console.log('Moving admin routes to backup location (not needed in mobile)...');
    fs.renameSync(ADMIN_DIR, ADMIN_BACKUP_DIR);
  }
}

function restoreRoutes() {
  // Restore API routes
  if (fs.existsSync(API_BACKUP_DIR)) {
    console.log('Restoring API routes from backup...');
    if (fs.existsSync(API_DIR)) {
      fs.rmSync(API_DIR, { recursive: true, force: true });
    }
    fs.renameSync(API_BACKUP_DIR, API_DIR);
  }
  // Restore admin routes
  if (fs.existsSync(ADMIN_BACKUP_DIR)) {
    console.log('Restoring admin routes from backup...');
    if (fs.existsSync(ADMIN_DIR)) {
      fs.rmSync(ADMIN_DIR, { recursive: true, force: true });
    }
    fs.renameSync(ADMIN_BACKUP_DIR, ADMIN_DIR);
  }
}

async function build() {
  try {
    // Step 1: Move API and admin routes out of the way
    moveRoutesForMobile();

    // Step 2: Run the Next.js build with static export
    console.log('\nBuilding Next.js app for mobile (static export)...\n');
    execSync('npx next build', {
      stdio: 'inherit',
      env: {
        ...process.env,
        BUILD_TARGET: 'mobile',
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://mkbl.vercel.app/api',
      },
    });

    console.log('\nMobile build completed successfully!');
    console.log('Output directory: ./out');

  } catch (error) {
    console.error('\nBuild failed:', error.message);
    process.exit(1);
  } finally {
    // Step 3: Always restore routes
    restoreRoutes();
  }
}

// Handle cleanup on interruption
process.on('SIGINT', () => {
  console.log('\nBuild interrupted, restoring routes...');
  restoreRoutes();
  process.exit(1);
});

process.on('SIGTERM', () => {
  restoreRoutes();
  process.exit(1);
});

build();
