import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError } from '../common/errors';
import { AppDataSource } from '../config/data-source';
import { RoleEntity } from '../modules/roles/data_access/role.entity';
import { RolePermissionEntity } from '../modules/roles/data_access/role-permission.entity';

export interface AuthUser {
  id: string;
  email: string;
  roleId: string;
  permissions: string[];
  // If the user's role has the `support_access` flag, the permissions
  // middleware allows every HTTP GET regardless of the permission string.
  supportAccess: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

type RoleData = { permissions: string[]; supportAccess: boolean };
type RoleCacheEntry = RoleData & { expiresAt: number };
const roleCache = new Map<string, RoleCacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function invalidatePermissionsCache(roleId?: string) {
  if (roleId) roleCache.delete(roleId);
  else roleCache.clear();
}

async function loadRoleData(roleId: string): Promise<RoleData> {
  const cached = roleCache.get(roleId);
  if (cached && cached.expiresAt > Date.now()) {
    return { permissions: cached.permissions, supportAccess: cached.supportAccess };
  }

  const role = await AppDataSource.getRepository(RoleEntity).findOne({ where: { id: roleId } });
  const rows = await AppDataSource.getRepository(RolePermissionEntity).find({ where: { roleId } });
  const permissions = rows.map((rp) => rp.permission?.name).filter(Boolean) as string[];
  const supportAccess = Boolean(role?.supportAccess);

  roleCache.set(roleId, { permissions, supportAccess, expiresAt: Date.now() + CACHE_TTL_MS });
  return { permissions, supportAccess };
}

export async function verifyToken(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.split(' ')[1];

  if (!token) {
    throw new UnauthorizedError('Token no proporcionado');
  }

  let decoded: Pick<AuthUser, 'id' | 'email' | 'roleId'>;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET) as Pick<AuthUser, 'id' | 'email' | 'roleId'>;
  } catch {
    throw new UnauthorizedError('Token inválido o expirado');
  }

  try {
    const { permissions, supportAccess } = await loadRoleData(decoded.roleId);
    req.user = { ...decoded, permissions, supportAccess };
    next();
  } catch (err) {
    next(err);
  }
}
