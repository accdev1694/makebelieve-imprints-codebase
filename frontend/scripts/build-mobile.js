#!/usr/bin/env node
/**
 * Mobile Build Script
 *
 * This script prepares the mobile app for building.
 *
 * With the WebView approach, the app loads the production website directly,
 * so we don't need to bundle static files. This script simply syncs the
 * Capacitor configuration to the native projects.
 */

const { execSync } = require('child_process');

async function build() {
  try {
    console.log('\n📱 Preparing mobile app (WebView approach)...\n');
    console.log('The app will load https://makebelieveimprints.co.uk directly.\n');

    // Sync Capacitor configuration to native projects
    console.log('Syncing Capacitor configuration...\n');
    execSync('npx cap sync', { stdio: 'inherit' });

    console.log('\n✅ Mobile app preparation complete!\n');
    console.log('Next steps:');
    console.log('  iOS:     Open ios/App.xcworkspace in Xcode and build');
    console.log('  Android: Open android/ in Android Studio and build');
    console.log('\nThe app will load the production website in a native WebView.');
    console.log('Native features (camera, push notifications) are still available.\n');

  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

build();
