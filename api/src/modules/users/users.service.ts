import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../../config/data-source';
import { NotFoundError, BusinessLogicError } from '../../common/errors';
import { ListQuery, type ColumnMap, type SortableMap } from '../../common/list-query';
import eventBus from '../../common/event-bus';
import { logger } from '../../common/logger';
import { UserEntity } from './data_access/user.entity';
import { RoleEntity } from '../roles/data_access/role.entity';
import { UserEvents } from './users.events';
import { CreateUserDto, UpdateUserDto } from './users.schema';

const userRepo = AppDataSource.getRepository(UserEntity);
const roleRepo = AppDataSource.getRepository(RoleEntity);

/**
 * Rejects role assignment through the public API when the target role has
 * the `support_access` flag. Roles with that flag are reserved for the
 * automated support agent (seeded on onboarding) and cannot be handed to
 * human users. Seeds bypass this guard because they use the raw repo.
 */
async function assertRoleAssignable(roleId: string): Promise<void> {
  const role = await roleRepo.findOne({ where: { id: roleId } });
  if (!role) {
    throw new BusinessLogicError('INVALID_ROLE', 'Rol no encontrado');
  }
  if (role.supportAccess) {
    throw new BusinessLogicError(
      'ROLE_RESERVED',
      'Este rol está reservado para el agente de soporte y no puede asignarse a usuarios',
    );
  }
}

const USER_COLUMNS: ColumnMap = {
  roleId:     { type: 'enum', column: 'roleId' },
  status:     { type: 'enum', column: 'status' },
  email:      { type: 'string', column: 'email' },
  createdAt:  { type: 'date', column: 'createdAt' },
  lastLoginAt: { type: 'date', column: 'lastLoginAt' },
};
const USER_SORTABLE: SortableMap = ['first_name', 'last_name', 'email', 'createdAt', 'lastLoginAt', 'status'];
const USER_SEARCH = ['u.first_name', 'u.last_name', 'u.email'];

export async function findAll(req: Record<string, unknown>) {
  const query = new ListQuery(req);
  const qb = userRepo.createQueryBuilder('u');
  query.applyTo(qb, 'u', USER_COLUMNS, USER_SORTABLE, USER_SEARCH, {
    field: 'createdAt', direction: 'DESC',
  });

  const total = await qb.getCount();
  const items = await qb.getMany();
  return { items, meta: query.buildMeta(total) };
}

export async function findById(id: string) {
  const user = await userRepo.findOne({ where: { id } });
  if (!user) throw new NotFoundError('Usuario no encontrado');
  return user;
}

/**
 * Like `findById` but joins the role's permissions so the frontend can gate UI
 * elements without a second round trip. Returns `permissions: string[]` alongside
 * the normal user fields.
 */
export async function findByIdWithPermissions(id: string) {
  const user = await userRepo
    .createQueryBuilder('user')
    .leftJoinAndSelect('user.role', 'role')
    .leftJoinAndSelect('role.rolePermissions', 'rp')
    .leftJoinAndSelect('rp.permission', 'permission')
    .where('user.id = :id', { id })
    .getOne();
  if (!user) throw new NotFoundError('Usuario no encontrado');
  const permissions = (user.role?.rolePermissions ?? [])
    .map((rp: any) => rp.permission?.name)
    .filter((n: unknown): n is string => typeof n === 'string');
  return { ...user, permissions };
}

export async function findByEmail(email: string) {
  return userRepo.findOne({ where: { email } });
}

export async function findByEmailWithPassword(email: string) {
  return userRepo
    .createQueryBuilder('user')
    .addSelect('user.password_hash')
    .leftJoinAndSelect('user.role', 'role')
    .leftJoinAndSelect('role.rolePermissions', 'rp')
    .leftJoinAndSelect('rp.permission', 'permission')
    .where('user.email = :email', { email })
    .getOne();
}

export async function create(data: CreateUserDto) {
  const existing = await findByEmail(data.email);
  if (existing) throw new BusinessLogicError('USER_EMAIL_EXISTS', 'El email ya está en uso');

  if (data.roleId) await assertRoleAssignable(data.roleId);

  const { password, ...rest } = data;
  const password_hash = await bcrypt.hash(password, 12);

  const user = userRepo.create({ ...rest, password_hash });
  const saved = await userRepo.save(user);

  logger.info({ action: 'create', userId: saved.id, email: saved.email, roleId: saved.roleId }, 'User created');
  eventBus.emit(UserEvents.CREATED, saved);
  return saved;
}

export async function update(id: string, data: UpdateUserDto) {
  const user = await findById(id);

  if (data.email && data.email !== user.email) {
    const existing = await findByEmail(data.email);
    if (existing) throw new BusinessLogicError('USER_EMAIL_EXISTS', 'El email ya está en uso');
  }

  if (data.roleId && data.roleId !== user.roleId) {
    await assertRoleAssignable(data.roleId);
  }

  // Also guard when the user is currently on a support-access role: prevent
  // edits via the public API since the role itself is frozen.
  if (user.roleId) {
    const currentRole = await roleRepo.findOne({ where: { id: user.roleId } });
    if (currentRole?.supportAccess) {
      throw new BusinessLogicError(
        'ROLE_RESERVED',
        'Este usuario pertenece al rol reservado de soporte y no puede editarse',
      );
    }
  }

  Object.assign(user, data);
  const saved = await userRepo.save(user);

  logger.info({ action: 'update', userId: id }, 'User updated');
  eventBus.emit(UserEvents.UPDATED, saved);
  return saved;
}

export async function deactivate(id: string) {
  const user = await findById(id);
  const from = user.status;
  user.status = 'inactive';
  const saved = await userRepo.save(user);

  logger.info({ action: 'transition', userId: id, from, to: 'inactive' }, 'User deactivated');
  eventBus.emit(UserEvents.DEACTIVATED, saved);
  return saved;
}

export async function updateLastLogin(id: string) {
  await userRepo.update(id, { lastLoginAt: new Date() });
}
