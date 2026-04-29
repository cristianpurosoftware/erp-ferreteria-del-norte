import { fetchApi } from "../client";

export interface SearchResultItem {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  href: string;
  meta?: Record<string, unknown>;
}

export interface SearchGroup {
  type: string;
  label: string;
  items: SearchResultItem[];
}

export interface SearchResponse {
  groups: SearchGroup[];
}

export async function searchEntities(params: {
  q: string;
  types?: string[];
  limit?: number;
}): Promise<SearchResponse> {
  const query: Record<string, string | number> = { q: params.q };
  if (params.types && params.types.length > 0) query.types = params.types.join(",");
  if (params.limit) query.limit = params.limit;
  return fetchApi<SearchResponse>("/search", { params: query });
}
