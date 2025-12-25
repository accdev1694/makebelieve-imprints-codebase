#!/usr/bin/env node
/**
 * App Icon and Splash Screen Generator
 *
 * This script generates all required app icon and splash screen sizes
 * for iOS and Android from source SVG files.
 *
 * Prerequisites:
 * - Install sharp: npm install sharp --save-dev
 *
 * Usage:
 * - npm run generate:assets
 *
 * Source files:
 * - resources/icon.svg (1024x1024 recommended)
 * - resources/splash.svg (2732x2732 recommended)
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is installed
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('Error: sharp package is required for asset generation.');
  console.error('Please install it: npm install sharp --save-dev');
  process.exit(1);
}

const RESOURCES_DIR = path.join(__dirname, '../resources');
const IOS_DIR = path.join(__dirname, '../ios/App/App/Assets.xcassets');
const ANDROID_RES_DIR = path.join(__dirname, '../android/app/src/main/res');

// iOS icon sizes (for AppIcon.appiconset)
const IOS_ICON_SIZES = [
  { size: 20, scale: 1, name: 'Icon-App-20x20@1x.png' },
  { size: 20, scale: 2, name: 'Icon-App-20x20@2x.png' },
  { size: 20, scale: 3, name: 'Icon-App-20x20@3x.png' },
  { size: 29, scale: 1, name: 'Icon-App-29x29@1x.png' },
  { size: 29, scale: 2, name: 'Icon-App-29x29@2x.png' },
  { size: 29, scale: 3, name: 'Icon-App-29x29@3x.png' },
  { size: 40, scale: 1, name: 'Icon-App-40x40@1x.png' },
  { size: 40, scale: 2, name: 'Icon-App-40x40@2x.png' },
  { size: 40, scale: 3, name: 'Icon-App-40x40@3x.png' },
  { size: 60, scale: 2, name: 'Icon-App-60x60@2x.png' },
  { size: 60, scale: 3, name: 'Icon-App-60x60@3x.png' },
  { size: 76, scale: 1, name: 'Icon-App-76x76@1x.png' },
  { size: 76, scale: 2, name: 'Icon-App-76x76@2x.png' },
  { size: 83.5, scale: 2, name: 'Icon-App-83.5x83.5@2x.png' },
  { size: 1024, scale: 1, name: 'Icon-App-1024x1024@1x.png' },
];

// Android icon sizes (mipmap folders)
const ANDROID_ICON_SIZES = [
  { size: 48, folder: 'mipmap-mdpi' },
  { size: 72, folder: 'mipmap-hdpi' },
  { size: 96, folder: 'mipmap-xhdpi' },
  { size: 144, folder: 'mipmap-xxhdpi' },
  { size: 192, folder: 'mipmap-xxxhdpi' },
];

// Android splash sizes (drawable folders)
const ANDROID_SPLASH_SIZES = [
  { width: 480, height: 800, folder: 'drawable-mdpi' },
  { width: 720, height: 1280, folder: 'drawable-hdpi' },
  { width: 960, height: 1600, folder: 'drawable-xhdpi' },
  { width: 1280, height: 1920, folder: 'drawable-xxhdpi' },
  { width: 1920, height: 2560, folder: 'drawable-xxxhdpi' },
];

async function generateIosIcons() {
  const iconSvg = path.join(RESOURCES_DIR, 'icon.svg');
  const iconsetDir = path.join(IOS_DIR, 'AppIcon.appiconset');

  if (!fs.existsSync(iconSvg)) {
    console.log('Skipping iOS icons: icon.svg not found');
    return;
  }

  if (!fs.existsSync(iconsetDir)) {
    console.log('Skipping iOS icons: iOS platform not initialized');
    return;
  }

  console.log('Generating iOS icons...');

  for (const icon of IOS_ICON_SIZES) {
    const dimension = Math.round(icon.size * icon.scale);
    const outputPath = path.join(iconsetDir, icon.name);

    await sharp(iconSvg)
      .resize(dimension, dimension)
      .png()
      .toFile(outputPath);

    console.log(`  Created ${icon.name} (${dimension}x${dimension})`);
  }
}

async function generateAndroidIcons() {
  const iconSvg = path.join(RESOURCES_DIR, 'icon.svg');

  if (!fs.existsSync(iconSvg)) {
    console.log('Skipping Android icons: icon.svg not found');
    return;
  }

  if (!fs.existsSync(ANDROID_RES_DIR)) {
    console.log('Skipping Android icons: Android platform not initialized');
    return;
  }

  console.log('Generating Android icons...');

  for (const icon of ANDROID_ICON_SIZES) {
    const folderPath = path.join(ANDROID_RES_DIR, icon.folder);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const outputPath = path.join(folderPath, 'ic_launcher.png');

    await sharp(iconSvg)
      .resize(icon.size, icon.size)
      .png()
      .toFile(outputPath);

    // Also create round icon for Android
    const roundOutputPath = path.join(folderPath, 'ic_launcher_round.png');
    await sharp(iconSvg)
      .resize(icon.size, icon.size)
      .png()
      .toFile(roundOutputPath);

    console.log(`  Created ${icon.folder}/ic_launcher.png (${icon.size}x${icon.size})`);
  }
}

async function generateAndroidSplash() {
  const splashSvg = path.join(RESOURCES_DIR, 'splash.svg');

  if (!fs.existsSync(splashSvg)) {
    console.log('Skipping Android splash: splash.svg not found');
    return;
  }

  if (!fs.existsSync(ANDROID_RES_DIR)) {
    console.log('Skipping Android splash: Android platform not initialized');
    return;
  }

  console.log('Generating Android splash screens...');

  for (const splash of ANDROID_SPLASH_SIZES) {
    const folderPath = path.join(ANDROID_RES_DIR, splash.folder);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const outputPath = path.join(folderPath, 'splash.png');

    await sharp(splashSvg)
      .resize(splash.width, splash.height, {
        fit: 'cover',
        position: 'center',
      })
      .png()
      .toFile(outputPath);

    console.log(`  Created ${splash.folder}/splash.png (${splash.width}x${splash.height})`);
  }
}

async function generatePublicIcons() {
  const iconSvg = path.join(RESOURCES_DIR, 'icon.svg');
  const publicDir = path.join(__dirname, '../public');
  const iconsDir = path.join(publicDir, 'icons');

  if (!fs.existsSync(iconSvg)) {
    console.log('Skipping public icons: icon.svg not found');
    return;
  }

  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  console.log('Generating public web icons...');

  // Standard web icons
  const webSizes = [16, 32, 96, 192, 512];
  for (const size of webSizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    await sharp(iconSvg)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`  Created icons/icon-${size}x${size}.png`);
  }

  // Favicon
  const faviconPath = path.join(publicDir, 'favicon.ico');
  await sharp(iconSvg)
    .resize(32, 32)
    .toFormat('png')
    .toFile(path.join(iconsDir, 'favicon-32.png'));

  // Apple touch icon
  const appleTouchPath = path.join(publicDir, 'apple-touch-icon.png');
  await sharp(iconSvg)
    .resize(180, 180)
    .png()
    .toFile(appleTouchPath);
  console.log('  Created apple-touch-icon.png');
}

async function main() {
  console.log('\n🎨 Generating app assets...\n');

  try {
    await generatePublicIcons();
    await generateIosIcons();
    await generateAndroidIcons();
    await generateAndroidSplash();

    console.log('\n✅ Asset generation complete!\n');
    console.log('Note: After generating assets, run:');
    console.log('  npx cap sync');
    console.log('');
  } catch (error) {
    console.error('\n❌ Asset generation failed:', error.message);
    process.exit(1);
  }
}

main();
