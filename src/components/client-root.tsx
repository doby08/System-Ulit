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

export function ClientRoot({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Add global error handlers
    window.addEventListener("error", handleGlobalError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    
    return () => {
      window.removeEventListener("error", handleGlobalError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return <Providers>{children}</Providers>;
}
