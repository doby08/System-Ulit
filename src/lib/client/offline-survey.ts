"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import type { AnswerPayload, PublicQuestion, PublicSurveyPayload, ResponseSubmitPayload, SubmitResult, SessionPayload, RespondentPayload } from "@/lib/types";
import { submitPublicResponse } from "@/lib/client/hooks";
import {
  cacheSurvey,
  getCachedSurvey,
  queuePending,
  updatePendingStatus,
  getPendingByStatus,
  deletePending,
  getDeviceId,
} from "@/lib/client/idb";

/* Simple hash for client-side deduplication (matches server hash format) */

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

function buildContentHash(payload: ResponseSubmitPayload): string {
  const canonical = JSON.stringify({
    token: payload.token,
    answers: [...payload.answers]
      .sort((a, b) =>
        `${a.questionId}${a.parentQuestionId ?? ""}`.localeCompare(
          `${b.questionId}${b.parentQuestionId ?? ""}`,
        ),
      )
      .map((answer) => ({
        q: answer.questionId,
        t: answer.valueText ?? null,
        n: answer.valueNumber ?? null,
        o: answer.valueOption ?? null,
        os: (answer.valueOptions ?? []).slice().sort(),
        b: answer.valueBool ?? null,
        f: answer.isFollowUp ?? false,
        p: answer.parentQuestionId ?? null,
      })),
    respondent: payload.respondent ?? null,
    session: payload.session?.sessionCode ?? null,
  });
  return simpleHash(canonical);
}

/* Network status */

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => {
      setOnline(true);
      syncPendingOnReconnect();
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  return online;
}

/* Cached survey loader */

export interface CachedResult {
  survey: PublicSurveyPayload | null;
  loading: boolean;
  error: string | null;
  isCached: boolean;
  refresh: () => Promise<void>;
  pendingCount: number;
}

export function useCachedSurvey(token: string, enabled = true): CachedResult {
  const [survey, setSurvey] = useState<PublicSurveyPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const rows = await getPendingByStatus("PENDING");
      if (alive) setPendingCount(rows.length);
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled || !token) return;
    setLoading(true);
    setError(null);
    try {
      const cached = await getCachedSurvey(token);
      setIsCached(!!cached);
      if (!cached) {
        const res = await fetch(`/api/public/survey/${encodeURIComponent(token)}`);
        if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
        const payload: PublicSurveyPayload = await res.json();
        await cacheSurvey(payload);
        if (mounted.current) { setSurvey(payload); setIsCached(true); }
        return;
      }
      if (mounted.current) setSurvey(cached);
    } catch (e) {
      const fail = await getCachedSurvey(token);
      if (fail && mounted.current) { setSurvey(fail); setIsCached(true); setError(null); }
      else if (mounted.current) setError(e instanceof Error ? e.message : "Failed to load survey");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [token, enabled]);

  useEffect(() => {
    refresh();
    return () => { mounted.current = false; };
  }, [refresh]);

  return { survey, loading, error, isCached, refresh, pendingCount };
}

/* Build payload helper */

function buildPayload(
  token: string,
  clientId: string,
  answers: AnswerPayload[],
  respondent: RespondentPayload | null,
  session: SessionPayload | null,
  language: string,
): ResponseSubmitPayload {
  const payload: ResponseSubmitPayload = {
    clientResponseId: clientId,
    token,
    language,
    status: "COMPLETE",
    answers,
    respondent: respondent ?? null,
    session: session ?? null,
  };
  payload.contentHash = buildContentHash(payload);
  return payload;
}

/* Submit result type */

/* Offline submit hook */

