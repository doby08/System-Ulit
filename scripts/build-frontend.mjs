#!/usr/bin/env node
/**
 * Generates all frontend (React/Next.js) files for the AI Interview & Survey System.
 * Run: node scripts/build-frontend.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const write = (p, content) => {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content, "utf8");
};

/* ════════════════════════════════════════════════════════════════════════════
   PWA: manifest.webmanifest + sw.js
   ════════════════════════════════════════════════════════════════════════════ */
write("public/manifest.webmanifest", JSON.stringify({
  name: "InterviewAI",
  short_name: "InterviewAI",
  description: "AI-powered Interview & Survey System — Offline PWA",
  display: "standalone",
  background_color: "#05070F",
  theme_color: "#3B6BF6",
  orientation: "portrait-primary",
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
  ],
}, null, 2));

write("public/sw.js", `self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(self.clients.claim()); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
`);

/* ════════════════════════════════════════════════════════════════════════════
   Root layout.tsx — fonts + providers wrapper
   ════════════════════════════════════════════════════════════════════════════ */
write("src/app/layout.tsx", `'use client';

import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: {
    default: "InterviewAI - AI Interview & Survey System",
    template: "%s - InterviewAI",
  },
  description: "Centralized AI-powered Interview Assistance and Survey Instrument System.",
  manifest: "/manifest.webmanifest",
  appleWebAppCapable: true,
  appleWebAppStatusBarStyle: "black-translucent",
  appleWebAppTitle: "InterviewAI",
};

const fontSans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const fontDisplay = Inter_Tight({ subsets: ["latin"], variable: "--font-display", display: "swap", weight: ["600","700","800","900"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={cn("min-h-screen bg-[rgb(var(--bg-base))] antialiased text-[var(--text-primary)] flex flex-col", fontSans.variable, fontDisplay.variable)}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
`);

/* ════════════════════════════════════════════════════════════════════════════
   Context providers
   ════════════════════════════════════════════════════════════════════════════ */
write("src/components/providers.tsx", `'use client';

import { ReactNode, createContext, useContext } from "react";
import { useAuth } from "@/lib/client/hooks";
import { Toaster } from "@/components/ui/toast";
import { NetworkProvider } from "@/components/ui/network-status";
import type { SessionUser } from "@/lib/types";

const AuthContext = createContext<{
  user: SessionUser | null;
  loading: boolean;
  refetch: () => Promise<void>;
} | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, loading, refetch } = useAuth();
  return (
    <AuthContext.Provider value={{ user, loading, refetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
};

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <NetworkProvider>
        <Toaster />
        {children}
      </NetworkProvider>
    </AuthProvider>
  );
}
`);

/* ════════════════════════════════════════════════════════════════════════════
   Auth Guard
   ════════════════════════════════════════════════════════════════════════════ */
write("src/components/auth-guard.tsx", `'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/providers";
import { Skeleton } from "@/components/ui/skeleton";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return fallback ?? (
      <div className="flex items-center justify-center min-h-screen bg-[rgb(var(--bg-base))]">
        <div className="space-y-4 w-full max-w-2xl">
          <Skeleton className="h-12 w-48 mx-auto" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}
`);

console.log("[build-frontend] PWA, layout, providers, auth-guard written");
