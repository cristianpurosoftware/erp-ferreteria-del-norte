// Anything beyond [A-Za-z0-9_] in a sortBy column would let a query string
// inject arbitrary SQL into ORDER BY. The PaginationQuery constructor strips
// such inputs to undefined so services fall back to their default column.
const SAFE_COLUMN_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export class PaginationQuery {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';

  constructor(query: Record<string, any>) {
    this.page = Math.max(1, parseInt(query.page) || 1);
    // No upper cap for demo; server-side pagination per module will bound
    // this naturally once every endpoint is migrated.
    this.limit = Math.max(1, parseInt(query.limit) || 20);
    this.search = query.search || undefined;
    const candidate = typeof query.sortBy === 'string' ? query.sortBy.trim() : undefined;
    this.sortBy = candidate && SAFE_COLUMN_PATTERN.test(candidate) ? candidate : undefined;
    this.sortOrder = query.sortOrder === 'DESC' ? 'DESC' : 'ASC';
  }

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}

/**
 * Use when a service wants stricter validation than the default alphanum check.
 * Returns the requested column when in `allowed`, otherwise the fallback.
 * Combine with whitelist objects in services that already have them
 * (e.g. cashbox SESSION_SORT_COLUMNS) for extra safety.
 */
export function safeSortColumn<T extends string>(
  candidate: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (!candidate) return fallback;
  return (allowed as readonly string[]).includes(candidate) ? (candidate as T) : fallback;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function buildPaginationMeta(query: PaginationQuery, total: number): PaginationMeta {
  return {
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
  };
}
