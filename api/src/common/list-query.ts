import type { SelectQueryBuilder } from 'typeorm';

/**
 * Generic server-side pagination / filtering / sorting contract.
 *
 * Query string shape:
 *   page, limit
 *   sort=name:asc,price:desc     (multi-sort, field:direction CSV)
 *   q=<text>                     (full-text over whitelisted columns)
 *   <column>=value               (equality / ILIKE for string columns)
 *   <column>=v1,v2,v3            (IN list for enum columns)
 *   <column>Min=, <column>Max=   (numeric range)
 *   <column>From=, <column>To=   (date range)
 */

/**
 * Each spec targets either a column on the root entity (auto-prefixed with
 * the QueryBuilder alias) or a raw SQL expression (e.g. a joined column or
 * COALESCE, set via `sql`). When `sql` is present it takes precedence.
 */
export type FilterSpec =
  | { type: 'string'; column?: string; sql?: string }
  | { type: 'enum'; column?: string; sql?: string }
  | { type: 'number'; column?: string; sql?: string }
  | { type: 'date'; column?: string; sql?: string }
  | { type: 'boolean'; column?: string; sql?: string };

export type ColumnMap = Record<string, FilterSpec>;

/**
 * Whitelist for sortable fields. Either a readonly string[] of column names
 * (auto-prefixed with the alias) or a Record mapping public sort ids to
 * either a column name or a raw SQL expression.
 */
export type SortableMap = readonly string[] | Record<string, string>;

const SAFE_COLUMN = /^[A-Za-z_][A-Za-z0-9_]*$/;

// Escape LIKE metacharacters using '!' as the escape character.
// NOTE: expression indexes matching unaccent(lower(...)) are deferred per project plan.
// Add immutable_unaccent-based gin_trgm indexes per table if search becomes slow at scale.
function escapeLike(s: string): string {
  return s.replace(/[!%_]/g, (c) => `!${c}`);
}

export class ListQuery {
  page: number;
  limit: number;
  q?: string;
  sorts: Array<{ field: string; direction: 'ASC' | 'DESC' }>;
  raw: Record<string, unknown>;

  constructor(query: Record<string, unknown>) {
    this.raw = query;
    this.page = Math.max(1, parseInt(String(query.page ?? '')) || 1);
    this.limit = Math.min(1000, Math.max(1, parseInt(String(query.limit ?? '')) || 20));
    const qVal = typeof query.q === 'string' ? query.q.trim() : '';
    this.q = qVal.length ? qVal : undefined;

    const sortParam = typeof query.sort === 'string' ? query.sort : '';
    this.sorts = sortParam
      .split(',')
      .map((seg) => seg.trim())
      .filter(Boolean)
      .map((seg) => {
        const [fieldRaw, dirRaw] = seg.split(':');
        const field = (fieldRaw || '').trim();
        const direction: 'ASC' | 'DESC' = (dirRaw || 'asc').trim().toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        return { field, direction };
      })
      .filter((s) => SAFE_COLUMN.test(s.field));
  }

  get skip(): number {
    return (this.page - 1) * this.limit;
  }

