import {
  BaseEntity as TypeORMBaseEntity,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  PrimaryColumn,
  BeforeInsert,
  Column,
} from 'typeorm';
import { nanoid } from 'nanoid';
import { resolveIdPrefix } from './id-prefixes';

/**
 * IDs are `<prefix>_<nanoid12>` strings (e.g. `cust_abc123def456xy`).
 * Stored as `varchar(40)` — wide enough to also hold legacy UUID strings (36 chars)
 * during the transition window in DBs that already have data.
 *
 * The prefix is derived at insert time from the entity class name via
 * `resolveIdPrefix` (see `id-prefixes.ts`). Generation is JS-side; the column
 * has no DB-side default.
 */
export default class BaseEntity extends TypeORMBaseEntity {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @BeforeInsert()
  protected generateIdIfMissing(): void {
    if (!this.id) {
      const prefix = resolveIdPrefix(this.constructor.name);
      this.id = `${prefix}_${nanoid(12)}`;
    }
  }
}
