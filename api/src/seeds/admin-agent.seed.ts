import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../config/data-source';
import { UserEntity } from '../modules/users/data_access/user.entity';
import { RoleEntity } from '../modules/roles/data_access/role.entity';
import { env } from '../config/env';

/**
 * Seeds the user that owns the `admin` role for the "admin-assistant"
 * Hermes profile — an AI assistant the human administrator talks to over
 * WhatsApp to run CRUD operations against the ERP.
 *
 *   AGENT_ADMIN_EMAIL    — login, defaults to `agent-admin@<slug>.puro.software`
 *   AGENT_ADMIN_PASSWORD — required if the user does not yet exist
 *
 * Uses the existing `admin` role (not a reserved one), so the agent has
 * full permissions just like any other admin user. No special bypass.
 */
export async function seedAdminAgent() {
  const userRepo = AppDataSource.getRepository(UserEntity);
  const roleRepo = AppDataSource.getRepository(RoleEntity);

  const adminRole = await roleRepo.findOneBy({ name: 'admin' });
  if (!adminRole) {
    throw new Error('`admin` role not found. Ensure seedRoles() runs first.');
  }

  const email = env.AGENT_ADMIN_EMAIL;
  const existing = await userRepo.findOneBy({ email });
  if (existing) {
    if (existing.roleId !== adminRole.id) {
      existing.roleId = adminRole.id;
      await userRepo.save(existing);
    }
    return;
  }

  if (!env.AGENT_ADMIN_PASSWORD) {
    console.warn(
      '[seed] AGENT_ADMIN_PASSWORD not set — skipping admin agent user. ' +
      'Set it (e.g. as a Fly secret) and re-run seeds to create the user.',
    );
    return;
  }

  const passwordHash = await bcrypt.hash(env.AGENT_ADMIN_PASSWORD, 10);
  await userRepo.save(userRepo.create({
    first_name: 'Admin',
    last_name: 'Agent',
    email,
    password_hash: passwordHash,
    status: 'active',
    roleId: adminRole.id,
  }));
}
