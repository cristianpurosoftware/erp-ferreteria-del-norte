import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../common/errors';

export function requirePermission(permission: string | string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    // Roles flagged with `support_access` (reserved for the automated
    // support agent) get an automatic pass on any HTTP GET endpoint.
    // Intentional: the agent needs read-only visibility across the whole
    // API, and we don't want new GET endpoints to require a permission
    // update on the role to remain accessible.
    if (req.user?.supportAccess && req.method === 'GET') {
      return next();
    }

    const permissions = Array.isArray(permission) ? permission : [permission];
    const userPermissions = req.user?.permissions || [];

    const hasPermission = permissions.some((p) => userPermissions.includes(p));

    if (!hasPermission) {
      throw new ForbiddenError('Permisos insuficientes');
    }

    next();
  };
}
