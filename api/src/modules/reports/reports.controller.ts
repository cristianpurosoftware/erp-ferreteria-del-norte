import { Request, Response } from 'express';
import * as service from './reports.service';
import { successResponse } from '../../common/response';

export async function salesByPeriod(req: Request, res: Response) {
  const data = await service.salesByPeriod(req.query as any);
  return successResponse(res, data);
}

export async function ordersByStatus(_req: Request, res: Response) {
  const data = await service.ordersByStatus();
  return successResponse(res, data);
}

export async function criticalStock(req: Request, res: Response) {
  const data = await service.criticalStock(req.query.warehouseId as string);
  return successResponse(res, data);
}

export async function customerDebt(req: Request, res: Response) {
  const limit = parseInt(req.query.limit as string) || 20;
  const data = await service.customerDebt(limit);
  return successResponse(res, data);
}

export async function topProducts(req: Request, res: Response) {
  const limit = parseInt(req.query.limit as string) || 10;
  const data = await service.topProducts(req.query as any, limit);
  return successResponse(res, data);
}

export async function topCustomers(req: Request, res: Response) {
  const limit = parseInt(req.query.limit as string) || 10;
  const data = await service.topCustomers(req.query as any, limit);
  return successResponse(res, data);
}

export async function grossMargin(req: Request, res: Response) {
  const data = await service.grossMargin(req.query as any);
  return successResponse(res, data);
}

export async function pendingCollections(_req: Request, res: Response) {
  const data = await service.pendingCollections();
  return successResponse(res, data);
}

// Phase 7 additions

export async function salesBySeller(req: Request, res: Response) {
  return successResponse(res, await service.salesBySeller(req.query as any));
}

export async function salesByZone(req: Request, res: Response) {
  return successResponse(res, await service.salesByZone(req.query as any));
}

export async function salesByChannel(req: Request, res: Response) {
  return successResponse(res, await service.salesByChannel(req.query as any));
}

export async function profitabilityByProduct(req: Request, res: Response) {
  return successResponse(res, await service.profitabilityByProduct(req.query as any));
}

export async function profitabilityByCustomer(req: Request, res: Response) {
  return successResponse(res, await service.profitabilityByCustomer(req.query as any));
}

export async function stockRotation(req: Request, res: Response) {
  const period = Number(req.query.period ?? 30);
  return successResponse(res, await service.stockRotation(period, req.query.warehouseId as string | undefined));
}

export async function onTimeDelivery(req: Request, res: Response) {
  return successResponse(res, await service.onTimeDelivery(req.query as any));
}

export async function fillRate(req: Request, res: Response) {
  return successResponse(res, await service.fillRate(req.query as any));
}

export async function pickingThroughput(req: Request, res: Response) {
  return successResponse(res, await service.pickingThroughput(req.query as any));
}

export async function aging(req: Request, res: Response) {
  const buckets = (req.query.buckets as string | undefined)
    ? (req.query.buckets as string).split(',').map((s) => Number(s.split('-')[1] ?? s)).filter(Boolean)
    : [30, 60, 90];
  return successResponse(res, await service.aging(buckets, req.query.asOf as string | undefined));
}

export async function cashFlowProjection(req: Request, res: Response) {
  const weeks = Number(req.query.weeks ?? 4);
  return successResponse(res, await service.cashFlowProjection(weeks));
}

export async function checkPortfolio(req: Request, res: Response) {
  return successResponse(res, await service.checkPortfolio(req.query.status as string | undefined));
}

export async function returnsByReason(req: Request, res: Response) {
  return successResponse(res, await service.returnsByReason(req.query as any));
}

export async function threeWayMatchDiscrepancies(req: Request, res: Response) {
  return successResponse(res, await service.threeWayMatchDiscrepancies(req.query as any));
}
