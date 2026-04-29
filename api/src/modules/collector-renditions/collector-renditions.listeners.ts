import eventBus from '../../common/event-bus';
import { AppDataSource } from '../../config/data-source';
import { CollectorRenditionEvents } from './collector-renditions.events';
import { CollectorRenditionLineEntity } from './data_access/collector-rendition-line.entity';

export function registerCollectorRenditionListeners() {
  // On rendition approved, mark each payment as "confirmed"
  eventBus.on(CollectorRenditionEvents.APPROVED, async (rendition: any) => {
    try {
      const lineRepo = AppDataSource.getRepository(CollectorRenditionLineEntity);
      const lines = await lineRepo.find({ where: { collectorRenditionId: rendition.id } });
      for (const line of lines) {
        await AppDataSource.query(
          `UPDATE payments SET status = 'confirmed' WHERE id = $1 AND status = 'draft'`,
          [line.paymentId],
        );
        eventBus.emit('payment.applied', { id: line.paymentId, renditionId: rendition.id });
      }
    } catch (e) {
      console.error(`rendition approved listener failed for rendition ${rendition?.id}:`, e);
    }
  });
}
