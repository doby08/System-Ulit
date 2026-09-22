const fs = require('fs');
const path = 'c:/Users/Ivy Banua/OneDrive/Desktop/kuya poy/System Ulit/src/lib/client/offline-survey.ts';
const lines = fs.readFileSync(path, 'utf8').split('\n');

// Fix 1: Replace useOnlineStatus (lines 67-85, 0-indexed: 66-84)
// Add mount-time sync and optional onReconnect callback
const newUseOnlineStatus = [
  'export function useOnlineStatus(onReconnect?: () => void): boolean {',
  '  const [online, setOnline] = useState(true);',
  '  useEffect(() => {',
  '    if (typeof window === "undefined") return;',
  '    const handleOnline = () => {',
  '      setOnline(true);',
  '      syncPendingOnReconnect();',
  '      onReconnect?.();',
  '    };',
  '    const handleOffline = () => setOnline(false);',
  '    window.addEventListener("online", handleOnline);',
  '    window.addEventListener("offline", handleOffline);',
  '    setOnline(navigator.onLine);',
  '    // If we\'re already online when the component mounts, trigger sync too',
  '    if (navigator.onLine) {',
  '      syncPendingOnReconnect();',
  '      onReconnect?.();',
  '    }',
  '    return () => {',
  '      window.removeEventListener("online", handleOnline);',
  '      window.removeEventListener("offline", handleOffline);',
  '    };',
  '  }, [onReconnect]);',
  '  return online;',
  '}',
];

// Replace lines 67-85 (0-indexed: 66 to 84)
for (let i = 0; i < newUseOnlineStatus.length; i++) {
  lines[66 + i] = newUseOnlineStatus[i];
}

// Fix 2: Replace syncPendingOnReconnect section (lines 303-330, 0-indexed: 302-329)
const newSyncPending = [
  '/* Background sync */',
  '',
  'let syncQ = false;',
  'let syncTimer: ReturnType<typeof setInterval> | null = null;',
  '',
  'function isOnline(): boolean {',
  '  if (typeof window === "undefined") return true;',
  '  return navigator.onLine;',
  '}',
  '',
  'export function syncPendingOnReconnect(): void {',
  '  if (syncQ) return;',
  '  if (!isOnline()) return;',
  '  syncQ = true;',
  '  syncInternal().finally(() => {',
  '    syncQ = false;',
  '    maintainSyncRetry();',
  '  });',
  '}',
  '',
  'async function syncInternal(): Promise<void> {',
  '  const pend = await getPendingByStatus("PENDING");',
  '  if (!pend.length) {',
  '    stopSyncRetry();',
  '    return;',
  '  }',
  '  for (const r of pend.slice(0, 50)) {',
  '    try {',
  '      await updatePendingStatus(r.id, "SYNCING");',
  '      const aa = (r.answers as AnswerPayload[]) || [];',
  '      const pl = buildPayload(r.token, r.id, aa, r.respondent, r.session, r.language);',
  '      const res = await submitPublicResponse(pl);',
  '      if (res.status === "CREATED" || res.status === "UPDATED" || res.status === "DUPLICATE") {',
  '        await updatePendingStatus(r.id, "SYNCED", { syncedAt: new Date().toISOString(), serverResponseId: res.serverResponseId });',
  '        await deletePending(r.id);',
  '      } else {',
  '        await updatePendingStatus(r.id, "CONFLICT", { lastError: res.message });',
  '      }',
  '    } catch (e) {',
  '      await updatePendingStatus(r.id, "FAILED", { lastError: e instanceof Error ? e.message : "Sync failed", attempts: (r.attempts || 0) + 1 });',
  '    }',
  '  }',
  '}',
  '',
  'function maintainSyncRetry(): void {',
  '  if (syncTimer) return;',
  '  if (!isOnline()) return;',
  '  // Check every 15 seconds if there are pending records to sync',
  '  syncTimer = setInterval(() => {',
  '    if (!isOnline()) {',
  '      stopSyncRetry();',
  '      return;',
  '    }',
  '    getPendingByStatus("PENDING").then((pend) => {',
  '      if (pend.length === 0) {',
  '        stopSyncRetry();',
  '      } else if (!syncQ) {',
  '        syncPendingOnReconnect();',
  '      }',
  '    }).catch(() => {});',
  '  }, 15000);',
  '}',
  '',
  'function stopSyncRetry(): void {',
  '  if (syncTimer) {',
  '    clearInterval(syncTimer);',
  '    syncTimer = null;',
  '  }',
  '}',
  '',
  '// Also trigger sync on visibility change (user returns to tab) and focus',
  'if (typeof window !== "undefined") {',
  '  window.addEventListener("visibilitychange", () => {',
  '    if (!document.hidden && isOnline()) {',
  '      getPendingByStatus("PENDING").then((pend) => {',
  '        if (pend.length > 0) syncPendingOnReconnect();',
  '      }).catch(() => {});',
  '    }',
  '  });',
  '  window.addEventListener("focus", () => {',
  '    if (isOnline()) {',
  '      getPendingByStatus("PENDING").then((pend) => {',
  '        if (pend.length > 0) syncPendingOnReconnect();',
  '      }).catch(() => {});',
  '    }',
  '  });',
  '}',
];

// Replace lines 303-330 (0-indexed: 302 to 329)
for (let i = 0; i < newSyncPending.length; i++) {
  lines[302 + i] = newSyncPending[i];
}

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('Fix applied successfully!');
console.log('useOnlineStatus updated at lines 67-85');
console.log('syncPendingOnReconnect updated at lines 303-' + (302 + newSyncPending.length));
