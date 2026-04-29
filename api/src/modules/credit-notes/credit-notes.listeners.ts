import eventBus from '../../common/event-bus';
import { ReturnEvents } from '../returns/returns.events';
import { createFromReturn } from './credit-notes.service';
import { CreditNoteEvents } from './credit-notes.events';
import { CreditNoteEntity } from './data_access/credit-note.entity';
import { createEntryIdempotent } from '../accounts/accounts.service';

export function registerCreditNotesListeners() {
  eventBus.on(ReturnEvents.INSPECTED, async (ret: any) => {
    if (!ret || !['rejected_by_customer', 'commercial'].includes(ret.kind)) return;
    try {
      await createFromReturn(ret.id);
    } catch (e) {
      console.error(`auto credit-note from return ${ret?.id} failed:`, e);
    }
  });

  // When a credit note is issued (or applied for tenants without AFIP), reduce
  // the customer's debt with a credit entry. Idempotent.
  const creditHandler = async (cn: CreditNoteEntity) => {
    if (!cn?.id || !cn.customerId) return;
    const total = Number(cn.total ?? 0);
    if (total <= 0) return;
    try {
      await createEntryIdempotent({
        entityType: 'customer',
        entityId: cn.customerId,
        type: 'credit',
        concept: `Credit note ${cn.number ?? cn.id.slice(0, 8)}`,
        amount: total,
        referenceType: 'credit_note',
        referenceId: cn.id,
      });
    } catch (e) {
      console.error(`[credit-notes.listeners] failed to credit account for cn ${cn.id}:`, e);
    }
  };
  eventBus.on(CreditNoteEvents.ISSUED, creditHandler);
  eventBus.on(CreditNoteEvents.APPLIED, creditHandler);
}
