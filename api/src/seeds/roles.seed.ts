import { AppDataSource } from '../config/data-source';
import { RoleEntity } from '../modules/roles/data_access/role.entity';
import { RolePermissionEntity } from '../modules/roles/data_access/role-permission.entity';
import { PermissionEntity } from '../modules/permissions/data_access/permission.entity';
import { PERMISSIONS } from '../modules/permissions/permissions.constants';

/**
 * Base roles shipped with the product.
 *
 * Only `admin` is a *system* role (isSystemRole=true) — locked against edits
 * and deletion, and kept in sync with every permission that exists in the
 * system on every seed run.
 *
 * The remaining five roles are editable templates: they are created once with
 * a sensible default permission set, and after that the seed respects whatever
 * the client has customised. This lets each client tune `ventas`, `gerencia`,
 * etc. without the next template update reverting their edits.
 */
const BASE_ROLES = [
  {
    name: 'admin',
    description: 'Administrador con acceso total',
    permissions: 'all',
  },
  {
    name: 'gerencia',
    description: 'Gerencia con acceso amplio',
    permissions: [
      ...Object.values(PERMISSIONS.USERS),
      ...Object.values(PERMISSIONS.ROLES),
      ...Object.values(PERMISSIONS.COMPANY),
      ...Object.values(PERMISSIONS.BRANCHES),
      ...Object.values(PERMISSIONS.CUSTOMERS),
      ...Object.values(PERMISSIONS.PRODUCTS),
      ...Object.values(PERMISSIONS.INVENTORY),
      ...Object.values(PERMISSIONS.ORDERS),
      ...Object.values(PERMISSIONS.ACCOUNTS),
      ...Object.values(PERMISSIONS.PAYMENTS),
      ...Object.values(PERMISSIONS.INVOICES),
      ...Object.values(PERMISSIONS.REPORTS),
      ...Object.values(PERMISSIONS.AUDIT),
      ...Object.values(PERMISSIONS.SETTINGS),
      ...Object.values(PERMISSIONS.SALES_ZONES),
      ...Object.values(PERMISSIONS.ROUTES),
      ...Object.values(PERMISSIONS.PROMOTIONS),
      ...Object.values(PERMISSIONS.COMMISSIONS),
      ...Object.values(PERMISSIONS.CUSTOMER_VISITS),
      ...Object.values(PERMISSIONS.WAREHOUSE_LOCATIONS),
      ...Object.values(PERMISSIONS.LOTS),
      ...Object.values(PERMISSIONS.PICKING),
      ...Object.values(PERMISSIONS.SHIPMENTS),
      ...Object.values(PERMISSIONS.VEHICLES),
      ...Object.values(PERMISSIONS.DRIVERS),
      ...Object.values(PERMISSIONS.DISPATCH_SHEETS),
      ...Object.values(PERMISSIONS.RETURNS),
      ...Object.values(PERMISSIONS.INVENTORY_COUNTS),
      ...Object.values(PERMISSIONS.SUPPLIER_INVOICES),
      ...Object.values(PERMISSIONS.SUPPLIER_DELIVERY_NOTES),
      ...Object.values(PERMISSIONS.THREE_WAY_MATCH),
      ...Object.values(PERMISSIONS.SUPPLIER_CLAIMS),
      ...Object.values(PERMISSIONS.JURISDICTIONS),
      ...Object.values(PERMISSIONS.DELIVERY_NOTES),
      ...Object.values(PERMISSIONS.CREDIT_NOTES),
      ...Object.values(PERMISSIONS.DEBIT_NOTES),
      ...Object.values(PERMISSIONS.FISCAL),
      ...Object.values(PERMISSIONS.CHECKS),
      ...Object.values(PERMISSIONS.COLLECTOR_RENDITIONS),
      ...Object.values(PERMISSIONS.BANK_ACCOUNTS),
      ...Object.values(PERMISSIONS.BANK_STATEMENTS),
      ...Object.values(PERMISSIONS.RECONCILIATION),
      ...Object.values(PERMISSIONS.WITHHOLDINGS),
      ...Object.values(PERMISSIONS.WITHHOLDING_PADRONES),
      ...Object.values(PERMISSIONS.PAYMENT_ORDERS),
      ...Object.values(PERMISSIONS.PAYMENT_BATCHES),
      ...Object.values(PERMISSIONS.TAXES),
      ...Object.values(PERMISSIONS.INVOICE_TYPES),
      ...Object.values(PERMISSIONS.PAYMENT_CONDITIONS),
      ...Object.values(PERMISSIONS.PAYMENT_METHODS),
      PERMISSIONS.SEARCH.VIEW,
    ],
  },
  {
    name: 'ventas',
    description: 'Equipo de ventas',
    permissions: [
      PERMISSIONS.CUSTOMERS.VIEW, PERMISSIONS.CUSTOMERS.CREATE, PERMISSIONS.CUSTOMERS.UPDATE,
      PERMISSIONS.PRODUCTS.VIEW,
      PERMISSIONS.INVENTORY.VIEW,
      PERMISSIONS.ORDERS.VIEW, PERMISSIONS.ORDERS.CREATE, PERMISSIONS.ORDERS.UPDATE, PERMISSIONS.ORDERS.CONFIRM,
      PERMISSIONS.ACCOUNTS.VIEW,
      PERMISSIONS.REPORTS.VIEW,
      PERMISSIONS.SALES_ZONES.VIEW,
      PERMISSIONS.ROUTES.VIEW,
      PERMISSIONS.PROMOTIONS.VIEW,
      PERMISSIONS.COMMISSIONS.VIEW,
      PERMISSIONS.CUSTOMER_VISITS.VIEW, PERMISSIONS.CUSTOMER_VISITS.CREATE,
      PERMISSIONS.SEARCH.VIEW,
    ],
  },
  {
    name: 'operaciones',
    description: 'Equipo de operaciones y logistica',
    permissions: [
      PERMISSIONS.PRODUCTS.VIEW,
      ...Object.values(PERMISSIONS.INVENTORY),
      PERMISSIONS.ORDERS.VIEW, PERMISSIONS.ORDERS.DISPATCH, PERMISSIONS.ORDERS.DELIVER,
      ...Object.values(PERMISSIONS.WAREHOUSES),
      PERMISSIONS.PURCHASES.VIEW, PERMISSIONS.PURCHASES.RECEIVE,
      ...Object.values(PERMISSIONS.WAREHOUSE_LOCATIONS),
      ...Object.values(PERMISSIONS.LOTS),
      ...Object.values(PERMISSIONS.PICKING),
      ...Object.values(PERMISSIONS.SHIPMENTS),
      ...Object.values(PERMISSIONS.VEHICLES),
      ...Object.values(PERMISSIONS.DRIVERS),
      ...Object.values(PERMISSIONS.DISPATCH_SHEETS),
      ...Object.values(PERMISSIONS.RETURNS),
      ...Object.values(PERMISSIONS.INVENTORY_COUNTS),
      PERMISSIONS.SEARCH.VIEW,
    ],
  },
  {
    name: 'administracion',
    description: 'Administracion y finanzas',
    permissions: [
      PERMISSIONS.CUSTOMERS.VIEW,
      ...Object.values(PERMISSIONS.ACCOUNTS),
      ...Object.values(PERMISSIONS.PAYMENTS),
      ...Object.values(PERMISSIONS.CASHBOX),
      ...Object.values(PERMISSIONS.INVOICES),
      ...Object.values(PERMISSIONS.REPORTS),
      ...Object.values(PERMISSIONS.SETTINGS),
      ...Object.values(PERMISSIONS.COMMISSIONS),
      ...Object.values(PERMISSIONS.SUPPLIER_INVOICES),
      ...Object.values(PERMISSIONS.SUPPLIER_DELIVERY_NOTES),
      ...Object.values(PERMISSIONS.THREE_WAY_MATCH),
      ...Object.values(PERMISSIONS.SUPPLIER_CLAIMS),
      ...Object.values(PERMISSIONS.JURISDICTIONS),
      ...Object.values(PERMISSIONS.DELIVERY_NOTES),
      ...Object.values(PERMISSIONS.CREDIT_NOTES),
      ...Object.values(PERMISSIONS.DEBIT_NOTES),
      ...Object.values(PERMISSIONS.FISCAL),
      ...Object.values(PERMISSIONS.CHECKS),
      ...Object.values(PERMISSIONS.COLLECTOR_RENDITIONS),
      ...Object.values(PERMISSIONS.BANK_ACCOUNTS),
      ...Object.values(PERMISSIONS.BANK_STATEMENTS),
      ...Object.values(PERMISSIONS.RECONCILIATION),
      ...Object.values(PERMISSIONS.WITHHOLDINGS),
      ...Object.values(PERMISSIONS.WITHHOLDING_PADRONES),
      ...Object.values(PERMISSIONS.PAYMENT_ORDERS),
      ...Object.values(PERMISSIONS.PAYMENT_BATCHES),
      ...Object.values(PERMISSIONS.TAXES),
      ...Object.values(PERMISSIONS.INVOICE_TYPES),
      ...Object.values(PERMISSIONS.PAYMENT_CONDITIONS),
      ...Object.values(PERMISSIONS.PAYMENT_METHODS),
      PERMISSIONS.SEARCH.VIEW,
    ],
  },
  {
    name: 'auditor',
    description: 'Solo lectura para auditoria',
    permissions: [
      PERMISSIONS.AUDIT.VIEW,
      PERMISSIONS.REPORTS.VIEW,
      PERMISSIONS.ORDERS.VIEW,
      PERMISSIONS.ACCOUNTS.VIEW,
      PERMISSIONS.PAYMENTS.VIEW,
      PERMISSIONS.INVENTORY.VIEW,
      PERMISSIONS.CUSTOMERS.VIEW,
      PERMISSIONS.PRODUCTS.VIEW,
      PERMISSIONS.SEARCH.VIEW,
    ],
  },
];

