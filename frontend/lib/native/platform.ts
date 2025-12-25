/**
 * Platform Detection Utilities
 *
 * Detects whether the app is running in a native Capacitor environment
 * and provides platform-specific information.
 */

import { Capacitor } from '@capacitor/core';

export interface PlatformInfo {
  isNative: boolean;
  isWeb: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  platform: 'ios' | 'android' | 'web';
}

/**
 * Get current platform information
 */
export function getPlatformInfo(): PlatformInfo {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';

  return {
    isNative,
    isWeb: !isNative,
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    platform,
  };
}

/**
 * Check if running in a native Capacitor app
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Check if a specific plugin is available
 */
export function isPluginAvailable(pluginName: string): boolean {
  return Capacitor.isPluginAvailable(pluginName);
}

/**
 * Get the current platform ('ios', 'android', or 'web')
 */
export function getCurrentPlatform(): 'ios' | 'android' | 'web' {
  return Capacitor.getPlatform() as 'ios' | 'android' | 'web';
}