  /**
   * Apply filters, full-text search, sort, and limit/skip to a QueryBuilder.
   *
   * @param alias           TypeORM alias of the root entity in the QB
   * @param columnMap       Per-filter spec keyed by query-string parameter name
   * @param sortable        Whitelist of fields the client may sort on
   * @param searchColumns   Columns used for `q` full-text (all ILIKE'd)
   */
  /** Apply just filters + `q` search (no sort, no skip/take). */
  applyFilters<T>(
    qb: SelectQueryBuilder<T>,
    alias: string,
    columnMap: ColumnMap = {},
    searchColumns: readonly string[] = [],
  ): SelectQueryBuilder<T> {
    const resolveExpr = (spec: FilterSpec): string | null => {
      if (spec.sql) return spec.sql;
      if (spec.column && SAFE_COLUMN.test(spec.column)) return `${alias}.${spec.column}`;
      return null;
    };

    for (const [key, spec] of Object.entries(columnMap)) {
      const expr = resolveExpr(spec);
      if (!expr) continue;
      const qParam = `f_${key}`;

      if (spec.type === 'number') {
        const v = this.raw[key];
        if (v !== undefined && v !== '') {
          qb.andWhere(`${expr} = :${qParam}`, { [qParam]: Number(v) });
        }
        const vMin = this.raw[key + 'Min'];
        if (vMin !== undefined && vMin !== '') {
          qb.andWhere(`${expr} >= :${qParam}Min`, { [`${qParam}Min`]: Number(vMin) });
        }
        const vMax = this.raw[key + 'Max'];
        if (vMax !== undefined && vMax !== '') {
          qb.andWhere(`${expr} <= :${qParam}Max`, { [`${qParam}Max`]: Number(vMax) });
        }
        continue;
      }

      if (spec.type === 'date') {
        const from = this.raw[key + 'From'];
        if (typeof from === 'string' && from) {
          qb.andWhere(`${expr} >= :${qParam}From`, { [`${qParam}From`]: from });
        }
        const to = this.raw[key + 'To'];
        if (typeof to === 'string' && to) {
          qb.andWhere(`${expr} <= :${qParam}To`, { [`${qParam}To`]: to });
        }
        continue;
      }

      if (spec.type === 'enum') {
        const v = this.raw[key];
        if (v === undefined || v === '') continue;
        const values = String(v).split(',').map((s) => s.trim()).filter(Boolean);
        if (values.length > 0) {
          qb.andWhere(`${expr} IN (:...${qParam})`, { [qParam]: values });
        }
        continue;
      }

      if (spec.type === 'boolean') {
        const v = this.raw[key];
        if (v === undefined || v === '') continue;
        qb.andWhere(`${expr} = :${qParam}`, { [qParam]: v === 'true' || v === true });
        continue;
      }

      // string
      const v = this.raw[key];
      if (typeof v === 'string' && v.trim()) {
        qb.andWhere(`unaccent(lower(${expr}::text)) LIKE unaccent(lower(:${qParam})) ESCAPE '!'`, { [qParam]: `%${escapeLike(v.trim())}%` });
      }
    }

    if (this.q && searchColumns.length > 0) {
      const exprs = searchColumns.map((c) => SAFE_COLUMN.test(c) ? `${alias}.${c}` : c);
      qb.andWhere(
        '(' + exprs.map((e) => `unaccent(lower(${e}::text)) LIKE unaccent(lower(:__q)) ESCAPE '!'`).join(' OR ') + ')',
        { __q: `%${escapeLike(this.q)}%` },
      );
    }

    return qb;
  }

  /** Apply filters, q search, sort, and skip/take for paginated list queries. */
  applyTo<T>(
    qb: SelectQueryBuilder<T>,
    alias: string,
    columnMap: ColumnMap = {},
    sortable: SortableMap = [],
    searchColumns: readonly string[] = [],
    defaultSort?: { field: string; direction: 'ASC' | 'DESC' },
  ): SelectQueryBuilder<T> {
    this.applyFilters(qb, alias, columnMap, searchColumns);

    const sortableMap: Record<string, string> = Array.isArray(sortable)
      ? Object.fromEntries(sortable.map((c) => [c, `${alias}.${c}`]))
      : Object.fromEntries(
          Object.entries(sortable as Record<string, string>).map(([id, expr]) => [
            id,
            SAFE_COLUMN.test(expr) ? `${alias}.${expr}` : expr,
          ]),
        );
    const applied = this.sorts.filter((s) => sortableMap[s.field] !== undefined);
    if (applied.length === 0 && defaultSort && sortableMap[defaultSort.field] !== undefined) {
      applied.push(defaultSort);
    }
    applied.forEach((s, idx) => {
      const expr = sortableMap[s.field];
      if (idx === 0) qb.orderBy(expr, s.direction);
      else qb.addOrderBy(expr, s.direction);
    });

    qb.skip(this.skip).take(this.limit);
    return qb;
  }

  buildMeta(total: number) {
    return {
      page: this.page,
      limit: this.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / this.limit)),
    };
  }
}
