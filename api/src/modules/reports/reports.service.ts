import { AppDataSource } from '../../config/data-source';

interface DateRange {
  from?: string;
  to?: string;
  branchId?: string;
}

export async function salesByPeriod(filters: DateRange) {
  const qb = AppDataSource.createQueryBuilder()
    .select('TO_CHAR(DATE(o.created_at), \'YYYY-MM-DD\')', 'date')
    .addSelect('COUNT(o.id)', 'count')
    .addSelect('SUM(o.total)', 'total')
    .from('orders', 'o')
    .where('o.status NOT IN (:...excluded)', { excluded: ['draft', 'cancelled', 'rejected'] });

  if (filters.from) qb.andWhere('DATE(o.created_at) >= :from', { from: filters.from });
  if (filters.to) qb.andWhere('DATE(o.created_at) <= :to', { to: filters.to });
  if (filters.branchId) qb.andWhere('o.branch_id = :branchId', { branchId: filters.branchId });

  qb.groupBy('DATE(o.created_at)').orderBy('date', 'DESC');
  return qb.getRawMany();
}

export async function ordersByStatus() {
  return AppDataSource.createQueryBuilder()
    .select('o.status', 'status')
    .addSelect('COUNT(o.id)', 'count')
    .from('orders', 'o')
    .groupBy('o.status')
    .getRawMany();
}

export async function criticalStock(warehouseId?: string) {
  const qb = AppDataSource.createQueryBuilder()
    .select('s.product_id', 'productId')
    .addSelect('s.warehouse_id', 'warehouseId')
    .addSelect('s.available_qty', 'availableQty')
    .addSelect('s.min_stock', 'minStock')
    .addSelect('p.name', 'productName')
    .addSelect('p.sku', 'productSku')
    .from('stock', 's')
    .leftJoin('products', 'p', 'p.id::text = s.product_id')
    .where('s.available_qty <= s.min_stock');

  if (warehouseId) qb.andWhere('s.warehouse_id = :warehouseId', { warehouseId });

  return qb.orderBy('s.available_qty', 'ASC').getRawMany();
}

export async function customerDebt(limit = 20) {
  return AppDataSource.createQueryBuilder()
    .select('a.entity_id', 'customerId')
    .addSelect('a.current_balance', 'balance')
    .addSelect('a.overdue_balance', 'overdueBalance')
    .addSelect("COALESCE(c.commercial_name, c.legal_name)", 'customerName')
    .from('accounts', 'a')
    .leftJoin('customers', 'c', 'c.id::text = a.entity_id')
    .where("a.entity_type = 'customer'")
    .andWhere('a.current_balance > 0')
    .orderBy('a.current_balance', 'DESC')
    .limit(limit)
    .getRawMany();
}

export async function topProducts(filters: DateRange, limit = 10) {
  const qb = AppDataSource.createQueryBuilder()
    .select('oi.product_id', 'productId')
    .addSelect('SUM(oi.quantity)', 'totalQty')
    .addSelect('SUM(oi.subtotal)', 'totalRevenue')
    .addSelect('p.name', 'productName')
    .addSelect('p.sku', 'productSku')
    .from('order_items', 'oi')
    .innerJoin('orders', 'o', 'o.id = oi.order_id')
    .innerJoin('products', 'p', 'p.id::text = oi.product_id::text')
    .where('o.status NOT IN (:...excluded)', { excluded: ['draft', 'cancelled', 'rejected'] })
    .andWhere('o.deleted_at IS NULL')
    .andWhere('oi.deleted_at IS NULL')
    .andWhere('p.deleted_at IS NULL');

  if (filters.from) qb.andWhere('DATE(o.created_at) >= :from', { from: filters.from });
  if (filters.to) qb.andWhere('DATE(o.created_at) <= :to', { to: filters.to });

  qb.groupBy('oi.product_id').addGroupBy('p.name').addGroupBy('p.sku')
    .orderBy('"totalQty"', 'DESC')
    .addOrderBy('"totalRevenue"', 'DESC')
    .limit(limit);

  const rows = await qb.getRawMany();
  return rows.map((row) => {
    const id = row.productId ?? row.productid;
    const name = row.productName ?? row.productname;
    const sku = row.productSku ?? row.productsku;
    return {
      productId: id,
      totalQty: row.totalQty ?? row.totalqty,
      totalRevenue: row.totalRevenue ?? row.totalrevenue,
      productName: name ?? sku ?? 'Producto sin nombre',
      productSku: sku ?? null,
    };
  });
}

