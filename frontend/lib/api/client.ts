import "server-only";
import { cookies } from "next/headers";

const API_URL = process.env.API_URL || "http://localhost:3001";

const ACCESS_TOKEN_COOKIE = "access_token";
const REFRESH_TOKEN_COOKIE = "refresh_token";

// ─── Types ───────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Typed error helpers ────────────────────────────────────

export interface CreditBlockDetail {
  reason: "over_credit_limit" | "overdue_balance" | "policy_blocked";
  limit?: number;
  balance?: number;
  available?: number;
  overdueDays?: number;
  overdueAmount?: number;
  policy?: string;
}

export function isCreditBlockError(
  err: unknown
): err is ApiError & { details: CreditBlockDetail } {
  return err instanceof ApiError && err.code === "CREDIT_BLOCK";
}

export interface CaeRejectedDetail {
  provider: string;
  reason?: string;
  rawResponse?: unknown;
}

export function isCaeRejectedError(
  err: unknown
): err is ApiError & { details: CaeRejectedDetail } {
  return err instanceof ApiError && err.code === "CAE_REJECTED";
}

// ─── Cookie helpers ──────────────────────────────────────────

export async function getAccessToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function getRefreshToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(REFRESH_TOKEN_COOKIE)?.value;
}

export async function setAuthCookies(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  const store = await cookies();
  const secure = process.env.NODE_ENV === "production";

  store.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1h — access token
  });

  store.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7d — refresh token
  });
}

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_TOKEN_COOKIE);
  store.delete(REFRESH_TOKEN_COOKIE);
}

// ─── Core fetch ──────────────────────────────────────────────

interface FetchOptions {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | undefined>;
  skipAuth?: boolean;
}

async function tryRefresh(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return null;

    const json = (await res.json()) as ApiResponse<{
      accessToken: string;
      refreshToken: string;
    }>;

    await setAuthCookies(json.data.accessToken, json.data.refreshToken);
    return json.data.accessToken;
  } catch {
    return null;
  }
}

export async function fetchApi<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { method = "GET", body, params, skipAuth = false } = options;

  // Build URL with query params
  let url = `${API_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) searchParams.set(key, String(value));
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (!skipAuth) {
    const token = await getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let res = await fetch(url, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });

  // Try refresh on 401, redirect to login if unrecoverable
  if (res.status === 401 && !skipAuth) {
    const newToken = await tryRefresh();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(url, {
        method,
        headers,
        ...(body ? { body: JSON.stringify(body) } : {}),
        cache: "no-store",
      });
    } else {
      await clearAuthCookies();
      const { redirect } = await import("next/navigation");
      redirect("/login");
    }
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  const json = await res.json();

  if (!res.ok || json.success === false) {
    const err = (json as ApiErrorResponse).error || {
      code: "UNKNOWN_ERROR",
      message: res.statusText,
    };
    throw new ApiError(err.code, err.message, res.status, err.details);
  }

  return (json as ApiResponse<T>).data;
}

// ─── Paginated fetch helper ─────────────────────────────────

export async function fetchPaginated<T>(
  path: string,
  params?: URLSearchParams | Record<string, string | number | undefined>
): Promise<PaginatedResult<T>> {
  const url = `${API_URL}${path}`;
  const searchParams = params instanceof URLSearchParams
    ? params
    : (() => {
        const sp = new URLSearchParams();
        if (params) {
          for (const [key, value] of Object.entries(params)) {
            if (value !== undefined) sp.set(key, String(value));
          }
        }
        return sp;
      })();
  const qs = searchParams.toString();
  const fullUrl = qs ? `${url}?${qs}` : url;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const token = await getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(fullUrl, { headers, cache: "no-store" });

  if (res.status === 401) {
    const newToken = await tryRefresh();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      const retryRes = await fetch(fullUrl, { headers, cache: "no-store" });
      const json = await retryRes.json();
      if (!retryRes.ok || json.success === false) {
        const err = json.error || { code: "UNKNOWN_ERROR", message: retryRes.statusText };
        throw new ApiError(err.code, err.message, retryRes.status, err.details);
      }
      return { items: json.data, meta: json.meta };
    } else {
      await clearAuthCookies();
      const { redirect } = await import("next/navigation");
      redirect("/login");
    }
  }

  const json = await res.json();

  if (!res.ok || json.success === false) {
    const err = json.error || { code: "UNKNOWN_ERROR", message: res.statusText };
    throw new ApiError(err.code, err.message, res.status, err.details);
  }

  return { items: json.data, meta: json.meta };
}
