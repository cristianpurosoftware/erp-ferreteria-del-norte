export type DiffKind = "added" | "removed" | "changed" | "unchanged";

export interface DiffRow {
  path: string;
  kind: DiffKind;
  previous?: unknown;
  next?: unknown;
}

type Value = unknown;

function isPlainObject(v: Value): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function deepEqual(a: Value, b: Value): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      if (!deepEqual(a[k], b[k])) return false;
    }
    return true;
  }
  return false;
}

function walk(
  prev: Value,
  next: Value,
  path: string,
  acc: DiffRow[],
  includeUnchanged: boolean,
) {
  if (deepEqual(prev, next)) {
    if (includeUnchanged && path) {
      acc.push({ path, kind: "unchanged", previous: prev, next });
    }
    return;
  }

  const prevIsObj = isPlainObject(prev);
  const nextIsObj = isPlainObject(next);

  if (prevIsObj && nextIsObj) {
    const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
    for (const k of keys) {
      const p = path ? `${path}.${k}` : k;
      walk(prev[k], next[k], p, acc, includeUnchanged);
    }
    return;
  }

  if (prev === undefined || prev === null) {
    acc.push({ path: path || "(root)", kind: "added", next });
  } else if (next === undefined || next === null) {
    acc.push({ path: path || "(root)", kind: "removed", previous: prev });
  } else {
    acc.push({ path: path || "(root)", kind: "changed", previous: prev, next });
  }
}

export function diffJson(
  previous: Value,
  next: Value,
  options: { includeUnchanged?: boolean } = {},
): DiffRow[] {
  const rows: DiffRow[] = [];
  walk(previous, next, "", rows, options.includeUnchanged ?? false);
  return rows;
}

export function formatValue(v: unknown): string {
  if (v === undefined) return "—";
  if (v === null) return "null";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
