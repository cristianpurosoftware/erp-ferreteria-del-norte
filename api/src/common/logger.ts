import pino from 'pino';
import { env } from '../config/env';
import { getContext } from './request-context';

const baseFields = {
  clientSlug: env.CLIENT_SLUG,
  clientName: env.CLIENT_NAME,
  appEnv: env.APP_ENV,
  ...(env.FLY_APP ? { flyApp: env.FLY_APP } : {}),
  ...(env.GIT_SHA ? { gitSha: env.GIT_SHA } : {}),
};

const logLevel = process.env.LOG_LEVEL ?? (env.isDev ? 'debug' : 'info');

type TransportTarget = {
  target: string;
  options: Record<string, unknown>;
  level: string;
};

function buildTransportTargets(): TransportTarget[] {
  const targets: TransportTarget[] = [
    env.isDev
      ? {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss' },
          level: logLevel,
        }
      : {
          target: 'pino/file',
          options: { destination: 1 },
          level: logLevel,
        },
  ];

  if (env.AXIOM_TOKEN && env.AXIOM_DATASET) {
    targets.push({
      target: '@axiomhq/pino',
      options: {
        dataset: env.AXIOM_DATASET,
        token: env.AXIOM_TOKEN,
      },
      level: 'info',
    });
  }

  return targets;
}

const transport = pino.transport({ targets: buildTransportTargets() });

const pinoLogger = pino(
  {
    level: logLevel,
    base: baseFields,
    mixin() {
      const ctx = getContext();
      if (!ctx) return {};
      return {
        requestId: ctx.requestId,
        ...(ctx.userId ? { userId: ctx.userId } : {}),
        ...(ctx.ipAddress ? { ip: ctx.ipAddress } : {}),
        ...(ctx.http ? { http: ctx.http } : {}),
      };
    },
  },
  transport,
);

type LogPayload = Record<string, unknown> | Error;

interface LogFn {
  (msg: string): void;
  (msg: string, obj: LogPayload): void;
  (obj: LogPayload): void;
  (obj: LogPayload, msg: string): void;
}

type Level = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

function makeLogFn(pinoInst: pino.Logger, level: Level): LogFn {
  const fn = pinoInst[level].bind(pinoInst) as (...args: unknown[]) => void;
  return (a: unknown, b?: unknown) => {
    if (b === undefined) {
      fn(a);
      return;
    }
    if (typeof a === 'string') {
      // preferred: msg first, obj second → pino expects (obj, msg)
      fn(b, a);
    } else {
      // legacy/pino-native: obj first, msg second
      fn(a, b);
    }
  };
}

export interface AppLogger {
  trace: LogFn;
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  fatal: LogFn;
  flush: () => void;
  child: (bindings: Record<string, unknown>) => AppLogger;
}

function wrap(pinoInst: pino.Logger): AppLogger {
  return {
    trace: makeLogFn(pinoInst, 'trace'),
    debug: makeLogFn(pinoInst, 'debug'),
    info: makeLogFn(pinoInst, 'info'),
    warn: makeLogFn(pinoInst, 'warn'),
    error: makeLogFn(pinoInst, 'error'),
    fatal: makeLogFn(pinoInst, 'fatal'),
    flush: () => pinoInst.flush(),
    child: (bindings) => wrap(pinoInst.child(bindings)),
  };
}

export const logger: AppLogger = wrap(pinoLogger);

export default logger;
