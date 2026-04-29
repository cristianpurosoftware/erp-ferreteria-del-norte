import { AppDataSource } from '../config/data-source';
import { PermissionEntity } from '../modules/permissions/data_access/permission.entity';
import { getAllPermissions } from '../modules/permissions/permissions.constants';

export async function seedPermissions() {
  const repo = AppDataSource.getRepository(PermissionEntity);
  const allPermissions = getAllPermissions();

  for (const name of allPermissions) {
    const existing = await repo.findOneBy({ name });
    if (!existing) {
      const section = name.split(':')[0];
      await repo.save(repo.create({ name, section, description: name }));
    }
  }
}
