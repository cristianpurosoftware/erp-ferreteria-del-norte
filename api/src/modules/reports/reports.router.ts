import { Router } from 'express';
import * as controller from './reports.controller';
import { requirePermission } from '../../middlewares/permissions';
import { PERMISSIONS } from '../permissions/permissions.constants';

const router = Router();

router.get('/sales', requirePermission(PERMISSIONS.REPORTS.VIEW), controller.salesByPeriod);
router.get('/orders-by-status', requirePermission(PERMISSIONS.REPORTS.VIEW), controller.ordersByStatus);
router.get('/critical-stock', requirePermission(PERMISSIONS.REPORTS.VIEW), controller.criticalStock);
router.get('/customer-debt', requirePermission(PERMISSIONS.REPORTS.VIEW), controller.customerDebt);
router.get('/top-products', requirePermission(PERMISSIONS.REPORTS.VIEW), controller.topProducts);
router.get('/top-customers', requirePermission(PERMISSIONS.REPORTS.VIEW), controller.topCustomers);
router.get('/gross-margin', requirePermission(PERMISSIONS.REPORTS.VIEW), controller.grossMargin);
router.get('/pending-collections', requirePermission(PERMISSIONS.REPORTS.VIEW), controller.pendingCollections);

// Phase 7 endpoints
router.get('/sales-by-seller', requirePermission(PERMISSIONS.REPORTS.VIEW), controller.salesBySeller);
router.get('/sales-by-zone', requirePermission(PERMISSIONS.REPORTS.VIEW), controller.salesByZone);
router.get('/sales-by-channel', requirePermission(PERMISSIONS.REPORTS.VIEW), controller.salesByChannel);
router.get('/profitability/by-product', requirePermission(PERMISSIONS.REPORTS.VIEW_FINANCIAL), controller.profitabilityByProduct);
router.get('/profitability/by-customer', requirePermission(PERMISSIONS.REPORTS.VIEW_FINANCIAL), controller.profitabilityByCustomer);
router.get('/stock-rotation', requirePermission(PERMISSIONS.REPORTS.VIEW_LOGISTICS), controller.stockRotation);
router.get('/logistics/on-time-delivery', requirePermission(PERMISSIONS.REPORTS.VIEW_LOGISTICS), controller.onTimeDelivery);
router.get('/logistics/fill-rate', requirePermission(PERMISSIONS.REPORTS.VIEW_LOGISTICS), controller.fillRate);
router.get('/logistics/picking-throughput', requirePermission(PERMISSIONS.REPORTS.VIEW_LOGISTICS), controller.pickingThroughput);
router.get('/aging', requirePermission(PERMISSIONS.REPORTS.VIEW_FINANCIAL), controller.aging);
router.get('/cash-flow/projection', requirePermission(PERMISSIONS.REPORTS.VIEW_FINANCIAL), controller.cashFlowProjection);
router.get('/check-portfolio', requirePermission(PERMISSIONS.REPORTS.VIEW_FINANCIAL), controller.checkPortfolio);
router.get('/returns-by-reason', requirePermission(PERMISSIONS.REPORTS.VIEW_LOGISTICS), controller.returnsByReason);
router.get('/three-way-match-discrepancies', requirePermission(PERMISSIONS.REPORTS.VIEW), controller.threeWayMatchDiscrepancies);

export default router;
