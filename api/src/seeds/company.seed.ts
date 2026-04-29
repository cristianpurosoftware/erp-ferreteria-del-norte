import { AppDataSource } from '../config/data-source';
import { CompanyEntity } from '../modules/company/data_access/company.entity';
import { BranchEntity } from '../modules/branches/data_access/branch.entity';
import { WarehouseEntity } from '../modules/warehouses/data_access/warehouse.entity';

export async function seedCompany() {
  const companyRepo = AppDataSource.getRepository(CompanyEntity);
  const branchRepo = AppDataSource.getRepository(BranchEntity);
  const warehouseRepo = AppDataSource.getRepository(WarehouseEntity);

  // Company — upsert: create on first run, update placeholder names on reruns
  let company = await companyRepo.findOne({ where: {} }) as CompanyEntity | null;
  const RAZON_SOCIAL = 'Ferretería del Norte S.R.L.';
  const NOMBRE_COMERCIAL = 'Ferretería del Norte';
  const PLACEHOLDER_RAZON = new Set(['Mi Empresa S.A.', 'Distribuidora Del Valle S.A.']);
  const PLACEHOLDER_COMERCIAL = new Set(['Mi Empresa', 'Del Valle Distribuciones']);
  if (!company) {
    company = await companyRepo.save(companyRepo.create({
      razon_social: RAZON_SOCIAL,
      nombre_comercial: NOMBRE_COMERCIAL,
      moneda_base: 'ARS',
      pais: 'AR',
      timezone: 'America/Argentina/Buenos_Aires',
    }) as CompanyEntity) as any;
  } else if (
    PLACEHOLDER_RAZON.has((company as any).razon_social) ||
    PLACEHOLDER_COMERCIAL.has((company as any).nombre_comercial)
  ) {
    await companyRepo.update((company as any).id, {
      razon_social: RAZON_SOCIAL,
      nombre_comercial: NOMBRE_COMERCIAL,
    } as any);
  }

  // Default branch — para retail, Casa Central = local del mostrador
  let branch = await branchRepo.findOneBy({ code: 'CASA-CENTRAL' }) as BranchEntity | null;
  if (!branch) {
    branch = await branchRepo.save(branchRepo.create({
      company_id: company.id,
      name: 'Casa Central',
      code: 'CASA-CENTRAL',
      status: 'active',
    }) as BranchEntity) as any;
  }

  // Default warehouses — retail mostrador necesita "Salón" (frente, donde se vende) y "Depósito" (atrás).
  const existingWh = await warehouseRepo.find({ where: { branchId: branch.id } });
  const existingNames = new Set(existingWh.map((w) => w.name));
  const defaultWarehouses = [
    { name: 'Salón', type: 'physical', status: 'active' },
    { name: 'Depósito', type: 'physical', status: 'active' },
  ];
  for (const wh of defaultWarehouses) {
    if (!existingNames.has(wh.name)) {
      await warehouseRepo.save(warehouseRepo.create({
        branchId: branch.id,
        ...wh,
      }));
    }
  }
}
