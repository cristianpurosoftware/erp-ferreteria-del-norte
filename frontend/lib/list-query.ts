import type { ColumnFiltersState, PaginationState, SortingState } from "@tanstack/react-table";

/**
 * Shared frontend → backend contract for server-side paginated lists.
 * Matches `api/src/common/list-query.ts`.
 */

export interface ListQueryState {
  pagination: PaginationState;
  sorting: SortingState;
  filters: ColumnFiltersState;
  q?: string | null;
}

export interface ListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Convert TanStack Table state into `URLSearchParams` compatible with the
 * backend `ListQuery` helper. Consumers usually pass the result to a fetch
 * wrapper that appends it to the endpoint URL.
 */
export function buildListQuery(state: ListQueryState): URLSearchParams {
  const params = new URLSearchParams();
  params.set("page", String(state.pagination.pageIndex + 1));
  params.set("limit", String(state.pagination.pageSize));

  if (state.sorting.length > 0) {
    params.set(
      "sort",
      state.sorting.map((s) => `${s.id}:${s.desc ? "desc" : "asc"}`).join(","),
    );
  }

  for (const f of state.filters) {
    const v = f.value;
    if (v == null) continue;

    if (Array.isArray(v)) {
      const joined = v.filter((x) => x !== null && x !== undefined && x !== "").join(",");
      if (joined) params.set(f.id, joined);
      continue;
    }

    if (typeof v === "object") {
      // Range-style filter value: { min, max } or { from, to }
      const obj = v as Record<string, unknown>;
      for (const [k, val] of Object.entries(obj)) {
        if (val === undefined || val === null || val === "") continue;
        const suffix = k.charAt(0).toUpperCase() + k.slice(1);
        params.set(`${f.id}${suffix}`, String(val));
      }
      continue;
    }

    if (String(v).length > 0) params.set(f.id, String(v));
  }

  if (state.q) params.set("q", state.q);
  return params;
}
