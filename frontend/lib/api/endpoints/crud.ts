import { fetchApi, fetchPaginated, type PaginatedResult } from "../client";

/**
 * Generate standard CRUD functions for a resource.
 * Usage: const categories = createCrud<Category>("/categories");
 *
 * `getAll` accepts either a `URLSearchParams` (for server-side tables that
 * build the query via `buildListQuery`) or a plain record of params.
 *
 * `getSummary<S>(query?)` is provided for resources that implement
 * `GET /{basePath}/summary` — returns the aggregates payload.
 */
export function createCrud<T>(basePath: string) {
  return {
    async getAll(
      params?: URLSearchParams | Record<string, string | number | undefined>,
    ): Promise<PaginatedResult<T>> {
      return fetchPaginated<T>(basePath, params);
    },

    async getSummary<S = Record<string, unknown>>(query?: string): Promise<S> {
      const suffix = query ? `?${query}` : "";
      return fetchApi<S>(`${basePath}/summary${suffix}`);
    },

    async getById(id: string): Promise<T> {
      return fetchApi<T>(`${basePath}/${id}`);
    },

    async create(data: Partial<T>): Promise<T> {
      return fetchApi<T>(basePath, { method: "POST", body: data });
    },

    async update(id: string, data: Partial<T>): Promise<T> {
      return fetchApi<T>(`${basePath}/${id}`, { method: "PUT", body: data });
    },

    async remove(id: string): Promise<void> {
      return fetchApi<void>(`${basePath}/${id}`, { method: "DELETE" });
    },
  };
}
