import { In } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { PermissionEntity } from './data_access/permission.entity';

const permRepo = AppDataSource.getRepository(PermissionEntity);

export async function findAll() {
  return permRepo.find({ order: { section: 'ASC', name: 'ASC' } });
}

export async function findByNames(names: string[]) {
  return permRepo.find({ where: { name: In(names) } });
}
