import { Request, Response, NextFunction } from 'express';
import { runWithContext, newRequestId, RequestContext } from '../common/request-context';

export function requestContext(req: Request, res: Response, next: NextFunction) {
  const incomingTraceId = req.header('x-trace-id');
  const requestId = incomingTraceId && incomingTraceId.trim() ? incomingTraceId.trim() : newRequestId();
  res.setHeader('X-Trace-Id', requestId);

  const ctx: RequestContext = {
    userId: req.user?.id,
    userEmail: req.user?.email,
    ipAddress: req.ip,
    requestId,
    http: {
      method: req.method,
      route: req.route?.path ?? req.path,
      url: req.originalUrl,
    },
  };
  runWithContext(ctx, () => next());
}
