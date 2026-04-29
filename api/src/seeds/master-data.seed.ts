import { AppDataSource } from '../config/data-source';
import { TaxEntity } from '../modules/taxes/data_access/tax.entity';
import { InvoiceTypeEntity } from '../modules/invoice-types/data_access/invoice-type.entity';
import { PaymentConditionEntity } from '../modules/payment-conditions/data_access/payment-condition.entity';
import { CategoryEntity } from '../modules/categories/data_access/category.entity';
import { UnitEntity } from '../modules/units/data_access/unit.entity';
import { CashboxEntity } from '../modules/cashbox/data_access/cashbox.entity';
import { PaymentMethodEntity } from '../modules/payment-methods/data_access/payment-method.entity';
import { SalesZoneEntity } from '../modules/sales-zones/data_access/sales-zone.entity';
import { RouteEntity } from '../modules/routes/data_access/route.entity';
import { WarehouseLocationEntity } from '../modules/warehouse-locations/data_access/warehouse-location.entity';
import { JurisdictionEntity } from '../modules/jurisdictions/data_access/jurisdiction.entity';

export async function seedMasterData() {
  // Taxes
  const taxRepo = AppDataSource.getRepository(TaxEntity);
  const taxes = [
    { name: 'IVA 21%', rate: 21, isDefault: true },
    { name: 'IVA 10.5%', rate: 10.5, isDefault: false },
    { name: 'Exento', rate: 0, isDefault: false },
  ];
  for (const tax of taxes) {
    const existing = await taxRepo.findOneBy({ name: tax.name });
    if (!existing) await taxRepo.save(taxRepo.create(tax));
  }

  // Invoice types
  const itRepo = AppDataSource.getRepository(InvoiceTypeEntity);
  const invoiceTypes = [
    { name: 'Factura A', code: 'FA' },
    { name: 'Factura B', code: 'FB' },
    { name: 'Nota de Credito A', code: 'NCA' },
    { name: 'Nota de Credito B', code: 'NCB' },
  ];
  for (const it of invoiceTypes) {
    const existing = await itRepo.findOneBy({ code: it.code });
    if (!existing) await itRepo.save(itRepo.create(it));
  }

  // Payment conditions
  const pcRepo = AppDataSource.getRepository(PaymentConditionEntity);
  const conditions = [
    { name: 'Contado', days: 0 },
    { name: '30 dias', days: 30 },
    { name: '60 dias', days: 60 },
  ];
  for (const pc of conditions) {
    const existing = await pcRepo.findOneBy({ name: pc.name });
    if (!existing) await pcRepo.save(pcRepo.create(pc));
  }

  // Default categories
  const catRepo = AppDataSource.getRepository(CategoryEntity);
  const categories = ['General', 'Bebidas', 'Alimentos', 'Limpieza'];
  for (const name of categories) {
    const existing = await catRepo.findOneBy({ name });
    if (!existing) await catRepo.save(catRepo.create({ name }));
  }

  // Default units — retail-friendly set so dropdowns no rompan en cualquier seed.
  const unitRepo = AppDataSource.getRepository(UnitEntity);
  const units = [
    { name: 'Unidad',     abbreviation: 'un',  type: 'count'  },
    { name: 'Kilogramo',  abbreviation: 'kg',  type: 'weight' },
    { name: 'Gramo',      abbreviation: 'gr',  type: 'weight' },
    { name: 'Litro',      abbreviation: 'lt',  type: 'volume' },
    { name: 'Mililitro',  abbreviation: 'ml',  type: 'volume' },
    { name: 'Metro',      abbreviation: 'm',   type: 'length' },
    { name: 'Centímetro', abbreviation: 'cm',  type: 'length' },
    { name: 'Metro²',     abbreviation: 'm2',  type: 'area'   },
    { name: 'Metro³',     abbreviation: 'm3',  type: 'volume' },
    { name: 'Caja',       abbreviation: 'cj',  type: 'count'  },
    { name: 'Paquete',    abbreviation: 'pq',  type: 'count'  },
    { name: 'Bolsa',      abbreviation: 'bls', type: 'count'  },
    { name: 'Atado',      abbreviation: 'ato', type: 'count'  },
    { name: 'Par',        abbreviation: 'par', type: 'count'  },
    { name: 'Juego',      abbreviation: 'jgo', type: 'count'  },
    { name: 'Rollo',      abbreviation: 'rol', type: 'count'  },
  ];
  for (const unit of units) {
    const existing = await unitRepo.findOneBy({ abbreviation: unit.abbreviation });
    if (!existing) await unitRepo.save(unitRepo.create(unit));
  }

  // Payment methods
  const pmRepo = AppDataSource.getRepository(PaymentMethodEntity);
  const paymentMethods = [
    { name: 'Efectivo', code: 'cash', description: 'Pago en efectivo' },
    { name: 'Transferencia', code: 'transfer', description: 'Transferencia bancaria' },
    { name: 'Tarjeta', code: 'card', description: 'Tarjeta de crédito o débito' },
    { name: 'Cheque', code: 'check', description: 'Cheque bancario' },
    { name: 'Otro', code: 'other', description: 'Otro método de pago' },
  ];
  for (const pm of paymentMethods) {
    const existing = await pmRepo.findOneBy({ code: pm.code });
    if (!existing) await pmRepo.save(pmRepo.create(pm));
  }

  // Default cashboxes
  const cashboxRepo = AppDataSource.getRepository(CashboxEntity);
  const existingCashbox = await cashboxRepo.findOne({ where: {} });
  if (!existingCashbox) {
    const branchRepo = AppDataSource.getRepository('BranchEntity');
    const branch = await branchRepo.findOne({ where: {} });
    if (branch) {
      const cajas = [
        { name: 'Caja Principal', status: 'closed' },
        { name: 'Caja Mostrador', status: 'closed' },
        { name: 'Caja Chica', status: 'closed' },
      ];
      for (const c of cajas) {
        await cashboxRepo.save(cashboxRepo.create({
          branchId: (branch as any).id,
          name: c.name,
          status: c.status,
        }));
      }
    }
  }

  // Sales zones — remove old placeholder rows before creating real ones
  const zoneRepo = AppDataSource.getRepository(SalesZoneEntity);
  const routeRepo = AppDataSource.getRepository(RouteEntity);
  await routeRepo.delete({ code: 'R-DEFAULT' } as any);
  const oldZone = await zoneRepo.findOneBy({ code: 'Z-DEFAULT' } as any);
  if (oldZone) await zoneRepo.delete({ code: 'Z-DEFAULT' } as any);

  const zoneDefs = [
    { code: 'Z-GBA-NORTE', name: 'GBA Norte' },
    { code: 'Z-GBA-SUR', name: 'GBA Sur' },
    { code: 'Z-GBA-OESTE', name: 'GBA Oeste' },
    { code: 'Z-CABA', name: 'CABA' },
  ];
  const zones: SalesZoneEntity[] = [];
  for (const z of zoneDefs) {
    let zone = await zoneRepo.findOneBy({ code: z.code });
    if (!zone) zone = await zoneRepo.save(zoneRepo.create({ ...z, status: 'active' }));
    zones.push(zone);
  }
  const defaultZone = zones[0];

  // Routes
  const routeDefs = [
    { code: 'R-01', name: 'Ruta Lunes — GBA Norte A', zone: zones[0], frequency: 'weekly' },
    { code: 'R-02', name: 'Ruta Martes — GBA Norte B', zone: zones[0], frequency: 'weekly' },
    { code: 'R-03', name: 'Ruta Miércoles — GBA Sur', zone: zones[1], frequency: 'weekly' },
    { code: 'R-04', name: 'Ruta Jueves — GBA Oeste', zone: zones[2], frequency: 'weekly' },
    { code: 'R-05', name: 'Ruta Viernes — CABA', zone: zones[3], frequency: 'weekly' },
  ];
  for (const r of routeDefs) {
    const existing = await routeRepo.findOneBy({ code: r.code });
    if (!existing) {
      await routeRepo.save(routeRepo.create({
        code: r.code,
        name: r.name,
        zoneId: r.zone.id,
        frequency: r.frequency,
        status: 'active',
      }));
    }
  }

  // AR jurisdictions (Phase 5)
  const jurisdictionRepo = AppDataSource.getRepository(JurisdictionEntity);
  const arProvinces: Array<{ code: string; name: string; kind: string }> = [
    { code: 'AR', name: 'Argentina', kind: 'national' },
    { code: 'AR-C', name: 'Ciudad Autónoma de Buenos Aires', kind: 'provincial' },
    { code: 'AR-B', name: 'Buenos Aires', kind: 'provincial' },
    { code: 'AR-K', name: 'Catamarca', kind: 'provincial' },
    { code: 'AR-H', name: 'Chaco', kind: 'provincial' },
    { code: 'AR-U', name: 'Chubut', kind: 'provincial' },
    { code: 'AR-X', name: 'Córdoba', kind: 'provincial' },
    { code: 'AR-W', name: 'Corrientes', kind: 'provincial' },
    { code: 'AR-E', name: 'Entre Ríos', kind: 'provincial' },
    { code: 'AR-P', name: 'Formosa', kind: 'provincial' },
    { code: 'AR-Y', name: 'Jujuy', kind: 'provincial' },
    { code: 'AR-L', name: 'La Pampa', kind: 'provincial' },
    { code: 'AR-F', name: 'La Rioja', kind: 'provincial' },
    { code: 'AR-M', name: 'Mendoza', kind: 'provincial' },
    { code: 'AR-N', name: 'Misiones', kind: 'provincial' },
    { code: 'AR-Q', name: 'Neuquén', kind: 'provincial' },
    { code: 'AR-R', name: 'Río Negro', kind: 'provincial' },
    { code: 'AR-A', name: 'Salta', kind: 'provincial' },
    { code: 'AR-J', name: 'San Juan', kind: 'provincial' },
    { code: 'AR-D', name: 'San Luis', kind: 'provincial' },
    { code: 'AR-Z', name: 'Santa Cruz', kind: 'provincial' },
    { code: 'AR-S', name: 'Santa Fe', kind: 'provincial' },
    { code: 'AR-G', name: 'Santiago del Estero', kind: 'provincial' },
    { code: 'AR-V', name: 'Tierra del Fuego', kind: 'provincial' },
    { code: 'AR-T', name: 'Tucumán', kind: 'provincial' },
  ];
  for (const prov of arProvinces) {
    const existing = await jurisdictionRepo.findOneBy({ code: prov.code });
    if (!existing) await jurisdictionRepo.save(jurisdictionRepo.create(prov));
  }

  // Default pick/staging/returns locations per warehouse (Phase 2 + 3)
  const warehouseRepo = AppDataSource.getRepository('WarehouseEntity');
  const locationRepo = AppDataSource.getRepository(WarehouseLocationEntity);
  const warehouses: any[] = await warehouseRepo.find();
  const defaultLocations = [
    { code: 'PICKING-A', kind: 'pick' },
    { code: 'STAGING-01', kind: 'staging' },
    { code: 'DEVOLUCIONES', kind: 'returns' },
  ];
  for (const wh of warehouses) {
    const existingCount = await locationRepo.count({ where: { warehouseId: wh.id } });
    if (existingCount > 0) continue; // skip if warehouse already has locations (e.g. from demo seed)
    for (const loc of defaultLocations) {
      await locationRepo.save(locationRepo.create({
        warehouseId: wh.id,
        code: loc.code,
        kind: loc.kind,
        status: 'active',
      }));
    }
  }
}