export async function topCustomers(filters: DateRange, limit = 10) {
  const qb = AppDataSource.createQueryBuilder()
    .select('o.customer_id', 'customerId')
    .addSelect('COUNT(o.id)', 'orderCount')
    .addSelect('SUM(o.total)', 'totalSpent')
    .addSelect("COALESCE(c.commercial_name, c.legal_name)", 'customerName')
    .from('orders', 'o')
    .leftJoin('customers', 'c', 'c.id::text = o.customer_id')
    .where('o.status NOT IN (:...excluded)', { excluded: ['draft', 'cancelled', 'rejected'] });

  if (filters.from) qb.andWhere('DATE(o.created_at) >= :from', { from: filters.from });
  if (filters.to) qb.andWhere('DATE(o.created_at) <= :to', { to: filters.to });

  qb.groupBy('o.customer_id').addGroupBy("COALESCE(c.commercial_name, c.legal_name)")
    .orderBy('"totalSpent"', 'DESC').limit(limit);
  return qb.getRawMany();
}

export async function grossMargin(filters: DateRange) {
  const qb = AppDataSource.createQueryBuilder()
    .select('SUM(oi.subtotal)', 'revenue')
    .addSelect('SUM(oi.quantity * p.base_cost)', 'cost')
    .from('order_items', 'oi')
    .innerJoin('orders', 'o', 'o.id = oi.order_id')
    .innerJoin('products', 'p', 'p.id::text = oi.product_id')
    .where('o.status NOT IN (:...excluded)', { excluded: ['draft', 'cancelled', 'rejected'] });

  if (filters.from) qb.andWhere('DATE(o.created_at) >= :from', { from: filters.from });
  if (filters.to) qb.andWhere('DATE(o.created_at) <= :to', { to: filters.to });

  const result = await qb.getRawOne();
  const revenue = Number(result?.revenue ?? 0);
  const cost = Number(result?.cost ?? 0);
  return {
    revenue,
    cost,
    margin: revenue > 0 ? Math.round(((revenue - cost) / revenue) * 100) : 0,
  };
}

export async function pendingCollections() {
  return AppDataSource.createQueryBuilder()
    .select('ae.account_id', 'accountId')
    .addSelect('ae.concept', 'concept')
    .addSelect('ae.amount', 'amount')
    .addSelect('ae.date', 'date')
    .addSelect('ae.status', 'status')
    .from('account_entries', 'ae')
    .where("ae.type = 'debit'")
    .andWhere("ae.status IN ('pending', 'overdue')")
    .orderBy('ae.date', 'ASC')
    .getRawMany();
}

// Phase 7 additions

function applyDateRange(qb: any, filters: DateRange, dateExpr = 'DATE(o.created_at)') {
  if (filters.from) qb.andWhere(`${dateExpr} >= :from`, { from: filters.from });
  if (filters.to) qb.andWhere(`${dateExpr} <= :to`, { to: filters.to });
}

export async function salesBySeller(filters: DateRange & { sellerId?: string }) {
  const qb = AppDataSource.createQueryBuilder()
    .select('o.seller_id', 'sellerId')
    .addSelect("CONCAT(u.first_name, ' ', u.last_name)", 'sellerName')
    .addSelect('COUNT(o.id)', 'orderCount')
    .addSelect('SUM(o.total)', 'totalRevenue')
    .from('orders', 'o')
    .leftJoin('users', 'u', 'u.id::text = o.seller_id')
    .where('o.status NOT IN (:...excluded)', { excluded: ['draft', 'cancelled', 'rejected'] });
  applyDateRange(qb, filters);
  if (filters.sellerId) qb.andWhere('o.seller_id = :sellerId', { sellerId: filters.sellerId });
  qb.groupBy('o.seller_id').addGroupBy("CONCAT(u.first_name, ' ', u.last_name)");
  qb.orderBy('"totalRevenue"', 'DESC');
  return qb.getRawMany();
}

