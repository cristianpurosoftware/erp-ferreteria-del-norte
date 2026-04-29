# ERP Base — Purosoftware

## Qué es este repo

Template base de un producto ERP multi-cliente. Se clona (fork) por cada cliente nuevo. La arquitectura está diseñada para que el core se propague a todos los clientes y las customizaciones de cada uno no rompan a los demás.

## Estructura del monorepo

```
erp-base/
├── api/                  ← Backend (Node.js + Express + TypeORM + PostgreSQL)
│   └── src/
│       ├── common/       ← ZONA 1: Core compartido
│       ├── config/       ← ZONA 4: Config de conexión/env
│       ├── middlewares/  ← ZONA 1: Core compartido
│       ├── modules/      ← ZONA 2: Módulos de negocio
│       ├── extensions/   ← ZONA 3: Customizaciones por cliente
│       ├── seeds/        ← Datos iniciales
│       └── migrations/   ← Migraciones TypeORM
│
├── frontend/             ← Frontend (Next.js App Router) — pendiente
│
├── config/               ← ZONA 4: Config general del cliente — pendiente
└── scripts/              ← Setup, migración, utilidades — pendiente
```

---

## Zonas del código y reglas de propagación

Este es el concepto más importante del repo. Todo el código pertenece a una de estas 4 zonas. Antes de escribir cualquier línea, un dev debe saber en qué zona está trabajando.

### ZONA 1 — Core (`api/src/common/`, `api/src/middlewares/`)

**Qué tiene:** base entity, event bus, state machine, errores, paginación, response helpers, auth middleware, validación, permisos, error handler.

**Regla: NUNCA se modifica por cliente.** Los updates del template se propagan siempre de forma automática y limpia.

**Cuándo tocar esta zona:** solo cuando se mejora el producto base para TODOS los clientes. Ejemplos: agregar un nuevo tipo de error, mejorar la paginación, agregar un middleware transversal.

**Cuándo NO tocar esta zona:** nunca para resolver algo específico de un cliente.

### ZONA 2 — Módulos (`api/src/modules/`)

**Qué tiene:** toda la lógica de negocio del ERP — customers, products, orders, inventory, accounts, payments, etc. Cada módulo tiene: entity, controller, service, router, schema, events.

**Regla: se puede extender por cliente si es estrictamente necesario.** Los updates del template se propagan con merge manual. Si el cliente no tocó el módulo, el merge es limpio.

**Cuándo tocar esta zona en el template:** cuando se agrega o mejora funcionalidad del producto base.

**Cuándo tocar esta zona en un repo de cliente:** solo si la lógica de negocio realmente difiere y no se puede resolver con config, metadata JSONB, o un listener en extensions. Esto es Nivel 4 de customización y debe ser la excepción.

### ZONA 3 — Extensions (`api/src/extensions/`)

**Qué tiene:** listeners custom, módulos nuevos completos, lógica específica del cliente.

**Regla: es EXCLUSIVA del cliente.** El template no la toca nunca (solo mantiene el `index.ts` vacío como punto de entrada). Nunca habrá conflictos de merge en esta zona.

**Cuándo usar:** para el 80% de las customizaciones. Si el core emite el evento correcto, la extensión se engancha sin modificar nada.

Ejemplos:
- Enviar email al depósito cuando se confirma un pedido → listener en extensions que escucha `order.confirmed`
- Módulo de turnos médicos para un cliente de salud → módulo completo en `extensions/modules/appointments/`
- Notificación por WhatsApp al despachar → listener en extensions que escucha `order.dispatched`

### ZONA 4 — Config (`api/src/config/`, `config/`)

**Qué tiene:** data source, env vars, configuración específica del cliente.

**Regla: es exclusiva del cliente.** El template tiene valores de referencia pero cada cliente los reemplaza.

---

## Niveles de customización (de menor a mayor impacto)

