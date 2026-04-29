import { AppDataSource } from '../../config/data-source';
import { ReconciliationMatchEntity } from './data_access/reconciliation-match.entity';
import { BankStatementLineEntity } from '../bank-statements/data_access/bank-statement-line.entity';
import { NotFoundError } from '../../common/errors';
import eventBus from '../../common/event-bus';
import { ReconciliationEvents } from './reconciliation.events';
import { logger } from '../../common/logger';

const repo = AppDataSource.getRepository(ReconciliationMatchEntity);
const lineRepo = AppDataSource.getRepository(BankStatementLineEntity);

export async function findSuggestions(bankStatementId: string) {
  // Naive: unmatched statement lines + candidate payments by amount
  const unmatched = await lineRepo.find({ where: { bankStatementId, matched: false } });
  const suggestions = [];
  for (const line of unmatched) {
    const candidates = await AppDataSource.query(
      `SELECT id, amount FROM payments WHERE amount = $1 AND status IN ('confirmed','applied') LIMIT 5`,
      [line.amount],
    );
    suggestions.push({ line, candidates });
  }
  return suggestions;
}

export async function confirm(data: any, userId?: string) {
  const match = repo.create({
    bankStatementLineId: data.bankStatementLineId,
    paymentId: data.paymentId,
    checkId: data.checkId,
    amount: data.amount,
    matchedBy: userId,
    matchedAt: new Date(),
    status: 'confirmed',
  });
  const saved = await repo.save(match);

  const line = await lineRepo.findOne({ where: { id: data.bankStatementLineId } });
  if (line) {
    line.matched = true;
    line.reconciliationMatchId = saved.id;
    await lineRepo.save(line);
  }

  eventBus.emit(ReconciliationEvents.MATCHED, saved);
  logger.info({ action: 'create', reconciliationId: saved.id, bankStatementLineId: saved.bankStatementLineId, paymentId: saved.paymentId, amount: saved.amount }, 'Reconciliation match confirmed');
  return saved;
}

export async function reject(id: string) {
  const match = await repo.findOne({ where: { id } });
  if (!match) throw new NotFoundError('Conciliación no encontrada');
  const from = match.status;
  match.status = 'rejected';
  const saved = await repo.save(match);
  eventBus.emit(ReconciliationEvents.REJECTED, saved);
  logger.info({ action: 'transition', reconciliationId: id, from, to: 'rejected' }, 'Reconciliation match rejected');
  return saved;
}
