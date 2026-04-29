# ERP — Base (`erp-cliente-demo`)

## ⚠️ Contexto de trabajo — leer antes de empezar

Este repo es **la base de producto** que se está puliendo. Acá se itera rápido: dev server local, DB local (ver `api/.env` para la conexión exacta), cambios visibles al instante.

**Estrategia (decidida 2026-04-24):** ya **no** se mantiene un esquema de "template core + clientes que lo consumen con propagación". La complicación de propagar cambios al fork y la rigidez que impone no valen la pena. En su lugar:

- Este repo es la base sólida. Se mejora libremente, sin tabúes de "esto va al core vs al cliente".
- Cuando arranque un cliente nuevo, se clona este repo y ese fork **evoluciona independiente**. No hay obligación de mergear cambios futuros de la base.
- Esto es una decisión deliberada: se cambia reuso de código por flexibilidad.

**Rutas:**
- Repo activo: `/Users/macpro/Documents/work/erp-cliente-demo`
- `../purosoftware-erp-base`: snapshot histórico del viejo template. **No** editar salvo pedido explícito del usuario. Ya no es fuente de verdad viva.

---

## Qué es este repo

Base de ERP (Node.js + Express + TypeORM + PostgreSQL en el backend, Next.js App Router en el frontend). Se usa como punto de partida para cada proyecto de cliente. Una vez clonado, cada fork es un producto independiente.

## Estructura del monorepo

```
erp-base/
├── api/                  ← Backend (Node.js + Express + TypeORM + PostgreSQL)
│   └── src/
│       ├── common/       ← Core interno: base entity, event bus, helpers
│       ├── config/       ← Data source, env vars
│       ├── middlewares/  ← Auth, error handler, request context, validación
│       ├── modules/      ← Módulos de negocio (customers, orders, inventory…)
│       ├── extensions/   ← Features opt-in / integraciones por proyecto
│       ├── seeds/        ← Datos iniciales
│       └── migrations/   ← Migraciones TypeORM
│
├── frontend/             ← Frontend (Next.js App Router)
│
├── config/               ← Config general del proyecto
└── scripts/              ← Setup, migración, utilidades
```

---

## Arquitectura del código (layering interno)

El código se organiza en capas por responsabilidad, no por "qué pertenece al template vs al cliente". Todas las capas se pueden modificar libremente en este repo.

### `api/src/common/` — core interno

Primitivas transversales: `BaseEntity`, `eventBus`, state machine, errores tipados, paginación, helpers de response, logger, request context.

**Criterio:** cambios acá impactan a todo el backend. Se justifica tocarlo cuando la mejora es genérica (mejor tipado de errores, nuevo helper de paginación, etc.), no para resolver un caso puntual de un módulo. Si lo que hace falta es específico, vive en el módulo.

### `api/src/middlewares/` — cross-cutting Express

Auth, permisos, validación zod, error handler, request context. Se componen sobre los routers de cada módulo.

### `api/src/modules/` — lógica de negocio

Un módulo por dominio (customers, products, orders, inventory, accounts, payments, etc.). Cada uno con entity / controller / service / router / schema / events. Esta es la zona donde se escribe la mayor parte del código.

### `api/src/extensions/` — features opt-in e integraciones

Listeners que reaccionan a eventos de los módulos, integraciones externas, features que no hacen al core del dominio. Separado de `modules/` por claridad, no por contrato de propagación.

**Criterio para decidir `modules/` vs `extensions/`:**
- Si es lógica central del dominio → `modules/`.
- Si es un side-effect que reacciona a un evento (email, webhook, sync externo) → `extensions/` con listener.
- Si es una integración completa (MercadoLibre, WhatsApp, AFIP) → `extensions/` con su propio submódulo.

### `api/src/config/` + `config/` — configuración

Data source TypeORM, env vars, flags de runtime. Se ajusta por entorno (dev/staging/prod).

---

## Cuándo usar metadata JSONB vs columna real

`BaseEntity` expone un campo `metadata` JSONB nullable. Para decidir:

- **Usar `metadata`** si el campo es accesorio, no se filtra/ordena por él a escala, y puede cambiar con frecuencia. Evita migraciones.
- **Agregar columna real** si se consulta/indexa por el campo, o si el tipo necesita validación a nivel DB.

No hay regla dura. Default: arrancar en `metadata`, promover a columna cuando haya presión real.

---

## Convenciones de desarrollo

### Estructura de cada módulo en `api/src/modules/`

