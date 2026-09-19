'use client';

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
