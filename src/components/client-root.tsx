'use client';

import type { ReactNode } from "react";
import { useEffect } from "react";
import { Providers } from "@/components/providers";

// Global error handlers for uncaught errors
function handleGlobalError(event: ErrorEvent) {
  console.error("[Global Error Handler] Uncaught error:", event.error);
  
  if (event.error instanceof Error) {
    console.error("Stack trace:", event.error.stack);
  }
  
  event.preventDefault();
}

function handleUnhandledRejection(event: PromiseRejectionEvent) {
  console.error("[Global Error Handler] Unhandled promise rejection:", event.reason);
  event.preventDefault();
}

function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  if (process.env.NODE_ENV === 'development') {
    return;
  }
  navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((registration) => {
      console.log('[SW] Registered successfully:', registration.scope);
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] New version available');
            }
          });
        }
      });
    })
    .catch((error) => {
      console.error('[SW] Registration failed:', error);
    });

  // Listen for messages from the service worker (e.g. TRIGGER_SYNC from background sync)
  navigator.serviceWorker.addEventListener('message', (event) => {
    const { type } = event.data || {};
    if (type === 'TRIGGER_SYNC') {
      console.log('[SW] Received TRIGGER_SYNC from background sync');
      // Dispatch a synthetic event that offline-survey.ts listens for
      window.dispatchEvent(new CustomEvent('offline-sync-needed'));
    }
  });
}

export function ClientRoot({ children }: { children: ReactNode }) {
  useEffect(() => {
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    registerServiceWorker();
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  return <Providers>{children}</Providers>;
}