export async function salesByZone(filters: DateRange & { zoneId?: string }) {
  // ::text cast on both sides guards against uuid-vs-text type mismatches
  // that silently drop the JOIN in some environments.
  const qb = AppDataSource.createQueryBuilder()
    .select('o.zone_id', 'zoneId')
    .addSelect('z.name', 'zoneName')
    .addSelect('COUNT(o.id)', 'orderCount')
    .addSelect('SUM(o.total)', 'totalRevenue')
    .from('orders', 'o')
    .leftJoin('sales_zones', 'z', 'z.id::text = o.zone_id::text')
    .where('o.status NOT IN (:...excluded)', { excluded: ['draft', 'cancelled', 'rejected'] });
  applyDateRange(qb, filters);
  if (filters.zoneId) qb.andWhere('o.zone_id = :zoneId', { zoneId: filters.zoneId });
  qb.groupBy('o.zone_id').addGroupBy('z.name');
  qb.orderBy('"totalRevenue"', 'DESC');
  return qb.getRawMany();
}

export async function salesByChannel(filters: DateRange) {
  const qb = AppDataSource.createQueryBuilder()
    .select('o.channel', 'channel')
    .addSelect('COUNT(o.id)', 'orderCount')
    .addSelect('SUM(o.total)', 'totalRevenue')
    .from('orders', 'o')
    .where('o.status NOT IN (:...excluded)', { excluded: ['draft', 'cancelled', 'rejected'] });
  applyDateRange(qb, filters);
  qb.groupBy('o.channel');
  qb.orderBy('"totalRevenue"', 'DESC');
  return qb.getRawMany();
}

export async function profitabilityByProduct(filters: DateRange) {
  const qb = AppDataSource.createQueryBuilder()
    .select('oi.product_id', 'productId')
    .addSelect('p.name', 'productName')
    .addSelect('p.sku', 'productSku')
    .addSelect('SUM(oi.subtotal)', 'revenue')
    .addSelect('SUM(oi.quantity * p.base_cost)', 'cost')
    .addSelect('SUM(oi.subtotal - oi.quantity * p.base_cost)', 'margin')
    .from('order_items', 'oi')
    .innerJoin('orders', 'o', 'o.id = oi.order_id')
    .innerJoin('products', 'p', 'p.id::text = oi.product_id')
    .where('o.status NOT IN (:...excluded)', { excluded: ['draft', 'cancelled', 'rejected'] });
  applyDateRange(qb, filters);
  qb.groupBy('oi.product_id').addGroupBy('p.name').addGroupBy('p.sku');
  qb.orderBy('"margin"', 'DESC');
  return qb.getRawMany();
}

export async function profitabilityByCustomer(filters: DateRange) {
  const qb = AppDataSource.createQueryBuilder()
    .select('o.customer_id', 'customerId')
    .addSelect("COALESCE(c.commercial_name, c.legal_name)", 'customerName')
    .addSelect('SUM(oi.subtotal)', 'revenue')
    .addSelect('SUM(oi.quantity * p.base_cost)', 'cost')
    .addSelect('SUM(oi.subtotal - oi.quantity * p.base_cost)', 'margin')
    .from('order_items', 'oi')
    .innerJoin('orders', 'o', 'o.id = oi.order_id')
    .innerJoin('products', 'p', 'p.id::text = oi.product_id')
    .leftJoin('customers', 'c', 'c.id::text = o.customer_id')
    .where('o.status NOT IN (:...excluded)', { excluded: ['draft', 'cancelled', 'rejected'] });
  applyDateRange(qb, filters);
  qb.groupBy('o.customer_id').addGroupBy("COALESCE(c.commercial_name, c.legal_name)");
  qb.orderBy('"margin"', 'DESC');
  return qb.getRawMany();
}

