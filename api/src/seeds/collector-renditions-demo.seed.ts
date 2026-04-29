/**
 * Dedicated demo seed for collector renditions: populates
 * `collector_renditions` and `collector_rendition_lines`, and assigns
 * inbound payments to a collector + rendition.
 *
 * Safety:
 *   - Blocked in production unless SEED_CONFIRM=yes.
 *   - Idempotent: skips if the seed has already run (tagged via
 *     `metadata.seed = 'collector-renditions-demo'` on the rendition).
 *   - Clean reset with RESET_COLLECTOR_RENDITIONS_SEED=yes: deletes only
 *     lines + renditions created by this seed and clears collector_id /
 *     collector_rendition_id on payments that referenced those renditions.
 *     Payment records themselves are preserved.
 *
 * Run:
 *   cd api && npm run seed:collector-renditions
 *   RESET_COLLECTOR_RENDITIONS_SEED=yes npm run seed:collector-renditions
 */

import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';
import { env } from '../config/env';
import { CollectorRenditionEntity } from '../modules/collector-renditions/data_access/collector-rendition.entity';
import { CollectorRenditionLineEntity } from '../modules/collector-renditions/data_access/collector-rendition-line.entity';

const SEED_TAG = 'collector-renditions-demo';
const STATUSES = ['draft', 'submitted', 'approved', 'rejected'] as const;
type Status = (typeof STATUSES)[number];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function resetSeed() {
  console.log(`RESET_COLLECTOR_RENDITIONS_SEED=yes → wiping previous "${SEED_TAG}" data…`);
  await AppDataSource.query(
    `UPDATE payments
        SET collector_id = NULL, collector_rendition_id = NULL
      WHERE collector_rendition_id IN (
        SELECT id FROM collector_renditions WHERE metadata->>'seed' = $1
      )`,
    [SEED_TAG],
  );
  await AppDataSource.query(
    `DELETE FROM collector_rendition_lines
      WHERE collector_rendition_id IN (
        SELECT id FROM collector_renditions WHERE metadata->>'seed' = $1
      )`,
    [SEED_TAG],
  );
  await AppDataSource.query(`DELETE FROM collector_renditions WHERE metadata->>'seed' = $1`, [SEED_TAG]);
}

async function alreadyRan(): Promise<boolean> {
  const rows = await AppDataSource.query(
    `SELECT COUNT(*)::int AS n FROM collector_renditions WHERE metadata->>'seed' = $1`,
    [SEED_TAG],
  );
  return Number(rows[0]?.n ?? 0) > 0;
}

interface CollectorRef { id: string; email: string }
interface PaymentRef { id: string; payment_method: string; amount: string }

async function fetchRefs() {
  const demoCollectors: CollectorRef[] = await AppDataSource.query(
    `SELECT id, email FROM users
      WHERE email LIKE 'cobrador.%@demo.com' AND deleted_at IS NULL`,
  );

  let collectors = demoCollectors;
  if (collectors.length < 3) {
    console.log(`… found ${collectors.length} cobrador.*@demo.com users, falling back to recent active users`);
    const fallback: CollectorRef[] = await AppDataSource.query(
      `SELECT id, email FROM users
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 8`,
    );
    // merge, avoid dupes
    const byId = new Map<string, CollectorRef>();
    for (const c of [...demoCollectors, ...fallback]) byId.set(c.id, c);
    collectors = Array.from(byId.values());
  }

  const payments: PaymentRef[] = await AppDataSource.query(
    `SELECT id, payment_method, amount::text AS amount
       FROM payments
      WHERE direction = 'in'
        AND deleted_at IS NULL
        AND collector_rendition_id IS NULL
        AND payment_method IN ('cash', 'check', 'transfer')
      ORDER BY created_at DESC
      LIMIT 500`,
  );

  if (collectors.length < 3) {
    throw new Error(`Need at least 3 collectors. Found ${collectors.length}. Seed master/demo users first.`);
  }
  if (payments.length < 20) {
    throw new Error(`Need at least 20 inbound unassigned payments. Found ${payments.length}. Seed comprobantes/payments first.`);
  }
  return { collectors, payments };
}

