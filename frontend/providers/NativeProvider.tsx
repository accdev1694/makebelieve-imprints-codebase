'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import {
  getPlatformInfo,
  isNativePlatform,
  PlatformInfo,
  usePushNotifications,
} from '@/lib/native';

interface NativeContextValue {
  /** Platform information */
  platform: PlatformInfo;
  /** Whether the app is running natively */
  isNative: boolean;
  /** Whether native features are ready to use */
  isReady: boolean;
  /** Push notification token (null if not registered) */
  pushToken: string | null;
  /** Whether push notifications are registered */
  isPushRegistered: boolean;
  /** Register for push notifications */
  registerPush: () => Promise<boolean>;
  /** Last received push notification */
  lastNotification: { title?: string; body?: string; data?: Record<string, unknown> } | null;
}

const NativeContext = createContext<NativeContextValue | null>(null);

/**
 * Hook to access native platform capabilities
 *
 * @example
 * ```tsx
 * const { isNative, platform, pushToken } = useNative();
 *
 * if (isNative && platform.isIOS) {
 *   // iOS-specific logic
 * }
 * ```
 */
export function useNative(): NativeContextValue {
  const context = useContext(NativeContext);
  if (!context) {
    throw new Error('useNative must be used within a NativeProvider');
  }
  return context;
}

interface NativeProviderProps {
  children: ReactNode;
}

/**
 * Native Provider Component
 *
 * Initializes Capacitor plugins and provides native capabilities context.
 * Should be placed near the root of the app, inside QueryProvider and AuthProvider.
 */
export function NativeProvider({ children }: NativeProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [platform] = useState(() => getPlatformInfo());
  const isNative = platform.isNative;

  // Push notifications hook
  const {
    isRegistered: isPushRegistered,
    token: pushToken,
    register: registerPush,
    lastNotification,
  } = usePushNotifications();

  // Initialize native plugins on mount
  useEffect(() => {
    async function initializeNative() {
      if (!isNativePlatform()) {
        // Web platform - mark as ready immediately
        setIsReady(true);
        return;
      }

      try {
        // Configure status bar
        await StatusBar.setStyle({ style: Style.Light });

        if (platform.isAndroid) {
          // Set status bar background color on Android
          await StatusBar.setBackgroundColor({ color: '#ffffff' });
        }

        // Hide splash screen after a short delay to ensure app is rendered
        setTimeout(async () => {
          try {
            await SplashScreen.hide({
              fadeOutDuration: 300,
            });
          } catch (e) {
            console.warn('Failed to hide splash screen:', e);
          }
        }, 500);

        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize native plugins:', error);
        // Still mark as ready so app can function
        setIsReady(true);
      }
    }

    initializeNative();
  }, [platform.isAndroid]);

  // Auto-register for push notifications on native platforms
  useEffect(() => {
    if (isReady && isNative && !isPushRegistered) {
      // Delay push registration to not interrupt initial app load
      const timer = setTimeout(() => {
        registerPush().then((success) => {
          if (success) {
            console.log('Push notifications registered successfully');
          }
        });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isReady, isNative, isPushRegistered, registerPush]);

  const value: NativeContextValue = {
    platform,
    isNative,
    isReady,
    pushToken,
    isPushRegistered,
    registerPush,
    lastNotification,
  };

  return (
    <NativeContext.Provider value={value}>
      {children}
    </NativeContext.Provider>
  );
}

export default NativeProvider;
