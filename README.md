# ERP — Base

ERP para distribuidoras, retail y negocios comerciales. Este repo es la **base sólida** desde la que se parte para cada cliente nuevo — una vez clonado, cada fork evoluciona independiente (ver [CLAUDE.md](./CLAUDE.md) para el detalle de la estrategia).

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Node.js + Express + TypeORM + PostgreSQL |
| Frontend | Next.js 16 (App Router) + React 19 + Tailwind |
| Auth | JWT + bcrypt |
| Validación | zod |
| Eventos | EventEmitter nativo |
| Infra | VPS Hetzner por cliente con Coolify (api + frontend + postgres + redis) |
| Secrets | Env vars cargadas en Coolify (no `.env` versionado) |
| Logs | Axiom (drain desde el VPS) |

## Estructura

```
erp-cliente-demo/
├── api/          ← Backend Express + TypeORM
├── frontend/     ← Next.js App Router
├── config/       ← Config compartida del proyecto
├── CLAUDE.md     ← Guía de arquitectura y convenciones
└── AGENTS.md     ← Referencia de agentes/skills
```

## Quickstart

Pre-requisitos: Node.js 20+, PostgreSQL 15+ corriendo local (o una DB Neon a mano).

### 1. Clonar y levantar la DB

```bash
git clone <este-repo> mi-cliente
cd mi-cliente

# Crear DB local (ajustar user/pass a tu setup)
createdb erp_base
```

### 2. Backend

```bash
cd api
cp .env.example .env
# editar .env con tu DATABASE_URL o DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME

npm install
npm run migrate:run     # corre migraciones
npm run seed            # datos iniciales + usuario admin
npm run dev             # arranca en http://localhost:8089
```

Usuario admin por defecto (definido en `.env`): `admin` / `admindemo1`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env
# API_URL ya apunta a http://localhost:8089/api

npm install
npm run dev             # arranca en http://localhost:3001
```

## Documentación

- [CLAUDE.md](./CLAUDE.md) — arquitectura, convenciones, qué hacer / qué no hacer
- [AGENTS.md](./AGENTS.md) — referencia de agentes y skills del proyecto
- [docs/events.md](./docs/events.md) — catálogo de todos los eventos de dominio
- [api/README.md](./api/README.md) — detalles del backend
- [frontend/README.md](./frontend/README.md) — detalles del frontend

## Deploy

Cada cliente vive en un VPS Hetzner propio orquestado con Coolify. El push a `dev` dispara deploy automático a staging; el merge a `main`, a producción. Los secrets se cargan en la UI de Coolify (no se versionan) y los logs van a Axiom via drain.

Setup completo del VPS, Dockerfiles, scripts de alta de cliente y plan recomendado: [docs/infra.md](./docs/infra.md).
