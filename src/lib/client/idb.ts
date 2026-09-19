/**
 * IndexedDB wrapper for PWA offline survey responses.
 * Uses the `idb` library. Stores pending responses that auto-sync when online.
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { OfflineQueueRecord, PublicSurveyPayload } from "@/lib/types";

export interface OfflineDB extends DBSchema {
  surveys: {
    key: string; // token
    value: PublicSurveyPayload;
  };
  pending: {
    key: string; // clientResponseId
    value: OfflineQueueRecord;
    indexes: { status: string; token: string; submittedAt: string };
  };
  settings: {
    key: string;
    value: { deviceId: string; lastSync: string | null };
  };
}

let dbPromise: Promise<IDBPDatabase<OfflineDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<OfflineDB>> {
  if (!dbPromise) {
    dbPromise = openDB<OfflineDB>("aiis-offline", 1, {
      upgrade(db) {
        const surveys = db.createObjectStore("surveys");
        const pending = db.createObjectStore("pending");
        pending.createIndex("status", "status");
        pending.createIndex("token", "token");
        pending.createIndex("submittedAt", "submittedAt");
        db.createObjectStore("settings");
      },
    });
  }
  return dbPromise;
}

export async function cacheSurvey(payload: PublicSurveyPayload): Promise<void> {
  const db = await getDb();
  await db.put("surveys", payload, payload.token);
}

export async function getCachedSurvey(token: string): Promise<PublicSurveyPayload | undefined> {
  const db = await getDb();
  return db.get("surveys", token);
}

export async function getAllCachedSurveys(): Promise<PublicSurveyPayload[]> {
  const db = await getDb();
  return db.getAll("surveys");
}

export async function queuePending(record: OfflineQueueRecord): Promise<void> {
  const db = await getDb();
  await db.put("pending", record, record.id);
}

export async function updatePendingStatus(
  id: string,
  status: OfflineQueueRecord["status"],
  patch: Partial<OfflineQueueRecord> = {},
): Promise<void> {
  const db = await getDb();
  const record = await db.get("pending", id);
  if (!record) return;
  await db.put("pending", { ...record, status, ...patch }, id);
}

export async function getPendingByStatus(status: OfflineQueueRecord["status"]): Promise<OfflineQueueRecord[]> {
  const db = await getDb();
  return db.getAllFromIndex("pending", "status", status);
}

export async function deletePending(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("pending", id);
}

export async function countPending(): Promise<number> {
  const db = await getDb();
  return db.count("pending");
}

export async function getDeviceId(): Promise<string> {
  const db = await getDb();
  const settings = await db.get("settings", "device");
  if (settings?.deviceId) return settings.deviceId;
  const deviceId = `dev_${crypto.randomUUID().slice(0, 12)}`;
  await db.put("settings", { deviceId, lastSync: null }, "device");
  return deviceId;
}

export async function setLastSync(ts: string): Promise<void> {
  const db = await getDb();
  const deviceId = await getDeviceId();
  await db.put("settings", { deviceId, lastSync: ts }, "device");
}