function shuffle<T>(arr: T[]): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function seedRenditions(refs: Awaited<ReturnType<typeof fetchRefs>>) {
  const renditionRepo = AppDataSource.getRepository(CollectorRenditionEntity);
  const lineRepo = AppDataSource.getRepository(CollectorRenditionLineEntity);

  const payments = shuffle(refs.payments);
  const renditionCount = randInt(20, 30);
  let paymentCursor = 0;
  const usedPaymentsByRendition: Array<{ renditionId: string; collectorId: string; paymentIds: string[] }> = [];

  for (let i = 0; i < renditionCount; i++) {
    const remaining = payments.length - paymentCursor;
    if (remaining < 3) break;
    const groupSize = Math.min(randInt(3, 8), remaining);
    const group = payments.slice(paymentCursor, paymentCursor + groupSize);
    paymentCursor += groupSize;

    const collector = pick(refs.collectors);
    const status: Status = pick(STATUSES);
    const date = daysAgo(randInt(0, 45));
    const seedKey = `rendition-${String(i + 1).padStart(3, '0')}`;

    let totalCash = 0;
    let totalChecks = 0;
    let totalTransfers = 0;
    let total = 0;
    const lines: CollectorRenditionLineEntity[] = [];

    for (const p of group) {
      const amount = Number(p.amount);
      const declared = Number(amount.toFixed(2));
      total += declared;
      if (p.payment_method === 'cash') totalCash += declared;
      else if (p.payment_method === 'check') totalChecks += declared;
      else if (p.payment_method === 'transfer') totalTransfers += declared;

      let accepted: number | undefined;
      let diff: number | undefined;
      if (status === 'approved') {
        // 85% match exactly, 15% small diff
        if (Math.random() < 0.85) {
          accepted = declared;
          diff = 0;
        } else {
          const delta = Number((declared * (Math.random() * 0.1 - 0.05)).toFixed(2));
          accepted = Number((declared + delta).toFixed(2));
          diff = Number((accepted - declared).toFixed(2));
        }
      }

      lines.push(
        lineRepo.create({
          paymentId: p.id,
          declaredAmount: declared,
          acceptedAmount: accepted,
          difference: diff,
          reason: diff && diff !== 0 ? 'Ajuste al aprobar' : undefined,
        }),
      );
    }

    const rendition = renditionRepo.create({
      collectorId: collector.id,
      date,
      status,
      totalCash: Number(totalCash.toFixed(2)),
      totalChecks: Number(totalChecks.toFixed(2)),
      totalTransfers: Number(totalTransfers.toFixed(2)),
      total: Number(total.toFixed(2)),
      approvedBy: status === 'approved' ? collector.id : undefined,
      approvedAt: status === 'approved' ? new Date() : undefined,
      notes: status === 'rejected' ? 'Rechazada por diferencia de caja' : undefined,
      lines,
      metadata: { seed: SEED_TAG, seedKey },
    });

    const saved = await renditionRepo.save(rendition);
    usedPaymentsByRendition.push({
      renditionId: saved.id,
      collectorId: collector.id,
      paymentIds: group.map((p) => p.id),
    });
  }

  // Link payments to their rendition + collector
  for (const grp of usedPaymentsByRendition) {
    await AppDataSource.query(
      `UPDATE payments
          SET collector_id = $1, collector_rendition_id = $2
        WHERE id = ANY($3)`,
      [grp.collectorId, grp.renditionId, grp.paymentIds],
    );
  }

  console.log(`✓ ${usedPaymentsByRendition.length} rendiciones · ${usedPaymentsByRendition.reduce((s, g) => s + g.paymentIds.length, 0)} pagos vinculados`);
}

async function main() {
  if (env.isProd && process.env.SEED_CONFIRM !== 'yes') {
    console.error('✖ Refusing to run in production without SEED_CONFIRM=yes.');
    process.exit(2);
  }

  await AppDataSource.initialize();
  console.log('DB connected');

  if (process.env.RESET_COLLECTOR_RENDITIONS_SEED === 'yes') {
    await resetSeed();
  } else if (await alreadyRan()) {
    console.log(`Seed already applied (metadata.seed=${SEED_TAG}). Skip.`);
    console.log('  Use RESET_COLLECTOR_RENDITIONS_SEED=yes to wipe and re-apply.');
    await AppDataSource.destroy();
    return;
  }

  const refs = await fetchRefs();
  console.log(`Preflight: ${refs.collectors.length} cobradores, ${refs.payments.length} pagos disponibles.`);

  await seedRenditions(refs);

  console.log('✔ Seed collector-renditions completo.');
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
