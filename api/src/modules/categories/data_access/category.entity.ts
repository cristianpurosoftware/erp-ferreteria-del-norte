import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import BaseEntity from '../../../common/base.entity';

@Entity('categories')
export class CategoryEntity extends BaseEntity {
  @Column()
  name: string;

  @Column({ name: 'parent_id', nullable: true })
  parentId: string | null;

  @ManyToOne(() => CategoryEntity, (c) => c.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: CategoryEntity | null;

  @OneToMany(() => CategoryEntity, (c) => c.parent)
  children: CategoryEntity[];

  @Column({ default: 'active' })
  status: string;
}
