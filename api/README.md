# API — ERP Base

Backend Node.js + Express + TypeORM + PostgreSQL. Ver [CLAUDE.md](../CLAUDE.md) en la raíz del repo para arquitectura y convenciones.

## Stack

- **Runtime:** Node.js 20+ / Express 4
- **ORM:** TypeORM
- **DB:** PostgreSQL 15+ (local o Neon)
- **Auth:** JWT + bcrypt
- **Validación:** zod
- **Logs:** pino → stdout → Axiom (via log drain del VPS)
- **Tests:** Vitest

## Quickstart

```bash
cp .env.example .env
# Editar .env — mínimo DATABASE_URL o DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME

npm install
npm run migrate:run
npm run seed
npm run dev
```

Arranca en `http://localhost:8089`.

### Postgres local

Si no tenés Postgres corriendo, opciones:

- **macOS:** `brew install postgresql@15 && brew services start postgresql@15`
- **Docker ad-hoc:** `docker run -d --name erp-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15`
- **Neon dev branch:** crear branch y pegar el `DATABASE_URL` en `.env`

Después: `createdb erp_base` (o el nombre que pongas en `DB_NAME`).

## Scripts

### Dev / Build

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor con nodemon + ts-node |
| `npm run build` | `tsc` a `build/` |
| `npm start` | Ejecuta el build |
| `npm run ts.check` | Type-check sin emitir |

### Migraciones

| Script | Qué hace |
|---|---|
| `npm run migrate:generate -- src/migrations/<Name>` | Genera migración a partir del diff entities↔DB |
| `npm run migrate:run` | Aplica migraciones pendientes (dev) |
| `npm run migrate:revert` | Revierte la última migración |
| `npm run migrate:prod` | Igual que `migrate:run` pero sobre `build/` (lo corre Coolify como pre-deploy command) |

### Seeds

| Script | Qué hace |
|---|---|
| `npm run seed` | Seed base: permisos, admin, catálogos mínimos |
| `npm run seed:permissions` | Solo permisos |
| `npm run seed:large` | Base + demo pesada (muchos clientes/productos) |
| `npm run seed:full` | Todo: base + catalogopro + large |
| `npm run seed:verify` | Verifica integridad del seed actual |
| `npm run seed:comprobantes` | Datos de prueba de comprobantes |
| `npm run seed:collector-renditions` | Rendiciones de cobrador |
| `npm run seed:locations` | Ubicaciones de depósito |
| `npm run seed:demo-branch` / `seed:cleanup-branch` | Crear / limpiar sucursal demo |

### Tests

| Script | Qué hace |
|---|---|
| `npm test` | Vitest — suite unitaria |
| `npm run test:watch` | Vitest watch |
| `npm run test:int` | Suite de integración (requiere DB levantada) |
| `npm run test:all` | Unitarias + integración |

### Utilidades

| Script | Qué hace |
|---|---|
| `npm run gen:entities` | Regenera entidades TypeORM desde DB existente |

## Estructura

```
api/src/
├── common/        ← BaseEntity, event bus, state machine, errores, paginación, logger
├── config/        ← data-source, env vars
├── middlewares/   ← auth, permisos, validación zod, error handler, request context
├── modules/       ← módulos de negocio (entity/controller/service/router/schema/events)
├── extensions/    ← listeners, integraciones externas, features opt-in
├── seeds/         ← scripts de datos iniciales
└── migrations/    ← migraciones TypeORM versionadas
```

Ver [CLAUDE.md](../CLAUDE.md) para el detalle de qué vive en cada carpeta.

## Variables de entorno clave

Ver `.env.example` para la lista completa. Las críticas:

- `DATABASE_URL` o las `DB_*` — conexión a Postgres
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — firma de tokens
- `CLIENT_SLUG` / `CLIENT_NAME` — identidad del cliente (usado en logs, dataset names)
- `FRONTEND_URL` — origen del frontend para CORS
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — credenciales creadas por el seed base

## Deploy (Coolify)

El servicio `api` está registrado en el Coolify del VPS del cliente. Build pack: Dockerfile (`api/Dockerfile`). Puerto interno: `8081`.

Auto-deploy:

- Push a `dev` → deploy a staging
- Merge a `main` → deploy a producción

Como **pre-deploy command** se configura `npm run migrate:prod`, así las migraciones del commit se aplican antes de cortar tráfico al container nuevo.

Operaciones comunes (todas desde la UI de Coolify del proyecto del cliente):

| Quiero… | En Coolify |
|---|---|
| Ver logs en vivo | tab **Logs** del servicio `api` |
| Setear/rotar un secret | tab **Environment Variables** → save → redeploy |
| Forzar redeploy | botón **Redeploy** |
| Shell en el container | tab **Terminal** |

Detalle del provisioning del VPS y la estructura por cliente: [../docs/infra.md](../docs/infra.md).
