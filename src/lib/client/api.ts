/**
 * Client-side API wrapper.
 * All requests go to the SAME backend that serves the admin dashboard.
 * Response envelope: { ok: true, data: T } | { ok: false, error, code, ... }
 */
import type { ApiErrorBody } from "@/lib/types";

export class ApiClient {
  private base: string;

  constructor(base = "") {
    this.base = base;
  }

  async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      credentials: "include",
    });

    const json: unknown = await res.json().catch(() => null);

    if (!res.ok || (json && typeof json === "object" && (json as { ok?: boolean }).ok === false)) {
      const body = (json as ApiErrorBody) ?? {};
      throw {
        status: res.status,
        message: body.error ?? "Something went wrong",
        code: body.code,
        details: body.details,
        retryable: body.retryable,
      };
    }

    const okData = json as { ok?: boolean; data?: T };
    return okData.data as T;
  }

  get<T>(path: string, init?: RequestInit) {
    return this.request<T>(path, { ...init, method: "GET" });
  }

  post<T>(path: string, body?: unknown, init?: RequestInit) {
    return this.request<T>(path, {
      ...init,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(path: string, body?: unknown, init?: RequestInit) {
    return this.request<T>(path, {
      ...init,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

              delete<T>(path: string, init?: RequestInit) {
    return this.request<T>(path, { ...init, method: "DELETE" });
  }

  put<T>(path: string, body?: unknown, init?: RequestInit) {
    return this.request<T>(path, {
      ...init,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

}

export const api = new ApiClient();

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return api.request<T>(path, init);
}

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  details?: unknown;
  retryable?: boolean;
}

export function isApiError(e: unknown): e is ApiError {
  return e !== null && typeof e === "object" && "status" in e && "message" in e;
}

export function getErrorMessage(e: unknown): string {
  if (isApiError(e)) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}
