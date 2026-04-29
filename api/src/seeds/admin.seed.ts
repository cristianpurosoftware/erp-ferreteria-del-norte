import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../config/data-source';
import { UserEntity } from '../modules/users/data_access/user.entity';
import { RoleEntity } from '../modules/roles/data_access/role.entity';
import { env } from '../config/env';

export async function seedAdmin() {
  const userRepo = AppDataSource.getRepository(UserEntity);
  const roleRepo = AppDataSource.getRepository(RoleEntity);

  const existing = await userRepo.findOneBy({ email: env.ADMIN_EMAIL });
  if (existing) return;

  const adminRole = await roleRepo.findOneBy({ name: 'admin' });
  if (!adminRole) throw new Error('Admin role not found. Run role seeds first.');

  const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);

  await userRepo.save(userRepo.create({
    first_name: 'Admin',
    last_name: 'System',
    email: env.ADMIN_EMAIL,
    password_hash: passwordHash,
    status: 'active',
    roleId: adminRole.id,
  }));
}
