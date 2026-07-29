'use client';

/**
 * AppKeyGate — client-side auth wrapper.
 * Checks sessionStorage for the app access key on mount.
 * Redirects to /login if the key is absent.
 * This is the (app) route guard per the SDD auth boundary spec.
 */

import { useEffect, useState } from 'react';

const APP_KEY_STORAGE = 'app_access_key';

interface AppKeyGateProps {
  children: React.ReactNode;
}

export function AppKeyGate({ children }: AppKeyGateProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem(APP_KEY_STORAGE)) {
      window.location.href = '/login';
      return;
    }
    setIsReady(true);
  }, []);

  return isReady ? <>{children}</> : null;
}

/**
 * Read the app access key from sessionStorage.
 * Returns null if not present.
 */
export function getAppAccessKey(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(APP_KEY_STORAGE);
}

/**
 * Store the app access key in sessionStorage.
 */
export function setAppAccessKey(key: string): void {
  sessionStorage.setItem(APP_KEY_STORAGE, key);
}

/**
 * Clear the app access key from sessionStorage (logout).
 */
export function clearAppAccessKey(): void {
  sessionStorage.removeItem(APP_KEY_STORAGE);
}
