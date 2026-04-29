import { Faker, es, en, base } from '@faker-js/faker';

// es first, then en as fallback for any missing definitions (e.g. some word/commerce methods)
const fakerEs = new Faker({ locale: [es, en, base] });
fakerEs.seed(42);

export const fk = fakerEs;

export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(9 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0);
  return d;
}

export function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

export function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickMany<T>(arr: T[], n: number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  const k = Math.min(n, pool.length);
  for (let i = 0; i < k; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

export function weighted<T>(items: Array<[T, number]>): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [item, w] of items) {
    r -= w;
    if (r <= 0) return item;
  }
  return items[items.length - 1][0];
}

const CUIT_FACTORS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
export function generateCuit(prefix: 20 | 23 | 27 | 30 | 33 = 30): string {
  // DNI-style 8 digit body + check digit
  const body = String(randomBetween(10_000_000, 99_999_999));
  const full = String(prefix) + body;
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(full[i], 10) * CUIT_FACTORS[i];
  let check = 11 - (sum % 11);
  if (check === 11) check = 0;
  if (check === 10) check = 9;
  return `${prefix}-${body}-${check}`;
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Generate a distribution of N dates across [monthsBack] past to [monthsForward] future,
 * biased toward denser recent activity.
 */
export function buildTimeline(n: number, monthsBack: number, monthsForward: number): Date[] {
  const now = Date.now();
  const backMs = monthsBack * 30 * 24 * 3600 * 1000;
  const fwdMs = monthsForward * 30 * 24 * 3600 * 1000;
  const out: Date[] = [];
  for (let i = 0; i < n; i++) {
    // Bias: 70% past, 30% future; within past, recent is denser
    const goFuture = Math.random() < 0.3 && monthsForward > 0;
    let t: number;
    if (goFuture) {
      t = now + Math.random() * fwdMs;
    } else {
      // Sqrt bias = denser near now
      const r = Math.random() * Math.random();
      t = now - r * backMs;
    }
    out.push(new Date(t));
  }
  out.sort((a, b) => a.getTime() - b.getTime());
  return out;
}