Ante una necesidad de un cliente, siempre elegir el nivel más bajo posible:

| Nivel | Ejemplo | Solución | Impacto en updates |
|---|---|---|---|
| 1 | Guardar `zona_reparto` en usuario | Usar campo `metadata` JSONB | Ninguno |
| 2 | Necesitar `imei` como columna real en producto | Agregar columna al entity + migración en repo del cliente | Bajo |
| 3 | Enviar email al confirmar pedido | Listener en `extensions/` | Ninguno |
| 4 | Cambiar workflow de pedidos | Modificar service del módulo en repo del cliente | Medio |
| 5 | Módulo de turnos médicos | Módulo completo en `extensions/modules/` | Ninguno |

**Si muchos clientes necesitan Nivel 4, es señal de que faltan eventos o puntos de extensión en el core.**

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
- `metadata` — JSONB nullable para extensiones por cliente sin migración

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

Si un módulo nuevo no emite eventos, las extensiones no pueden engancharse. Emitir eventos no es opcional.

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
- Migraciones del template se propagan con el merge
- Migraciones custom del cliente viven solo en su repo

---

## Stack

- **Backend:** Node.js + Express + TypeORM + PostgreSQL
- **Frontend:** Next.js (App Router) — pendiente
- **Auth:** JWT + bcrypt
- **Validación:** zod
- **Eventos:** EventEmitter nativo de Node.js
- **DB hosting:** Neon (un proyecto por cliente)
- **Backend hosting:** Railway (un servicio por cliente)
- **Frontend hosting:** Vercel (un proyecto por cliente)
- **Secrets:** Doppler
- **Logs:** Axiom

---

## Qué NO hacer

- No meter lógica específica de un cliente en `common/` o `middlewares/`
- No crear un módulo nuevo en `modules/` para algo que solo necesita un cliente — va en `extensions/modules/`
- No modificar un service de `modules/` si se puede resolver con un listener en `extensions/`
- No saltear la emisión de eventos en acciones de negocio
- No crear entidades que no hereden de `BaseEntity`
- No hardcodear estados — usar la state machine
- No meter lógica de negocio en controllers — va en services
- No acoplar integraciones externas directamente a módulos — usar el framework de integraciones


<claude-mem-context>
# Memory Context

# [purosoftware-erp-base] recent context, 2026-04-19 11:41pm GMT-3

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 50 obs (20,502t read) | 908,763t work | 98% savings

