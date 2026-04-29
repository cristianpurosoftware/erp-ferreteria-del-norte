import dotenv from 'dotenv';
dotenv.config();

const asBool = (v: string | undefined, d = false) =>
  v === undefined ? d : ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  APP_ENV: process.env.APP_ENV || process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '8081', 10),

  // Client identity
  CLIENT_SLUG: process.env.CLIENT_SLUG || 'erp-base',
  CLIENT_NAME: process.env.CLIENT_NAME || 'erp-base',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Database
  DATABASE_URL: process.env.DATABASE_URL,
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASS: process.env.DB_PASS || 'postgres',
  DB_NAME: process.env.DB_NAME || 'erp_base',
  DB_SSL: asBool(process.env.DB_SSL, false),

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'change-me',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'change-me-refresh',
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',

  // Seed
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@example.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  // Automated support agent identity — seeded once, then owned by the
  // Hermes container via the query_erp_api skill.
  AGENT_SUPPORT_EMAIL: process.env.AGENT_SUPPORT_EMAIL
    || `agent-support@${process.env.CLIENT_SLUG || 'erp-base'}.puro.software`,
  AGENT_SUPPORT_PASSWORD: process.env.AGENT_SUPPORT_PASSWORD,
  // Admin assistant agent — talks to the human administrator over
  // WhatsApp via the Hermes "admin-assistant" profile. Uses the regular
  // `admin` role (not a reserved one), so it has full CRUD permissions.
  AGENT_ADMIN_EMAIL: process.env.AGENT_ADMIN_EMAIL
    || `agent-admin@${process.env.CLIENT_SLUG || 'erp-base'}.puro.software`,
  AGENT_ADMIN_PASSWORD: process.env.AGENT_ADMIN_PASSWORD,
  SEED_DEMO_DATA: process.env.SEED_DEMO_DATA === 'true',
  SEED_LARGE_DEMO: process.env.SEED_LARGE_DEMO === 'true',
  SEED_CATALOGOPRO_DEMO: process.env.SEED_CATALOGOPRO_DEMO === 'true',

  // Business config
  CASHBOX_DIFF_TOLERANCE: parseFloat(process.env.CASHBOX_DIFF_TOLERANCE || '1.00'),

  // Observability
  AXIOM_TOKEN: process.env.AXIOM_TOKEN,
  AXIOM_DATASET: process.env.AXIOM_DATASET,

  // Object storage (Tigris / S3-compatible) — used by support-ticket attachments.
  // When any of AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / BUCKET_NAME is missing,
  // the attachments feature is disabled and endpoints return a 503 with a
  // clear message.
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  AWS_ENDPOINT_URL_S3: process.env.AWS_ENDPOINT_URL_S3 || 'https://fly.storage.tigris.dev',
  AWS_REGION: process.env.AWS_REGION || 'auto',
  BUCKET_NAME: process.env.BUCKET_NAME,
  ATTACHMENT_MAX_BYTES: parseInt(process.env.ATTACHMENT_MAX_BYTES || '10485760', 10), // 10 MB

  // Hermes Agent integration (AI support dispatcher).
  HERMES_ENABLED: (process.env.HERMES_ENABLED || '').toLowerCase() === 'true',
  HERMES_API_BASE_URL: (process.env.HERMES_API_BASE_URL || '').replace(/\/+$/, ''),
  HERMES_API_KEY: process.env.HERMES_API_KEY,
  HERMES_MODEL: process.env.HERMES_MODEL || 'hermes-agent',
  HERMES_TIMEOUT_MS: parseInt(process.env.HERMES_TIMEOUT_MS || '3600000', 10), // 1 h default
  HERMES_MAX_ATTEMPTS: parseInt(process.env.HERMES_MAX_ATTEMPTS || '3', 10),

  // Runtime meta (populated by the platform)
  GIT_SHA: process.env.GIT_SHA || process.env.FLY_MACHINE_VERSION || '',
  FLY_APP: process.env.FLY_APP_NAME || '',

  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',
};
