"use server";

import * as searchApi from "@/lib/api/endpoints/search";
import type { SearchResponse } from "@/lib/api/endpoints/search";

export async function searchEntities(
  q: string,
  opts?: { types?: string[]; limit?: number }
): Promise<SearchResponse> {
  const trimmed = q.trim();
  if (trimmed.length === 0) return { groups: [] };
  return searchApi.searchEntities({ q: trimmed, ...opts });
}

export type { SearchResponse, SearchGroup, SearchResultItem } from "@/lib/api/endpoints/search";