export function useOfflineSubmit(
  token: string,
  survey: PublicSurveyPayload | null,
  setP?: React.Dispatch<React.SetStateAction<number>>,
): OffSubmitResult {
  const [isSt, setIsSt] = useState(false);
  const [lastR, setLastR] = useState<SubmitResult | null>(null);
  const m = useRef(true);

  const submit = useCallback(
    async (answersMap: Record<string, AnswerPayload>, respondent: Record<string, unknown>, session: SessionPayload | null): Promise<SubmitResult> => {
      if (!survey) return { clientResponseId: "", serverResponseId: "", status: "CONFLICT", answersSaved: 0, message: "No survey" } as SubmitResult;
      setIsSt(true);
      setLastR(null);
      const cid = uuid();
      const did = await getDeviceId();
      const ca: AnswerPayload[] = Object.values(answersMap).map((x) => ({
        questionId: x.questionId, valueText: x.valueText, valueNumber: x.valueNumber,
        valueOption: x.valueOption, valueOptions: x.valueOptions ?? undefined,
        valueBool: x.valueBool, isFollowUp: x.isFollowUp ?? false, parentQuestionId: x.parentQuestionId ?? undefined,
      }));
      const pl = buildPayload(token, cid, ca, respondent, session, survey.language);
      await queuePending({
        id: cid, token, surveyId: survey.surveyId, versionId: survey.versionId, version: survey.version,
        surveyTitle: survey.title, topic: survey.topic,
        questionIds: survey.questions.map((q: PublicQuestion) => q.id),
        questions: survey.questions as any, answers: ca as any,
        respondent: respondent ?? null, session, language: survey.language,
        deviceId: did, device: typeof navigator !== "undefined" ? (navigator.userAgent ?? "unknown") : "unknown",
        networkState: typeof navigator !== "undefined" && !navigator.onLine ? "OFFLINE" : "ONLINE",
        capturedAt: new Date().toISOString(), submittedAt: new Date().toISOString(),
        status: "PENDING" as const, attempts: 0, lastError: null,
        syncedAt: null, serverResponseId: null, revision: 1, conflictNote: null,
      });

      const trySync = async (): Promise<SubmitResult> => {
        try {
          await updatePendingStatus(cid, "SYNCING");
          const res = await submitPublicResponse(pl);
          if (res.status === "CREATED" || res.status === "UPDATED") {
            await updatePendingStatus(cid, "SYNCED", { syncedAt: new Date().toISOString(), serverResponseId: res.serverResponseId });
            await deletePending(cid);
            setP?.(n => Math.max(0, n - 1));
            return { ...res, message: "Submitted and synced." } as SubmitResult;
          }
          if (res.status === "DUPLICATE") {
            await updatePendingStatus(cid, "SYNCED", { syncedAt: new Date().toISOString(), serverResponseId: res.serverResponseId, conflictNote: "Duplicate" });
            await deletePending(cid);
            setLastR(res);
            return res;
          }
          await updatePendingStatus(cid, "CONFLICT", { lastError: res.message });
          setLastR(res);
          return res;
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Sync failed";
          await updatePendingStatus(cid, "FAILED", { lastError: msg, attempts: 1 });
          return { clientResponseId: cid, serverResponseId: "", status: "FAILED", answersSaved: 0, message: msg } as SubmitResult;
        }
      };
      if (typeof window !== "undefined" && window.navigator.onLine) {
        const res = await trySync();
        if (m.current) setIsSt(false);
        return res;
      }
      const offRes: SubmitResult = {
        clientResponseId: cid, serverResponseId: "", status: "PENDING",
        answersSaved: ca.filter((x) => x.valueText || typeof x.valueNumber === "number" || x.valueOption || (x.valueOptions?.length ?? 0) > 0 || typeof x.valueBool === "boolean").length,
        message: "Saved offline — will sync automatically when internet is available.",
      };
      setLastR(offRes);
      if (m.current) setIsSt(false);
      return offRes;
    },
    [token, survey, setP],
  );

  const syncNow = useCallback(async () => {
    const pend = await getPendingByStatus("PENDING");
    for (const r of pend) {
      try {
        await updatePendingStatus(r.id, "SYNCING");
        const aa = (r.answers as AnswerPayload[]) || [];
        const pl = buildPayload(r.token, r.id, aa, r.respondent, r.session, r.language);
        const res = await submitPublicResponse(pl);
        if (res.status === "CREATED" || res.status === "UPDATED") {
          await updatePendingStatus(r.id, "SYNCED", { syncedAt: new Date().toISOString(), serverResponseId: res.serverResponseId });
          await deletePending(r.id);
          setP?.(n => Math.max(0, n - 1));
        } else if (res.status === "DUPLICATE") {
          await updatePendingStatus(r.id, "SYNCED", { syncedAt: new Date().toISOString(), serverResponseId: res.serverResponseId, conflictNote: "Duplicate" });
          await deletePending(r.id);
          setP?.(n => Math.max(0, n - 1));
        } else {
          await updatePendingStatus(r.id, "CONFLICT", { lastError: res.message });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Sync failed";
        await updatePendingStatus(r.id, "FAILED", { lastError: msg, attempts: (r.attempts || 0) + 1 });
      }
    }
  }, [setP]);

  const clearAllPending = useCallback(async () => {
    const pend = await getPendingByStatus("PENDING");
    for (const r of pend) await deletePending(r.id);
    setP?.(0);
  }, [setP]);

  return { submit, isSubmitting: isSt, lastResult: lastR, syncNow, clearAllPending };
}

/* Background sync */

let syncQ = false;
export function syncPendingOnReconnect(): void {
  if (syncQ) return;
  syncQ = true;
  Promise.resolve().then(async () => {
    syncQ = false;
    const pend = await getPendingByStatus("PENDING");
    if (!pend.length) return;
    for (const r of pend.slice(0, 50)) {
      try {
        await updatePendingStatus(r.id, "SYNCING");
        const aa = (r.answers as AnswerPayload[]) || [];
        const pl = buildPayload(r.token, r.id, aa, r.respondent, r.session, r.language);
        const res = await submitPublicResponse(pl);
        if (res.status === "CREATED" || res.status === "UPDATED" || res.status === "DUPLICATE") {
          await updatePendingStatus(r.id, "SYNCED", { syncedAt: new Date().toISOString(), serverResponseId: res.serverResponseId });
          await deletePending(r.id);
        } else {
          await updatePendingStatus(r.id, "CONFLICT", { lastError: res.message });
        }
      } catch (e) {
        await updatePendingStatus(r.id, "FAILED", { lastError: e instanceof Error ? e.message : "Sync failed", attempts: (r.attempts || 0) + 1 });
      }
    }
  });
}

export interface OffSubmitResult {
  submit: (answers: Record<string, AnswerPayload>, respondent: Record<string, unknown>, session: SessionPayload | null) => Promise<SubmitResult>;
  isSubmitting: boolean;
  lastResult: SubmitResult | null;
  syncNow: () => Promise<void>;
  clearAllPending: () => Promise<void>;
}