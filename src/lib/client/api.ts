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
    try {
      const res = await fetch(`${this.base}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers ?? {}),
        },
        credentials: "include",
        // Add timeout to prevent hanging requests
        signal: init?.signal,
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
    } catch (error) {
      // Handle network errors gracefully
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw {
          status: 0,
          message: "Network error: unable to connect to server",
          code: "NETWORK_ERROR",
          retryable: true,
        };
      }
      throw error;
    }
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
  if (typeof e === "object" && e !== null) {
    try {
      return JSON.stringify(e);
    } catch {
      return "Something went wrong";
    }
  }
  return "Something went wrong";
}

// Helper to check if error is retryable
export function isRetryableError(e: unknown): boolean {
  if (isApiError(e)) return e.retryable === true;
  if (e instanceof TypeError) return true; // Network errors are usually retryable
  return false;
}
