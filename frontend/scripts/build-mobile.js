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

function moveApiRoutes() {
  if (fs.existsSync(API_DIR)) {
    console.log('Moving API routes to backup location for static export...');
    fs.renameSync(API_DIR, API_BACKUP_DIR);
  }
}

function restoreApiRoutes() {
  if (fs.existsSync(API_BACKUP_DIR)) {
    console.log('Restoring API routes from backup...');
    // Remove any api dir that might have been created
    if (fs.existsSync(API_DIR)) {
      fs.rmSync(API_DIR, { recursive: true, force: true });
    }
    fs.renameSync(API_BACKUP_DIR, API_DIR);
  }
}

async function build() {
  try {
    // Step 1: Move API routes out of the way
    moveApiRoutes();

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
    // Step 3: Always restore API routes
    restoreApiRoutes();
  }
}

// Handle cleanup on interruption
process.on('SIGINT', () => {
  console.log('\nBuild interrupted, restoring API routes...');
  restoreApiRoutes();
  process.exit(1);
});

process.on('SIGTERM', () => {
  restoreApiRoutes();
  process.exit(1);
});

build();
