import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Demasiadas solicitudes, aguardá un momento.' },
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const ipKey = ipKeyGenerator(req.ip ?? '');
    const email = String(req.body?.email ?? '').toLowerCase();
    return `${ipKey}|${email}`;
  },
  message: {
    success: false,
    error: { code: 'AUTH_RATE_LIMIT_EXCEEDED', message: 'Demasiados intentos de acceso. Intentá de nuevo en 15 minutos.' },
  },
});