export async function stockRotation(days: number, warehouseId?: string) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();
  const qb = AppDataSource.createQueryBuilder()
    .select('m.product_id', 'productId')
    .addSelect('p.name', 'productName')
    .addSelect('p.sku', 'productSku')
    .addSelect("SUM(CASE WHEN m.type = 'outbound' OR m.type = 'reservation' THEN m.quantity ELSE 0 END)", 'outQty')
    .addSelect("SUM(CASE WHEN m.type = 'inbound' OR m.type = 'return' THEN m.quantity ELSE 0 END)", 'inQty')
    .from('stock_movements', 'm')
    .leftJoin('products', 'p', 'p.id::text = m.product_id::text')
    .where('m.date >= :since', { since: sinceStr });
  if (warehouseId) qb.andWhere('(m.source_warehouse_id = :w OR m.dest_warehouse_id = :w)', { w: warehouseId });
  qb.groupBy('m.product_id').addGroupBy('p.name').addGroupBy('p.sku');
  qb.orderBy('"outQty"', 'DESC');
  return qb.getRawMany();
}

export async function onTimeDelivery(filters: DateRange) {
  const qb = AppDataSource.createQueryBuilder()
    .select('COUNT(*)', 'total')
    .addSelect("SUM(CASE WHEN ss.arrived_at <= (DATE(ss.created_at) + INTERVAL '1 day')::timestamp THEN 1 ELSE 0 END)", 'onTime')
    .from('shipment_stops', 'ss')
    .where(`ss.status = 'delivered'`);
  applyDateRange(qb, filters, 'DATE(ss.departed_at)');
  const row: any = await qb.getRawOne();
  const total = Number(row?.total ?? 0);
  const onTime = Number(row?.onTime ?? 0);
  return { total, onTime, pct: total > 0 ? Math.round((onTime * 100) / total) : 0 };
}

export async function fillRate(filters: DateRange) {
  const qb = AppDataSource.createQueryBuilder()
    .select('SUM(pti.requested_qty)', 'requested')
    .addSelect('SUM(pti.picked_qty)', 'picked')
    .from('picking_task_items', 'pti')
    .innerJoin('picking_tasks', 'pt', 'pt.id = pti.picking_task_id')
    .where(`pt.status IN ('picked','staged','in_progress')`);
  applyDateRange(qb, filters, 'DATE(pt.created_at)');
  const row: any = await qb.getRawOne();
  const requested = Number(row?.requested ?? 0);
  const picked = Number(row?.picked ?? 0);
  return { requested, picked, pct: requested > 0 ? Math.round((picked * 100) / requested) : 0 };
}

export async function pickingThroughput(filters: DateRange & { warehouseId?: string }) {
  const qb = AppDataSource.createQueryBuilder()
    .select('COUNT(*)', 'tasksCompleted')
    .addSelect('AVG(EXTRACT(EPOCH FROM (pt.completed_at - pt.started_at)))', 'avgDurationSec')
    .from('picking_tasks', 'pt')
    .where(`pt.status IN ('picked','staged')`)
    .andWhere('pt.started_at IS NOT NULL')
    .andWhere('pt.completed_at IS NOT NULL');
  applyDateRange(qb, filters, 'DATE(pt.completed_at)');
  if (filters.warehouseId) qb.andWhere('pt.warehouse_id = :w', { w: filters.warehouseId });
  return qb.getRawOne();
}

