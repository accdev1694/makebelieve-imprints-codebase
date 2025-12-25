/**
 * Push Notifications Hook
 *
 * Provides push notification functionality for order status updates.
 * Only active on native platforms (iOS/Android).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { isNativePlatform, isPluginAvailable, getCurrentPlatform } from './platform';

export interface PushNotificationData {
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

export interface UsePushNotificationsResult {
  isRegistered: boolean;
  token: string | null;
  lastNotification: PushNotificationData | null;
  error: string | null;
  register: () => Promise<boolean>;
  isAvailable: boolean;
}

/**
 * Hook for push notifications
 *
 * @example
 * ```tsx
 * const { isRegistered, token, register, lastNotification } = usePushNotifications();
 *
 * useEffect(() => {
 *   if (!isRegistered) {
 *     register();
 *   }
 * }, [isRegistered, register]);
 *
 * // Send token to your backend
 * useEffect(() => {
 *   if (token) {
 *     api.registerDeviceToken(token);
 *   }
 * }, [token]);
 * ```
 */
export function usePushNotifications(): UsePushNotificationsResult {
  const [isRegistered, setIsRegistered] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [lastNotification, setLastNotification] = useState<PushNotificationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAvailable = isNativePlatform() && isPluginAvailable('PushNotifications');

  // Set up listeners when component mounts
  useEffect(() => {
    if (!isAvailable) return;

    // Listen for registration success
    const registrationListener = PushNotifications.addListener('registration', (tokenData: Token) => {
      console.log('Push registration success, token:', tokenData.value);
      setToken(tokenData.value);
      setIsRegistered(true);
    });

    // Listen for registration errors
    const errorListener = PushNotifications.addListener('registrationError', (err) => {
      console.error('Push registration error:', err.error);
      setError(err.error);
    });

    // Listen for push notifications received while app is in foreground
    const notificationListener = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Push notification received:', notification);
        setLastNotification({
          title: notification.title,
          body: notification.body,
          data: notification.data,
        });
      }
    );

    // Listen for push notification actions (user tapped notification)
    const actionListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log('Push notification action performed:', action);
        setLastNotification({
          title: action.notification.title,
          body: action.notification.body,
          data: action.notification.data,
        });

        // Handle navigation based on notification data
        const data = action.notification.data;
        if (data?.orderId) {
          // Navigate to order details
          window.location.href = `/orders/${data.orderId}`;
        }
      }
    );

    // Cleanup listeners on unmount
    return () => {
      registrationListener.then(l => l.remove());
      errorListener.then(l => l.remove());
      notificationListener.then(l => l.remove());
      actionListener.then(l => l.remove());
    };
  }, [isAvailable]);

  const register = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) {
      console.log('Push notifications not available on this platform');
      return false;
    }

    try {
      // Check current permission status
      const permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        // Request permission
        const newStatus = await PushNotifications.requestPermissions();
        if (newStatus.receive !== 'granted') {
          setError('Push notification permission denied');
          return false;
        }
      } else if (permStatus.receive !== 'granted') {
        setError('Push notification permission denied. Please enable in settings.');
        return false;
      }

      // Register with Apple/Google to get push token
      await PushNotifications.register();

      // iOS-specific: Create notification channel for Android-style behavior
      const platform = getCurrentPlatform();
      if (platform === 'android') {
        await PushNotifications.createChannel({
          id: 'order-updates',
          name: 'Order Updates',
          description: 'Notifications about your order status',
          importance: 4, // High importance
          visibility: 1, // Public
          sound: 'default',
          vibration: true,
        });
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to register for push notifications';
      setError(message);
      return false;
    }
  }, [isAvailable]);

  return {
    isRegistered,
    token,
    lastNotification,
    error,
    register,
    isAvailable,
  };
}

export default usePushNotifications;
