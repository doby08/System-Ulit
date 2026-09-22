"use client";

import { Suspense } from "react";
import { useCachedSurvey, useOnlineStatus } from "@/lib/client/offline-survey";
import { SurveyForm } from "@/components/respondent/survey-form";
import { Skeleton } from "@/components/ui/skeleton";
import { WifiOff, RefreshCw, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";

function SurveyFormWrapper({ token }: { token: string }) {
  const { survey, loading, error, isCached, pendingCount, refresh, syncNow } = useCachedSurvey(token);
  const online = useOnlineStatus(() => {
    // When we come back online, try to sync pending responses
    if (pendingCount > 0) {
      syncNow();
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#05070F]">
        <div className="text-center">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full max-w-md" />
        </div>
      </div>
    );
  }

  if (error && !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#05070F]">
        <div className="max-w-md w-full rounded-2xl border border-rose-400/30 bg-rose-500/10 p-8 text-center space-y-3">
          <h1 className="text-lg font-bold text-white">Unable to load survey</h1>
          <p className="text-sm text-rose-200">{error}</p>
          {isCached ? (
            <p className="text-xs text-slate-500">Showing cached version from a previous visit.</p>
          ) : (
            <p className="text-xs text-slate-500">Please check your connection and try again.</p>
          )}
        </div>
      </div>
    );
  }

  if (!survey) return null;

  return (
    <div className="min-h-screen bg-[#05070F]">
      {/* Status bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-[#05070F]/95 backdrop-blur border-b border-white/5">
        <div className="flex items-center gap-2">
          {online ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <WifiOff className="w-3.5 h-3.5" style={{ opacity: 0.5 }} />
              Online
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-amber-400">
              <WifiOff className="w-3.5 h-3.5" />
              Offline — responses will sync when connected
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="text-xs text-slate-400">
              {pendingCount} pending {pendingCount === 1 ? "response" : "responses"}
            </span>
          )}
          {pendingCount > 0 && online && syncNow && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => syncNow()}
              className="text-slate-400 hover:text-white"
              title="Sync pending responses"
            >
              <Cloud className="w-3.5 h-3.5 mr-1" />
              Sync
            </Button>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={refresh} className="text-slate-400 hover:text-white">
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
        </Button>
      </div>
      <SurveyForm payload={survey} />
    </div>
  );
}

export default function RespondPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#05070F]">
        <div className="text-center">
          <Skeleton className="h-8 w-48 mb-4" />
          <p className="text-sm text-slate-400">Loading survey...</p>
        </div>
      </div>
    }>
      <SurveyPageAsync params={params} />
    </Suspense>
  );
}

function SurveyPageAsync({ params }: { params: Promise<{ token: string }> }) {
  // We need to read the token from params, but since this is client-side,
  // we'll use a different approach - pass token via URL search params or state
  // For now, we'll use window location
  const token = typeof window !== "undefined" ? window.location.pathname.split("/respond/")[1] || "" : "";

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#05070F]">
        <div className="max-w-md w-full rounded-2xl border border-rose-400/30 bg-rose-500/10 p-8 text-center space-y-3">
          <h1 className="text-lg font-bold text-white">Invalid survey link</h1>
          <p className="text-sm text-rose-200">The survey token could not be found.</p>
        </div>
      </div>
    );
  }

  return <SurveyFormWrapper token={token} />;
}