```
module-name/
├── data_access/
│   └── module-name.entity.ts     ← entidad TypeORM (hereda de BaseEntity)
├── module-name.controller.ts     ← handlers de request/response
├── module-name.service.ts        ← lógica de negocio
├── module-name.router.ts         ← registro de rutas Express
├── module-name.schema.ts         ← validación con zod
├── module-name.events.ts         ← constantes de eventos del módulo
└── module-name.listeners.ts      ← listeners de eventos (si aplica)
```

### Naming

- Entidades: PascalCase singular (`Customer`, `Order`, `StockMovement`)
- Tablas: snake_case plural (`customers`, `orders`, `stock_movements`)
- Endpoints: kebab-case plural (`/customers`, `/orders`, `/stock-movements`)
- Archivos: kebab-case (`customer.entity.ts`, `stock-movement.service.ts`)
- Eventos: dot notation (`order.confirmed`, `inventory.movement.created`)
- Estados: snake_case (`pending_confirmation`, `stock_reserved`)
- Propiedades en entities: camelCase en TS, snake_case en DB con `{ name: 'column_name' }`

### Entidad base

Toda entidad hereda de `BaseEntity` (`api/src/common/base.entity.ts`):
- `id` — UUID autogenerado
- `createdAt` / `updatedAt` / `deletedAt` — timestamps automáticos
- `metadata` — JSONB nullable para campos accesorios sin migración (ver sección "Cuándo usar metadata JSONB vs columna real")

### Eventos

Toda acción de negocio debe emitir un evento via `eventBus.emit()`:

```typescript
import eventBus from '../../common/event-bus';
import { OrderEvents } from './orders.events';

// en el service, después de persistir
const saved = await orderRepo().save(order);
eventBus.emit(OrderEvents.CREATED, saved);
```

Los eventos se definen como constantes en `*.events.ts`:

```typescript
export const OrderEvents = {
  CREATED: 'order.created',
  CONFIRMED: 'order.confirmed',
  CANCELLED: 'order.cancelled',
} as const;
```

Si un módulo no emite eventos, los listeners en `extensions/` no pueden engancharse y cualquier side-effect termina metido en el service. Emitir eventos no es opcional.

### State machines

Los workflows con estados usan `assertTransition()` de `api/src/common/state-machine.ts`:

```typescript
const TRANSITIONS: TransitionMap<string> = {
  draft: ['pending_confirmation', 'cancelled'],
  pending_confirmation: ['confirmed', 'rejected'],
  // ...
};

assertTransition(TRANSITIONS, order.status, newStatus, 'order');
```

### Respuestas de API

Formato consistente para todas las respuestas:

```json
// Éxito
{ "success": true, "data": { ... }, "meta": { "page": 1, "limit": 20, "total": 150 } }

// Error
{ "success": false, "error": { "code": "ORDER_ALREADY_CONFIRMED", "message": "..." } }
```

### Permisos

Cada endpoint se protege con el middleware de permisos. Los permisos son combinación de `recurso:acción` (ej: `orders:create`, `customers:read`).

### Migraciones

- Se generan con TypeORM CLI
- Se versionan en el repo
- Se corren al inicio del deploy

---

## Stack

- **Backend:** Node.js + Express + TypeORM + PostgreSQL
- **Frontend:** Next.js (App Router)
- **Auth:** JWT + bcrypt
- **Validación:** zod
- **Eventos:** EventEmitter nativo de Node.js
- **Infra:** un VPS Hetzner por cliente con Coolify orquestando 4 servicios containerizados (api, frontend, postgres, redis). Auto-deploy desde GitHub: `dev` → staging, `main` → producción. Detalle completo en [docs/infra.md](./docs/infra.md).
- **Secrets:** env vars cargadas en la UI de Coolify (se inyectan al container; no hay `.env` con valores reales versionado)
- **Logs:** stdout de cada container → Axiom via log drain del VPS

---

## Qué NO hacer

- No meter side-effects o integraciones externas en `common/` o `middlewares/` — `common/` es para primitivas genéricas, no para lógica de dominio
- No modificar un service de `modules/` si se puede resolver con un listener en `extensions/` reaccionando a un evento
- No saltear la emisión de eventos en acciones de negocio
- No crear entidades que no hereden de `BaseEntity`
- No hardcodear estados — usar la state machine
- No meter lógica de negocio en controllers — va en services
- No acoplar integraciones externas directamente a módulos — usar el framework de integraciones

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
