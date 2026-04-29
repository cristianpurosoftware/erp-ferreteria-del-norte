import { SEARCHABLE_ENTITIES, SearchResult, SearchableEntity } from './searchable-registry';

export interface SearchGroup {
  type: string;
  label: string;
  items: SearchResult[];
}

export interface SearchResponse {
  groups: SearchGroup[];
  meta: {
    query: string;
    types: string[];
    count: number;
    ms: number;
  };
}

export async function search(
  q: string,
  userPermissions: string[],
  limit: number,
  requestedTypes?: string[]
): Promise<SearchResponse> {
  const started = Date.now();
  const permSet = new Set(userPermissions);

  let candidates: SearchableEntity[] = SEARCHABLE_ENTITIES.filter((e) =>
    permSet.has(e.permission)
  );

  if (requestedTypes && requestedTypes.length > 0) {
    const typeSet = new Set(requestedTypes);
    candidates = candidates.filter((e) => typeSet.has(e.type));
  }

  const settled = await Promise.allSettled(
    candidates.map(async (entity) => {
      const items = await entity.search(q, limit);
      return { entity, items };
    })
  );

  const groups: SearchGroup[] = [];
  for (const result of settled) {
    if (result.status === 'rejected') {
      console.error('[search] entity query failed', result.reason);
      continue;
    }
    const { entity, items } = result.value;
    if (items.length === 0) continue;
    groups.push({ type: entity.type, label: entity.label, items });
  }

  const count = groups.reduce((sum, g) => sum + g.items.length, 0);

  return {
    groups,
    meta: {
      query: q,
      types: candidates.map((e) => e.type),
      count,
      ms: Date.now() - started,
    },
  };
}
