import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { UnauthorizedError } from '../../common/errors';
import { AuthUser } from '../../middlewares/auth';
import * as usersService from '../users/users.service';
import { UserEntity } from '../users/data_access/user.entity';

function generateTokens(user: UserEntity) {
  // Note: permissions are resolved per-request by the auth middleware against the DB
  // (with an in-memory cache) to keep the access token under the browser cookie limit.
  const payload: Pick<AuthUser, 'id' | 'email' | 'roleId'> = {
    id: user.id,
    email: user.email,
    roleId: user.roleId,
  };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY as string,
  } as jwt.SignOptions);

  const refreshToken = jwt.sign({ id: user.id }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY as string,
  } as jwt.SignOptions);

  return { accessToken, refreshToken };
}

export async function login(email: string, password: string) {
  const user = await usersService.findByEmailWithPassword(email);
  console.log(user)
  if (!user) throw new UnauthorizedError('Credenciales inválidas');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new UnauthorizedError('Credenciales inválidas');

  if (user.status !== 'active') {
    throw new UnauthorizedError('La cuenta no está activa');
  }

  const tokens = generateTokens(user);

  await usersService.updateLastLogin(user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      roleId: user.roleId,
    },
    ...tokens,
  };
}

export async function refreshToken(token: string) {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: string };
    const user = await usersService.findByEmailWithPassword(
      (await usersService.findById(decoded.id)).email,
    );

    if (!user || user.status !== 'active') {
      throw new UnauthorizedError('Token de refresco inválido');
    }

    const tokens = generateTokens(user);
    return tokens;
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError('Token de refresco inválido o expirado');
  }
}
