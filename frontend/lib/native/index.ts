/**
 * Native Capacitor Hooks and Utilities
 *
 * This module provides React hooks and utilities for native mobile features.
 * All hooks gracefully handle web platforms by providing fallbacks or no-ops.
 */

// Platform detection utilities
export {
  getPlatformInfo,
  isNativePlatform,
  isPluginAvailable,
  getCurrentPlatform,
  type PlatformInfo,
} from './platform';

// Camera hook for design photo uploads
export {
  useCamera,
  type CameraPhoto,
  type UseCameraResult,
} from './useCamera';

// Push notifications hook for order status updates
export {
  usePushNotifications,
  type PushNotificationData,
  type UsePushNotificationsResult,
} from './usePushNotifications';

// Filesystem hook for local design caching
export {
  useFilesystem,
  type FileInfo,
  type UseFilesystemResult,
} from './useFilesystem';
