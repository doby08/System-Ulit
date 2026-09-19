'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/providers";

/**
 * Root redirect controller.
 * Signed-in administrators land on the dashboard; everyone else on sign-in.
 * Rendered by the server component in `src/app/page.tsx` so that the page can
 * still export route metadata.
 */
export function HomeRedirect() {
  const { user, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/admin" : "/login");
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#05070F] text-slate-400 text-sm">
      Loading...
    </div>
  );
}