export async function aging(buckets = [30, 60, 90], asOf?: string) {
  const today = asOf ? new Date(asOf) : new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const labels = [`0-${buckets[0]}`];
  for (let i = 0; i < buckets.length - 1; i++) labels.push(`${buckets[i] + 1}-${buckets[i + 1]}`);
  labels.push(`${buckets[buckets.length - 1] + 1}+`);

  const entries: any[] = await AppDataSource.query(
    `SELECT ae.account_id, ae.amount, ae.date,
            a.entity_id AS customer_id, COALESCE(c.commercial_name, c.legal_name) AS customer_name,
            ($1::date - ae.date::date) AS days_overdue
     FROM account_entries ae
     LEFT JOIN accounts a ON a.id = ae.account_id
     LEFT JOIN customers c ON c.id::text = a.entity_id
     WHERE ae.type = 'debit' AND ae.status IN ('pending','overdue') AND a.entity_type = 'customer'`,
    [todayStr],
  );

  const byBucket: Record<string, number> = Object.fromEntries(labels.map((l) => [l, 0]));
  const byCustomer: Record<string, { customerId: string; customerName: string; total: number; buckets: Record<string, number> }> = {};

  for (const e of entries) {
    const days = Number(e.days_overdue ?? 0);
    let label = labels[labels.length - 1];
    for (let i = 0; i < buckets.length; i++) {
      if (days <= buckets[i]) { label = labels[i]; break; }
    }
    const amt = Number(e.amount ?? 0);
    byBucket[label] += amt;
    const key = e.customer_id;
    if (!byCustomer[key]) byCustomer[key] = { customerId: key, customerName: e.customer_name, total: 0, buckets: Object.fromEntries(labels.map((l) => [l, 0])) };
    byCustomer[key].total += amt;
    byCustomer[key].buckets[label] += amt;
  }

  return { labels, byBucket, customers: Object.values(byCustomer).sort((a, b) => b.total - a.total) };
}

export async function cashFlowProjection(weeks = 4) {
  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + weeks * 7);
  const end = endDate.toISOString().slice(0, 10);
  const now = today.toISOString().slice(0, 10);

  const inflows: any[] = await AppDataSource.query(
    `SELECT DATE_TRUNC('week', due_date) AS week, SUM(amount) AS amount
     FROM checks WHERE status = 'deposited' AND due_date BETWEEN $1 AND $2
     GROUP BY 1 ORDER BY 1`,
    [now, end],
  );
  const supplierDue: any[] = await AppDataSource.query(
    `SELECT DATE_TRUNC('week', due_date) AS week, SUM(total) AS amount
     FROM supplier_invoices WHERE status IN ('approved','pending_approval','matched') AND due_date BETWEEN $1 AND $2
     GROUP BY 1 ORDER BY 1`,
    [now, end],
  );

  return { weeks, inflows, outflows: supplierDue };
}

export async function checkPortfolio(status?: string) {
  // Explicit columns (not `c.*`) so the response shape is stable and the
  // join to customers can add `customerName` alongside. `own_or_third='own'`
  // checks leave customerName null.
  const qb = AppDataSource.createQueryBuilder()
    .select('c.id', 'id')
    .addSelect('c.number', 'number')
    .addSelect('c.bank_name', 'bankName')
    .addSelect('c.account_holder', 'accountHolder')
    .addSelect('c.amount', 'amount')
    .addSelect('c.issue_date', 'issueDate')
    .addSelect('c.due_date', 'dueDate')
    .addSelect('c.status', 'status')
    .addSelect('c.kind', 'kind')
    .addSelect('c.own_or_third', 'ownOrThird')
    .addSelect('c.received_from_customer_id', 'customerId')
    .addSelect('COALESCE(cust.commercial_name, cust.legal_name)', 'customerName')
    .from('checks', 'c')
    .leftJoin('customers', 'cust', 'cust.id::text = c.received_from_customer_id::text');
  if (status) qb.where('c.status = :st', { st: status });
  else qb.where(`c.status IN ('received','in_portfolio','deposited')`);
  qb.orderBy('c.due_date', 'ASC');
  return qb.getRawMany();
}

export async function returnsByReason(filters: DateRange) {
  const qb = AppDataSource.createQueryBuilder()
    .select('r.kind', 'kind')
    .addSelect('COUNT(*)', 'count')
    .from('return_orders', 'r');
  applyDateRange(qb, filters, 'DATE(r.created_at)');
  qb.groupBy('r.kind');
  qb.orderBy('"count"', 'DESC');
  return qb.getRawMany();
}

export async function threeWayMatchDiscrepancies(filters: DateRange) {
  const qb = AppDataSource.createQueryBuilder()
    .select('tw.status', 'status')
    .addSelect('COUNT(*)', 'count')
    .from('three_way_matches', 'tw');
  applyDateRange(qb, filters, 'DATE(tw.created_at)');
  qb.groupBy('tw.status');
  return qb.getRawMany();
}
