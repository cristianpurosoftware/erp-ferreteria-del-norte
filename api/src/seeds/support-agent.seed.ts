import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../config/data-source';
import { UserEntity } from '../modules/users/data_access/user.entity';
import { RoleEntity } from '../modules/roles/data_access/role.entity';
import { env } from '../config/env';

/**
 * Seeds the lone user that owns the `support` role — the automated
 * support agent. Credentials come from env so each client can rotate
 * them independently without editing code:
 *
 *   AGENT_SUPPORT_EMAIL    — login, defaults to `agent-support@<slug>.puro.software`
 *   AGENT_SUPPORT_PASSWORD — required if the user does not yet exist
 *
 * This seed is bypassed by the API guard because it writes through the
 * raw repository instead of `users.service.create`.
 */
export async function seedSupportAgent() {
  const userRepo = AppDataSource.getRepository(UserEntity);
  const roleRepo = AppDataSource.getRepository(RoleEntity);

  const supportRole = await roleRepo.findOneBy({ name: 'support' });
  if (!supportRole) {
    throw new Error('`support` role not found. Ensure seedRoles() runs first.');
  }
  if (!supportRole.supportAccess) {
    throw new Error('`support` role exists but has supportAccess=false. Check seedRoles().');
  }

  const email = env.AGENT_SUPPORT_EMAIL;
  const existing = await userRepo.findOneBy({ email });
  if (existing) {
    // Keep the agent locked to the support role in case of drift.
    if (existing.roleId !== supportRole.id) {
      existing.roleId = supportRole.id;
      await userRepo.save(existing);
    }
    return;
  }

  if (!env.AGENT_SUPPORT_PASSWORD) {
    // Non-fatal so local devs without the Hermes integration can still
    // spin up a fresh DB. The role was already created, so once the
    // password is provided a subsequent seed run will create the user.
    console.warn(
      '[seed] AGENT_SUPPORT_PASSWORD not set — skipping support agent user. ' +
      'Set it (e.g. as a Fly secret) and re-run seeds to create the user.',
    );
    return;
  }

  const passwordHash = await bcrypt.hash(env.AGENT_SUPPORT_PASSWORD, 10);
  await userRepo.save(userRepo.create({
    first_name: 'Support',
    last_name: 'Agent',
    email,
    password_hash: passwordHash,
    status: 'active',
    roleId: supportRole.id,
  }));
}
