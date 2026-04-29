import { In } from 'typeorm';
import { AppDataSource } from '../../config/data-source';
import { NotFoundError, BusinessLogicError } from '../../common/errors';
import { PaginationQuery, buildPaginationMeta } from '../../common/pagination';
import eventBus from '../../common/event-bus';
import { RoleEntity } from './data_access/role.entity';
import { RolePermissionEntity } from './data_access/role-permission.entity';
import { PermissionEntity } from '../permissions/data_access/permission.entity';
import { RoleEvents } from './roles.events';
import { CreateRoleDto, UpdateRoleDto } from './roles.schema';
import { logger } from '../../common/logger';

const roleRepo = AppDataSource.getRepository(RoleEntity);
const rpRepo = AppDataSource.getRepository(RolePermissionEntity);
const permRepo = AppDataSource.getRepository(PermissionEntity);

export async function findAll(query: PaginationQuery) {
  const [items, total] = await roleRepo.findAndCount({
    skip: query.skip,
    take: query.limit,
    order: query.sortBy ? { [query.sortBy]: query.sortOrder } : { createdAt: 'DESC' },
  });

  return { items, meta: buildPaginationMeta(query, total) };
}

export async function findById(id: string) {
  const role = await roleRepo.findOne({ where: { id } });
  if (!role) throw new NotFoundError('Rol no encontrado');
  return role;
}

async function syncPermissions(roleId: string, permissionIds: string[]) {
  // Validate all permission IDs exist
  const permissions = await permRepo.find({ where: { id: In(permissionIds) } });
  if (permissions.length !== permissionIds.length) {
    throw new BusinessLogicError('INVALID_PERMISSIONS', 'Uno o más IDs de permisos son inválidos');
  }

  // Remove existing permissions
  await rpRepo.delete({ roleId });

  // Create new role-permission associations
  const rolePermissions = permissionIds.map((permissionId) =>
    rpRepo.create({ roleId, permissionId }),
  );

  await rpRepo.save(rolePermissions);
}

export async function create(data: CreateRoleDto) {
  const { permissionIds, ...roleData } = data;

  const existing = await roleRepo.findOne({ where: { name: roleData.name } });
  if (existing) throw new BusinessLogicError('ROLE_NAME_EXISTS', 'El nombre del rol ya está en uso');

  const role = roleRepo.create(roleData);
  const saved = await roleRepo.save(role);

  await syncPermissions(saved.id, permissionIds);

  const result = await findById(saved.id);
  eventBus.emit(RoleEvents.CREATED, result);
  logger.info({ action: 'create', roleId: result.id, name: result.name }, 'Role created');
  return result;
}

export async function update(id: string, data: UpdateRoleDto) {
  const role = await findById(id);

  if (role.isSystemRole) {
    throw new BusinessLogicError('SYSTEM_ROLE', 'No se puede modificar un rol del sistema');
  }

  const { permissionIds, ...roleData } = data;

  if (roleData.name && roleData.name !== role.name) {
    const existing = await roleRepo.findOne({ where: { name: roleData.name } });
    if (existing) throw new BusinessLogicError('ROLE_NAME_EXISTS', 'El nombre del rol ya está en uso');
  }

  Object.assign(role, roleData);
  await roleRepo.save(role);

  if (permissionIds) {
    await syncPermissions(id, permissionIds);
  }

  const result = await findById(id);
  eventBus.emit(RoleEvents.UPDATED, result);
  logger.info({ action: 'update', roleId: id }, 'Role updated');
  return result;
}

export async function remove(id: string) {
  const role = await findById(id);

  if (role.isSystemRole) {
    throw new BusinessLogicError('SYSTEM_ROLE', 'No se puede eliminar un rol del sistema');
  }

  await roleRepo.softRemove(role);
  eventBus.emit(RoleEvents.DELETED, role);
  logger.info({ action: 'delete', roleId: id }, 'Role deleted');
}
