import { describe, it, expect } from 'vitest';
import { PaginationQuery, buildPaginationMeta, safeSortColumn } from '../../src/common/pagination';

describe('PaginationQuery', () => {
  it('clamps page to >= 1 and limit between 1 and 100', () => {
    const q = new PaginationQuery({ page: '0', limit: '500' });
    expect(q.page).toBe(1);
    expect(q.limit).toBe(100);
  });

  it('uses defaults for missing values', () => {
    const q = new PaginationQuery({});
    expect(q.page).toBe(1);
    expect(q.limit).toBe(20);
    expect(q.sortOrder).toBe('ASC');
  });

  it('skip is (page-1)*limit', () => {
    const q = new PaginationQuery({ page: '3', limit: '15' });
    expect(q.skip).toBe(30);
  });

  it('accepts valid alphanum sortBy', () => {
    expect(new PaginationQuery({ sortBy: 'createdAt' }).sortBy).toBe('createdAt');
    expect(new PaginationQuery({ sortBy: 'first_name' }).sortBy).toBe('first_name');
  });

  it('rejects sortBy with SQL injection attempts', () => {
    expect(new PaginationQuery({ sortBy: 'name; DROP TABLE users' }).sortBy).toBeUndefined();
    expect(new PaginationQuery({ sortBy: 'name OR 1=1' }).sortBy).toBeUndefined();
    expect(new PaginationQuery({ sortBy: 'name)--' }).sortBy).toBeUndefined();
    expect(new PaginationQuery({ sortBy: '*' }).sortBy).toBeUndefined();
  });

  it('rejects sortBy starting with a digit', () => {
    expect(new PaginationQuery({ sortBy: '1column' }).sortBy).toBeUndefined();
  });

  it('respects sortOrder DESC', () => {
    expect(new PaginationQuery({ sortOrder: 'DESC' }).sortOrder).toBe('DESC');
    // anything else falls back to ASC
    expect(new PaginationQuery({ sortOrder: 'desc' }).sortOrder).toBe('ASC');
  });
});

describe('buildPaginationMeta', () => {
  it('computes totalPages with rounding up', () => {
    const meta = buildPaginationMeta(new PaginationQuery({ page: '1', limit: '20' }), 47);
    expect(meta.totalPages).toBe(3);
    expect(meta.total).toBe(47);
  });
});

describe('safeSortColumn', () => {
  it('returns the candidate when in allowed list', () => {
    expect(safeSortColumn('createdAt', ['createdAt', 'updatedAt'] as const, 'createdAt')).toBe('createdAt');
  });
  it('falls back when candidate is undefined', () => {
    expect(safeSortColumn(undefined, ['a', 'b'] as const, 'a')).toBe('a');
  });
  it('falls back when candidate is not in allowed list', () => {
    expect(safeSortColumn('hack', ['a', 'b'] as const, 'a')).toBe('a');
  });
});
