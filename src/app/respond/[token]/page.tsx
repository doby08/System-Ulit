"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useCachedSurvey, useOnlineStatus, getSyncStatus, manualSync, clearFailedConflicts, type SyncStatus } from "@/lib/client/offline-survey";
import { SurveyForm } from "@/components/respondent/survey-form";
import { Skeleton } from "@/components/ui/skeleton";
import { Wifi, WifiOff, RefreshCw, Cloud, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function SurveyFormWrapper({ token }: { token: string }) {
  const { survey, loading, error, isCached, pendingCount, refresh, syncNow } = useCachedSurvey(token);
  const pendingCountRef = useRef(pendingCount);
  useEffect(() => {
    pendingCountRef.current = pendingCount;
  }, [pendingCount]);
  const online = useOnlineStatus(useCallback(() => {
    // When we come back online, try to sync pending responses
    if (pendingCountRef.current > 0) {
      syncNow();
    }
  }, [syncNow]));

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    pending: 0, syncing: 0, failed: 0, conflicts: 0, lastSync: null
  });
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const hasActiveSyncWork = syncStatus.pending > 0 || syncStatus.syncing > 0;

  const updateStatus = useCallback(() => {
    getSyncStatus().then(setSyncStatus).catch(() => {});
  }, []);

  useEffect(() => {
    updateStatus();
  }, [updateStatus, online, pendingCount]);

  useEffect(() => {
    const refresh = () => updateStatus();
    if (typeof window !== "undefined") {
      window.addEventListener("offline-sync-status", refresh);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("offline-sync-status", refresh);
      }
    };
  }, [updateStatus]);

  useEffect(() => {
    if (!online || !hasActiveSyncWork) return;
    const interval = setInterval(updateStatus, 10000);
    return () => clearInterval(interval);
  }, [online, hasActiveSyncWork, updateStatus]);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      await manualSync();
      updateStatus();
    } finally {
      setIsManualSyncing(false);
    }
  };

  const handleClearFailed = async () => {
    await clearFailedConflicts();
    updateStatus();
  };

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
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 px-4 py-2 bg-[#05070F]/95 backdrop-blur border-b border-white/5">
        <div className="flex flex-wrap items-center gap-2">
          {online ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Wifi className="w-3.5 h-3.5" style={{ opacity: 0.5 }} />
              Online
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-amber-400">
              <WifiOff className="w-3.5 h-3.5" />
              Offline — responses will sync when connected
            </span>
          )}

          {/* Sync status indicators */}
          {syncStatus.syncing > 0 && online && (
            <span className="flex items-center gap-1.5 text-xs text-blue-400">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              Syncing {syncStatus.syncing}...
            </span>
          )}

          {syncStatus.failed > 0 && (
            <span className="flex items-center gap-1 text-xs text-rose-400" title="Failed to sync - tap to retry or clear">
              <AlertCircle className="w-3 h-3" />
              {syncStatus.failed} failed
            </span>
          )}

          {syncStatus.conflicts > 0 && (
            <span className="flex items-center gap-1 text-xs text-orange-400" title="Sync conflicts need attention">
              <AlertCircle className="w-3 h-3" />
              {syncStatus.conflicts} conflict{syncStatus.conflicts === 1 ? "" : "s"}
            </span>
          )}

          {syncStatus.lastSync && (
            <span className="text-xs text-slate-500" title="Last sync time">
              Last sync: {new Date(syncStatus.lastSync).toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          {pendingCount > 0 && (
            <span className="text-xs text-slate-400">
              {pendingCount} pending {pendingCount === 1 ? "response" : "responses"}
            </span>
          )}
          {pendingCount > 0 && online && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualSync}
              disabled={isManualSyncing || syncStatus.syncing > 0}
              className="text-slate-400 hover:text-white"
              title="Sync pending responses"
            >
              <Cloud className={`w-3.5 h-3.5 mr-1 ${isManualSyncing ? 'animate-spin' : ''}`} />
              Sync
            </Button>
          )}
          {(syncStatus.failed > 0 || syncStatus.conflicts > 0) && online && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFailed}
              className="text-rose-400 hover:text-rose-300"
              title="Clear failed/conflict records"
            >
              <Trash2 className="w-3.5 h-3.5" />
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
