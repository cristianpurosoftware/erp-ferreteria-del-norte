import { AppDataSource } from '../../config/data-source';

/**
 * Per-entityType SQL used by audit listing to resolve a human-friendly label
 * (e.g. order number, customer name) for a list of entity ids. Each module
 * registers its own resolver at boot — keeps audit.service decoupled from
 * the entity table layout of every module.
 *
 * The SQL must be: `SELECT id::text, <label-expr> AS label FROM <table> WHERE id::text = ANY($1)`
 */
export interface LabelResolver {
  sql: string;
}

const registry = new Map<string, LabelResolver>();

export function registerLabelResolver(entityType: string, resolver: LabelResolver) {
  registry.set(entityType, resolver);
}

export function getLabelResolver(entityType: string): LabelResolver | undefined {
  return registry.get(entityType);
}

export async function resolveLabels(
  groups: Record<string, Set<string>>,
): Promise<Record<string, string>> {
  const labels: Record<string, string> = {};
  for (const [entityType, ids] of Object.entries(groups)) {
    const resolver = registry.get(entityType);
    if (!resolver || ids.size === 0) continue;
    try {
      const rows = await AppDataSource.query(resolver.sql, [Array.from(ids)]);
      for (const row of rows) {
        labels[`${entityType}:${row.id}`] = row.label;
      }
    } catch {
      // Fall through — caller falls back to truncated id.
    }
  }
  return labels;
}

/**
 * Built-in resolvers for the core entities. Modules created in extensions can
 * call registerLabelResolver() from their own bootstrap code.
 */
export function registerBuiltInLabelResolvers() {
  registerLabelResolver('order', {
    sql: `SELECT id::text, CASE WHEN number > 0 THEN 'N' || LPAD(number::text, 5, '0') ELSE LEFT(id::text, 8) END AS label FROM orders WHERE id::text = ANY($1)`,
  });
  registerLabelResolver('customer', {
    sql: `SELECT id::text, COALESCE(commercial_name, legal_name) AS label FROM customers WHERE id::text = ANY($1)`,
  });
  registerLabelResolver('product', {
    sql: `SELECT id::text, name AS label FROM products WHERE id::text = ANY($1)`,
  });
  registerLabelResolver('user', {
    sql: `SELECT id::text, CONCAT(first_name, ' ', last_name) AS label FROM users WHERE id::text = ANY($1)`,
  });
  registerLabelResolver('payment', {
    sql: `SELECT id::text, LEFT(id::text, 8) AS label FROM payments WHERE id::text = ANY($1)`,
  });
  registerLabelResolver('invoice', {
    sql: `SELECT id::text, COALESCE(number, LEFT(id::text, 8)) AS label FROM invoices WHERE id::text = ANY($1)`,
  });
  registerLabelResolver('cashbox', {
    sql: `SELECT id::text, name AS label FROM cashbox WHERE id::text = ANY($1)`,
  });
  registerLabelResolver('stock', {
    sql: `SELECT id::text, LEFT(id::text, 8) AS label FROM stock WHERE id::text = ANY($1)`,
  });
  registerLabelResolver('supplier', {
    sql: `SELECT id::text, name AS label FROM suppliers WHERE id::text = ANY($1)`,
  });
  registerLabelResolver('credit_note', {
    sql: `SELECT id::text, COALESCE(number, LEFT(id::text, 8)) AS label FROM credit_notes WHERE id::text = ANY($1)`,
  });
  registerLabelResolver('debit_note', {
    sql: `SELECT id::text, COALESCE(number, LEFT(id::text, 8)) AS label FROM debit_notes WHERE id::text = ANY($1)`,
  });
  registerLabelResolver('supplier_invoice', {
    sql: `SELECT id::text, supplier_invoice_number AS label FROM supplier_invoices WHERE id::text = ANY($1)`,
  });
  registerLabelResolver('shipment', {
    sql: `SELECT id::text, LEFT(id::text, 8) AS label FROM shipments WHERE id::text = ANY($1)`,
  });
  registerLabelResolver('picking_task', {
    sql: `SELECT id::text, LEFT(id::text, 8) AS label FROM picking_tasks WHERE id::text = ANY($1)`,
  });
}