export async function seedRoles() {
  const roleRepo = AppDataSource.getRepository(RoleEntity);
  const rpRepo = AppDataSource.getRepository(RolePermissionEntity);
  const permRepo = AppDataSource.getRepository(PermissionEntity);

  const allPermissions = await permRepo.find();
  const permMap = new Map(allPermissions.map((p) => [p.name, p.id]));

  // Reserved role for the automated support agent. It is both a system
  // role (locked against edits and deletion) AND has `supportAccess=true`
  // which grants an automatic pass on every HTTP GET endpoint without
  // enumerating individual permissions. The users.service also rejects
  // assigning this role to any human user — it is exclusive to the
  // agent-support user seeded in support-agent.seed.ts.
  let supportRole = await roleRepo.findOneBy({ name: 'support' });
  if (!supportRole) {
    supportRole = await roleRepo.save(roleRepo.create({
      name: 'support',
      description: 'Rol reservado para el agente automatizado de soporte',
      isSystemRole: true,
      isDefault: false,
      supportAccess: true,
    }));
  } else {
    // Safety net: ensure the invariants are held even if a prior manual
    // UPDATE (or a bad migration) left the flags off.
    let dirty = false;
    if (!supportRole.isSystemRole) { supportRole.isSystemRole = true; dirty = true; }
    if (!supportRole.supportAccess) { supportRole.supportAccess = true; dirty = true; }
    if (dirty) await roleRepo.save(supportRole);
  }

  for (const roleDef of BASE_ROLES) {
    const isAdmin = roleDef.name === 'admin';
    let role = await roleRepo.findOneBy({ name: roleDef.name });
    const isNew = !role;

    if (!role) {
      role = await roleRepo.save(roleRepo.create({
        name: roleDef.name,
        description: roleDef.description,
        isSystemRole: isAdmin,
        isDefault: roleDef.name === 'ventas',
      }));
    } else if (isAdmin && !role.isSystemRole) {
      // Safety net: if a prior run (or manual UPDATE) left admin without the
      // flag, put it back — admin must always be a system role.
      role.isSystemRole = true;
      await roleRepo.save(role);
    }

    // Permission sync policy:
    //   - admin: always re-sync so new permissions added to PERMISSIONS are
    //     picked up automatically.
    //   - non-admin + newly created: seed the default permission set once.
    //   - non-admin + already existing: leave alone so client edits survive.
    if (!isAdmin && !isNew) continue;

    const permNames = roleDef.permissions === 'all'
      ? allPermissions.map((p) => p.name)
      : roleDef.permissions;

    for (const permName of permNames) {
      const permId = permMap.get(permName);
      if (!permId) continue;

      const existing = await rpRepo.findOneBy({ roleId: role.id, permissionId: permId });
      if (!existing) {
        await rpRepo.save(rpRepo.create({ roleId: role.id, permissionId: permId }));
      }
    }
  }
}
