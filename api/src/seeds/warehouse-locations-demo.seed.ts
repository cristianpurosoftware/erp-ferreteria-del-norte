import 'reflect-metadata';
import { AppDataSource } from '../config/data-source';
import { WarehouseLocationEntity } from '../modules/warehouse-locations/data_access/warehouse-location.entity';

const SEED_TAG = 'locations-demo';

type LocationKind = 'pick' | 'bulk' | 'quarantine' | 'returns' | 'staging';

interface LocationDef {
  code: string;
  kind: LocationKind;
  aisle?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
}

interface WarehouseRow {
  id: string;
  name: string;
  type: string;
}

function pickZone(
  aisleCode: string,
  racks: number,
  shelves: number,
): LocationDef[] {
  const locs: LocationDef[] = [];
  for (let r = 1; r <= racks; r++) {
    for (let s = 1; s <= shelves; s++) {
      const rack = r.toString().padStart(2, '0');
      locs.push({
        code: `${aisleCode}-${rack}-${s}`,
        kind: 'pick',
        aisle: aisleCode,
        rack,
        shelf: s.toString(),
      });
    }
  }
  return locs;
}

function bulkZone(prefix: string, count: number): LocationDef[] {
  return Array.from({ length: count }, (_, i) => ({
    code: `${prefix}-${(i + 1).toString().padStart(2, '0')}`,
    kind: 'bulk' as LocationKind,
  }));
}

function stagingZone(count: number): LocationDef[] {
  return Array.from({ length: count }, (_, i) => ({
    code: `EST-${(i + 1).toString().padStart(2, '0')}`,
    kind: 'staging' as LocationKind,
  }));
}

function returnsZone(count: number): LocationDef[] {
  return Array.from({ length: count }, (_, i) => ({
    code: `DEV-${(i + 1).toString().padStart(2, '0')}`,
    kind: 'returns' as LocationKind,
  }));
}

function quarantineZone(count: number): LocationDef[] {
  return Array.from({ length: count }, (_, i) => ({
    code: `CUAR-${(i + 1).toString().padStart(2, '0')}`,
    kind: 'quarantine' as LocationKind,
  }));
}

function buildLocationsForWarehouse(wh: WarehouseRow): LocationDef[] {
  // Virtual warehouses: consignment / tracking only
  if (wh.type === 'virtual') {
    return [
      { code: 'CONS-A', kind: 'pick' },
      { code: 'CONS-B', kind: 'pick' },
      { code: 'CONS-TRANSITO', kind: 'staging' },
      { code: 'CONS-DEV', kind: 'returns' },
    ];
  }

  const name = wh.name.toLowerCase();

  if (name.includes('principal')) {
    return [
      ...pickZone('A', 5, 4),
      ...pickZone('B', 4, 4),
      ...pickZone('C', 3, 4),
      ...bulkZone('GEN-B', 6),
      ...stagingZone(5),
      ...returnsZone(3),
      ...quarantineZone(2),
    ];
  }

  if (name.includes('frío') || name.includes('frio')) {
    return [
      ...pickZone('FR', 3, 3),
      ...bulkZone('FRB', 3),
      ...stagingZone(2),
      ...returnsZone(1),
      ...quarantineZone(1),
    ];
  }

  if (name.includes('seco')) {
    return [
      ...pickZone('S', 4, 3),
      ...pickZone('SC', 2, 3),
      ...bulkZone('SB', 4),
      ...stagingZone(3),
      ...returnsZone(2),
      ...quarantineZone(1),
    ];
  }

  if (name.includes('express')) {
    return [
      ...pickZone('A', 3, 4),
      ...bulkZone('GEN-B', 2),
      ...stagingZone(2),
      ...returnsZone(1),
    ];
  }

  if (name.includes('sur')) {
    return [
      ...pickZone('A', 3, 3),
      ...pickZone('B', 2, 3),
      ...bulkZone('BLK', 3),
      ...stagingZone(2),
      ...returnsZone(2),
      ...quarantineZone(1),
    ];
  }

  // Fallback para cualquier otro depósito físico
  return [
    ...pickZone('A', 3, 4),
    ...bulkZone('BLK', 3),
    ...stagingZone(2),
    ...returnsZone(1),
    ...quarantineZone(1),
  ];
}

async function run() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Este script no puede ejecutarse en producción.');
    process.exit(1);
  }

  await AppDataSource.initialize();
  const locationRepo = AppDataSource.getRepository(WarehouseLocationEntity);

  // 1. Eliminar ubicaciones huérfanas (depósito eliminado)
  const orphanResult = await AppDataSource.query(`
    DELETE FROM warehouse_locations
    WHERE deleted_at IS NULL
      AND warehouse_id::text NOT IN (
        SELECT id::text FROM warehouses WHERE deleted_at IS NULL
      )
    RETURNING id
  `);
  console.log(`  Eliminadas ${orphanResult.length} ubicaciones huérfanas`);

  // 2. Eliminar ubicaciones genéricas de seeds anteriores
  const genericResult = await AppDataSource.query(`
    DELETE FROM warehouse_locations
    WHERE code IN ('PICK-DEFAULT', 'STAGING-DEFAULT', 'RETURNS-DEFAULT')
      AND deleted_at IS NULL
    RETURNING id
  `);
  console.log(`  Eliminadas ${genericResult.length} ubicaciones genéricas (DEFAULT)`);

  // 3. Eliminar ubicaciones previas de este seed (idempotencia)
  const prevSeedResult = await AppDataSource.query(`
    DELETE FROM warehouse_locations
    WHERE metadata->>'seed' = $1
    RETURNING id
  `, [SEED_TAG]);
  console.log(`  Eliminadas ${prevSeedResult.length} ubicaciones del seed anterior`);

  // 4. Obtener depósitos activos
  const warehouses: WarehouseRow[] = await AppDataSource.query(`
    SELECT id::text AS id, name, type
    FROM warehouses
    WHERE deleted_at IS NULL
    ORDER BY name
  `);
  console.log(`  Depósitos activos: ${warehouses.length}`);

  // 5. Crear ubicaciones realistas para cada depósito
  let totalCreated = 0;
  for (const wh of warehouses) {
    const defs = buildLocationsForWarehouse(wh);
    const entities = defs.map((d) =>
      locationRepo.create({
        warehouseId: wh.id,
        code: d.code,
        kind: d.kind,
        aisle: d.aisle ?? null,
        rack: d.rack ?? null,
        shelf: d.shelf ?? null,
        bin: d.bin ?? null,
        status: 'active',
        metadata: { seed: SEED_TAG },
      }),
    );
    await locationRepo.save(entities);
    totalCreated += entities.length;
    console.log(`  ${wh.name}: ${entities.length} ubicaciones`);
  }

  console.log(`\n  Total: ${totalCreated} ubicaciones creadas en ${warehouses.length} depósitos`);
  await AppDataSource.destroy();
}

run().catch((err) => {
  console.error('Error en seed de ubicaciones:', err);
  process.exit(1);
});