### Apr 17, 2026
282 6:28p 🔵 theme.tokens.css full architecture mapped — oklch palette, p1-p5 scale, light/dark sections
284 " 🔵 Brand colors converted to oklch — #272a45 and #38b6ff values computed
285 6:30p ✅ ERP theme.tokens.css brand colors set — #272a45 / #38b6ff / white / black
286 " ✅ theme.tokens.css fully rebased — green palette replaced with navy #272a45 / blue #38b6ff
287 " 🔵 Node.js 18.12.1 active — Next.js 16.1.5 requires >=20.9.0, build blocked
290 6:33p ✅ ERP theme.tokens.css updated with explicit brand hex values
291 6:50p ✅ ERP theme.tokens.css refined — cooler palette with navy-black sidebar and off-white backgrounds
292 6:52p 🔄 Login page de-hardcoded from green brand colors to CSS custom properties
### Apr 18, 2026
343 12:31a ⚖️ ERP tables showing record IDs instead of names — audit plan initiated
344 " 🔵 ERP frontend audit — complete inventory of raw-ID display bugs across all tables
352 12:37a 🔵 Cashbox sessions endpoint crashes — TypeORM orderBy raw column bug in findAllSessions
357 12:41a ⚖️ Hoja de ruta print feature — full domain spec defined
359 " 🔵 Hoja de ruta "Imprimir" button — current implementation only transitions status, generates no document
361 12:45a ⚖️ ERP "Hoja de Ruta" — full business requirements specification
363 " ⚖️ Hoja de Ruta print feature — V1 scope locked to printable view + current data
379 1:01a 🔴 Dashboard "Ventas últimos 30 días" chart — data order reversed
380 " 🔵 Dashboard 30-day sales chart reversed — root cause confirmed in SQL ORDER BY DESC
387 1:05a 🔵 Database seed data integrity crisis — lots and stock_movements have 100% orphan product_id references
388 1:06a 🔵 Orphan product_id in lots/stock_movements caused by mixed seed script execution — not a code bug
389 1:09a ⚖️ Orphan stock data fix strategy — surgical repair, one-time action
399 1:13a 🔵 Picking records detail — deleted products shown when clicking an order
400 1:14a 🔵 picking.service.ts findById — root cause of all items showing "Producto eliminado"
405 1:15a 🔵 Shipment stops — 100% orphan order_id references, customers intact
409 1:19a 🔵 Devoluciones page — deleted products displayed in return detail views
410 1:20a 🔵 Returns module — ALL 115 return items reference orphaned product IDs (100% missing)
411 " 🔵 Returns seed data — 0 stock_movements with reference_type='return_order'
412 " 🔵 inventory-counts.service.ts findById — same missing productName resolution as picking
413 1:21a 🔵 Picking and inventory-count detail pages need lotCode and locationCode resolution too
418 1:22a ⚖️ Inventory count recreation — new count from warehouse stock, leave original untouched
422 1:23a 🔵 purchases.service.ts findById — confirmed correct productName resolution pattern to replicate
423 1:24a 🔵 picking.service.ts already has productName resolution — fix may be implemented
425 1:28a 🔵 Comprobantes module full architecture mapped — DB health clean, service-layer findById gaps identified
426 " ⚖️ Comprobantes fix plan — dedicated seed script + eliminate horizontal tab bar
436 1:35a 🔵 Collector renditions module — 0 seed data; service findAll missing collectorName JOIN; 1351 payments have no collector_id
438 1:38a 🔵 Configuracion page — full architecture mapped with 12 settings sections
439 " 🔵 Command palette actions use ?new=1 query param strategy for create-drawer triggering
440 " 🔵 Fiscal module — full frontend architecture confirmed with jurisdicciones and autorizaciones pages
### Apr 19, 2026
565 1:20a ⚖️ ERP AI-First multi-tenant stack finalized — GitHub + Neon + Fly.io + Vercel + Axiom + Kapso
566 " 🟣 Client onboarding bash script — full automated provisioning from GitHub to Fly.io deploy
567 " ⚖️ AI-operated bug fix flow — logs → staging fix → validate → merge to prod
576 " 🔵 purosoftware-erp-base repo structure confirmed — no CI/CD, no fly.toml, no vercel.json yet
577 " 🔵 ERP API full module inventory confirmed — 60+ modules, event-driven architecture, extensions zone for WhatsApp
578 " 🔵 ERP API env.ts — CLIENT_NAME and DATABASE_URL env vars confirm multi-tenant template design
579 " 🔵 ERP API logger uses pino with CLIENT_NAME base field — structured logs ready for Axiom ingestion
580 " 🔵 Frontend stack: Next.js 16.1.5 + React 19 + Tailwind v4 — API client with auto token refresh and server-only fetch
581 1:24a ⚖️ ERP AI-First — Stack final definido para distribuidoras multi-tenant
582 " 🟣 Script de onboarding de cliente nuevo — automatización completa del setup
583 " ⚖️ Estrategia de ambientes por cliente — Neon branching + Fly.io apps separadas
588 1:25a ⚖️ ERP AI-First fase 1 — alcance reducido a solo infra, sin WhatsApp/Kapso
591 " 🔵 .gitignore excluye .agents/ — skill repo-scoped no quedará versionada sin cambio explícito

Access 909k tokens of past work via get_observations([IDs]) or mem-search skill.
</claude-mem-context>