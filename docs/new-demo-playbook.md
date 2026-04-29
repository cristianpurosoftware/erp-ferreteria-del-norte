# Playbook — Crear una demo retail nueva a partir del proyecto

Este documento describe el procedimiento para armar una **demo comercial** del ERP retail a partir de este repo base. Una demo es para mostrar el producto a un prospecto: vive online, tiene datos sembrados verosímiles del rubro, pero **no es un cliente pago** ni una instancia de producción real.

> **Distinción importante:** este playbook NO reemplaza al onboarding de cliente pago documentado en [`.agents/skills/erp-client-ops/SKILL.md`](../.agents/skills/erp-client-ops/SKILL.md). Esa skill es para clientes con VPS dedicado, staging+prod separados, frontend dockerizado en Coolify y backups serios. El playbook de demos optimiza para **velocidad y costo**, no para aislamiento ni alta disponibilidad.

> **Origen:** este playbook nació para una demo de corralón (`corralon-puro`) y fue reescrito el 2026-04-28 para soportar el caso retail (mostrador de comercio, catálogo grande, cuentas corrientes). El primer caso retail concreto que cubre es **Ferretería del Norte** (`ferreteria-del-norte`), basado en el estudio de leads retail (Jorge librería, Juan Carlos, Martin Álvarez ferretería, Carlos Forciatti repuestos, Ivan supermercado, Eduardo). El mismo seed con otras categorías cubre librería/repuestos/autoservicio.

## Demos vs onboarding de cliente pago — diferencias clave

| Dimensión | Demo (este playbook) | Cliente pago (skill `erp-client-ops`) |
|---|---|---|
| VPS Hetzner | **Compartido** con otras demos | **Dedicado** por cliente |
| Frontend host | **Vercel** (`<slug>.puroerp.com`) | **Coolify** (container junto al api) |
| Environments | Sólo **production** | **production + staging** |
| Branches que deployan | Sólo `main` | `main` → prod, `dev` → staging |
| Axiom dataset | **Compartido** entre todas las demos; filtrar por `client_slug` | **Por cliente** (`erp-<slug>`) |
| Backups Postgres | Manual (`pg_dump` ad hoc) | Configurado en el `postgres` service |
| QA pre-deploy | 100% en local antes de pushear | Push a `dev` → smoke en staging → merge a `main` |
| Alcance funcional | Showcase con seeds + UI; features faltantes simuladas en datos | MVP/producto real, features se construyen |

Si en algún momento una demo se convierte en cliente pago, hay que migrar la topología siguiendo el playbook de la skill (provisionar VPS dedicado, separar staging, dockerizar el frontend en Coolify, dataset Axiom propio, backups). El repo no cambia — sólo la infra alrededor.

## Cliente arquetipo retail (a quién le mostramos esto)

Combinando los 6 leads retail relevados sale un perfil consistente:

> "Comercio con mostrador, dueño-operador o 1-2 cajeros, catálogo grande (5k–20k SKUs), hoy con Excel mensual o sistema gratuito que no factura."

Casos cubiertos por la misma base con cambio de seed:
- **Ferretería** (Martin Álvarez, Ferretería del Norte) — caso ancla de este playbook.
- **Librería** (Jorge ~20k artículos, Juan Carlos) — máxima exigencia de catálogo.
- **Repuestos** (Carlos Forciatti) — viene de Excel actualizado mensual.
- **Supermercado / autoservicio** (Ivan) — alta rotación, scanner crítico.
- **Comercio general con cuentas corrientes** (Eduardo).

## Funcionalidades core que el prospecto retail espera ver

Estas son las 7 áreas que tienen que estar funcionando o seedeadas en la demo. La columna "Estado en repo" combina la auditoría de módulos con la cobertura real:

| # | Área | Lo que el prospecto espera ver | Estado en repo |
|---|---|---|---|
| 1 | **POS / Mostrador** | Scanner de barras, búsqueda por SKU/nombre, carrito con descuento línea/total, cliente fast = consumidor final o cliente con cta cte, múltiples medios de pago, apertura/cierre de caja con arqueo, impresión de ticket | ❌ **GAP**. No existe módulo `pos`. Hay `cashbox` + `orders` pero no flow de mostrador. **Decisión bloqueante (ver Fase 0).** |
| 2 | **Catálogo de productos** | Categorías + subcategorías, variantes (talle/medida), listas de precio (público/mayorista/especial), costo+margen+precio venta, **import masivo Excel** | ✅ Catálogo, variantes (`ProductVariantEntity`), listas múltiples. ❌ Import Excel runtime UI no existe — pre-bake CSV→JSON build-time (patrón `catalogopro-demo.seed`). |
| 3 | **Stock** | Descuento auto por venta, alerta stock mínimo, movimientos tipificados, ajustes manuales, multi-depósito opcional | ✅ Stock multi-depo, movimientos, reservas. ⚠️ Verificar si las **alertas de stock mínimo** tienen UI/listener o sólo campo. |
| 4 | **Facturación AFIP / ARCA** | Factura A/B/C, notas de crédito y débito, envío por email, conector AFIP "listo" | ✅ Framework completo (`fiscal-authorizations`, listeners en `invoices`, Phase5FiscalAR). ⚠️ **WSFE real no garantizado** — para demo, CAE simulado con disclaimer. **Decisión bloqueante (ver Fase 0).** |
| 5 | **Cuentas corrientes** | Saldo cliente y proveedor, pagos parciales aplicados a comprobantes, estado de cuenta exportable, alerta morosidad | ✅ `accounts` con `creditLimit`, `currentBalance`, `overdueBalance`, `blockOnOverdue`. |
| 6 | **Compras a proveedores** | OC, recepción con actualización de costos, cuenta corriente del proveedor | ✅ `purchases` + `supplier-delivery-notes` + `supplier-invoices` + `three-way-match`. |
| 7 | **Reportes simples** | Ventas día/mes, productos más vendidos, sin rotación, stock crítico, **export Excel para contadora** | ⚠️ Datos están; verificar qué reportes tiene el módulo `reports/` empaquetados como endpoint vs. sólo tablas crudas. |

## Decisiones por demo (a confirmar antes de empezar)

Antes de tocar nada, definir:

1. **Slug** — kebab-case corto. Para el caso ancla de este playbook: `ferreteria-del-norte`. Se usa para:
   - Carpeta local: `~/Documents/work/erp-<slug>/`
   - Repo GitHub: `erp-<slug>` (privado)
   - Subdominios: `<slug>.puroerp.com` (frontend), `api-<slug>.puroerp.com` (api)
   - Env var `CLIENT_SLUG=<slug>` (discriminador en Axiom)
   - DB name: `erp_<slug>` (con guiones bajos → `erp_ferreteria_del_norte`)
2. **Nombre del cliente / negocio** — `CLIENT_NAME` en env vars y branding. Caso ancla: `Ferretería del Norte`.
3. **Rubro** — define el contenido del seed. Para el caso ancla: ferretería retail. Otros rubros válidos con el mismo playbook: librería, repuestos, supermercado, comercio general.
4. **Alcance** — por defecto: **showcase con seeds** (ver tabla de funcionalidades). Si el cliente pide MVP funcional con features que no existen (especialmente POS o import Excel runtime), eso es scope de proyecto pago, no de demo.
5. **Capacity check del VPS** — antes de meter 3 contenedores más en el VPS Hetzner compartido, verificar que entran (ver Fase 0).
6. **Decisión POS** — ver Fase 0 paso 3 (bloqueante para Fase 2).
7. **Decisión AFIP** — CAE simulado vs WSFE real. Por default demo = simulado.
8. **Decisión Import Excel runtime** — fuera de scope demo (build-time CSV→JSON). Si el prospecto lo pide explícito, es scope de proyecto pago.

## Topología

```
DNS: puroerp.com (registrado y gestionado en Vercel)
   ├── <slug>.puroerp.com      → Vercel prod (frontend, CNAME automático)
   └── api-<slug>.puroerp.com  → A record al VPS Hetzner (Coolify api)

GitHub: erp-<slug>
   └── main → único branch que dispara deploy

Vercel project (Root: frontend/)
   └── prod ← main, custom domain <slug>.puroerp.com

Coolify project (mismo VPS Hetzner compartido)
   └── environment "production" ← main
         ├── service api      (Dockerfile, port 8081, pre-deploy: npm run migrate:prod)
         ├── service postgres (DB: erp_<slug>)
         └── service redis

Axiom: dataset COMPARTIDO. Discriminador = CLIENT_SLUG, ya inyectado por
api/src/common/logger.ts en cada log line. NO crear dataset nuevo.
```

`frontend/Dockerfile` y `output: "standalone"` en `next.config.ts` quedan en el repo aunque no se usen — Vercel los ignora.

## Cobertura del repo base vs requisitos retail

Ya existe en `api/src/modules/` (REUSE directo, no construir):

- **Productos con variantes** (`products` + `ProductVariantEntity`), categorías, marcas, listas de precios múltiples (mostrador / mayorista / especial / por canal / por zona / por categoría de cliente).
- **Stock multi-depósito** (`StockEntity` por warehouse) con reservas (`StockReservationEntity`) y movimientos tipificados (`StockMovementEntity`).
- **Clientes con cuenta corriente** (`AccountEntity`), límite de crédito, política, bloqueo por mora (`creditLimit`, `currentBalance`, `overdueBalance`, `blockOnOverdue`).
- **Cheques de terceros** con ciclo completo (received → in_portfolio → deposited → cleared / bounced / endorsed / returned).
- **Compras**: `purchase-orders` + `supplier-delivery-notes` + `supplier-invoices` + `three-way-match`.
- **Pagos multi-formato** (efectivo, transferencia, cheque, dólares) — `payments` + `cashbox` + `bank-accounts`.
- **Hojas de ruta + delivery notes + drivers** (`dispatch-sheets` + `delivery-notes` + `drivers`) — relevante si la ferretería hace reparto a obra.
- **Facturación AFIP** — `invoices` + `credit-notes` + `debit-notes` + `fiscal-authorizations` (campos CAE/jurisdicción presentes; integración real WSFE no garantizada en una demo).
- **Master data AR** ya en seeds globales: IVA, tipos de factura AFIP, jurisdicciones, métodos de pago, condiciones de pago.

NO existe en el repo base. Estrategia para demo:

| Gap | Estrategia para demo retail |
|---|---|
| **POS / Mostrador con scanner** | Decidir en Fase 0. Tres opciones documentadas abajo. |
| **Import Excel runtime** (Jorge re-importa mensual) | Pre-bake build-time: `scripts/csv-to-catalog.ts` parsea el CSV en tiempo de build a `seeds/demo/<rubro>/catalog-mapped.json`. La UI runtime es scope de cliente pago. |
| **Multi-unidad de venta** (compro caja / vendo unidad) | Seedear `units` ricas (caja, paquete, unidad, atado, par, juego, c/u) para que dropdowns no rompan. Conversión real fuera de scope. |
| **Precios atados a USD/CAC con recálculo** | Seedear precios en pesos; el CSV de Ferretería del Norte trae USD y ARS pre-calculados. Sin tabla de exchange rates. |
| **Bulk price update por rubro/proveedor** | Fuera de scope de demo. |
| **Cotizaciones con vencimiento explícito** | Usar `orders` en estado `draft` + sembrar `expirationDate` ficticio. |
| **Aging report agrupado** | Campos existen, el report no — verificar `reports/`. |
| **Alertas de stock mínimo** (UI/listener) | Verificar en Fase 0; si no existe, seedear el campo y mostrar columna "stock crítico" en lista, sin alerta push. |

### Las 3 opciones para POS (la decisión más importante)

El POS es la primera pantalla que el prospecto retail quiere ver. No mostrarlo arriesga que el prospecto diga "esto no es lo que necesito". Las opciones, ordenadas por costo:

**Opción A — Sin POS (más barata, mayor riesgo comercial).**
Mostrar el flow venta vía `orders` + `cashbox` + `invoices`. Decir explícitamente "el POS de mostrador es módulo aparte, lo construimos como parte del proyecto". Sirve si el prospecto valora más backoffice (compras, ctacte, AFIP) que mostrador.

**Opción B — POS preview mínimo (recomendada para Ferretería del Norte).**
Construir una pantalla `/pos` simple: input que captura escaneo (un scanner USB tipea como teclado y manda Enter), busca producto por SKU, agrega al carrito, total + medio de pago, descuenta stock, emite comprobante simulado. **Sin** apertura/cierre de caja real (eso queda en `cashbox` aparte). ~3-5 días de trabajo. Se siente como POS pero no es production-grade.

**Opción C — POS funcional completo (es proyecto pago, no demo).**
Apertura/cierre arqueo, integración con impresora térmica vía `escpos`, atajos de teclado, modo offline, productos pesables, etc. Esto es ~3-5 semanas y excede el alcance de una demo.

**Default recomendado: Opción B** para Ferretería del Norte, porque es el caso retail más representativo y porque el costo marginal sobre la opción A (~3-5 días) compra el demo killer feature. Confirmar antes de Fase 2.

## Fases

### Fase 0 — Auditoría VPS + verificación de auth + decisiones bloqueantes (paralelo con 1 y 2)

**Objetivo:** confirmar que el VPS compartido tiene capacity, verificar el mecanismo de auth para anticipar issues con cookies cross-domain, y resolver las decisiones bloqueantes (POS, AFIP, alertas stock mínimo, reportes empaquetados).

1. SSH al VPS Hetzner compartido. Correr `docker stats --no-stream` y revisar el dashboard de Coolify. Reportar: tipo de VPS, containers corriendo, RAM/CPU usados/libres.
   - Si entran 3 contenedores más con holgura → seguir.
   - Si están al límite → escalar el VPS antes de la Fase 3 (CX32 → CX42 ≈ +20€/mes), o decidir VPS aparte. **Bloqueante para Fase 3, no para 1 y 2.**
2. `grep -rn "res.cookie\|setCookie" api/src/modules/auth/` para confirmar mecanismo de auth.
   - Como frontend (`<slug>.puroerp.com`) y api (`api-<slug>.puroerp.com`) viven bajo el **mismo apex `puroerp.com`**, las cookies httpOnly funcionan con `sameSite=lax` sin gimnasias cross-site.
   - Si auth es **Bearer** (header Authorization): nada que ajustar.
   - Si auth es **Cookie**: confirmar `Domain=.puroerp.com` (o ausente con `sameSite=lax`) y `Secure=true` en prod. Si ves `sameSite=strict`, ajustá a `lax`.
3. **Decidir POS**: opción A, B o C (ver sección "Las 3 opciones para POS"). Si B, agregar la construcción del módulo `pos` como sub-fase entre Fase 2 y Fase 5. **Bloqueante para Fase 2.**
4. **Decidir AFIP**: simulado (default demo) o WSFE real (escapa scope de demo). Si simulado, anotar en handoff.
5. Verificar **alertas de stock mínimo**: `grep -rn "minStock\|stockMinimo\|stock_min" api/src/modules/inventory/` y revisar si hay listener o sólo campo.
6. Verificar **reportes empaquetados**: `ls api/src/modules/reports/` y listar qué endpoints reales hay vs. qué hace falta seedear/agregar (ventas día/mes, top productos, sin rotación, stock crítico, export Excel).

### Fase 1 — Repo local + GitHub (paralelo)

7. Clonar el repo base a una carpeta nueva:
   ```bash
   cp -R ~/Documents/work/puroerp-demos/erp-retail ~/Documents/work/erp-<slug>
   cd ~/Documents/work/erp-<slug>
   rm -rf .git node_modules api/node_modules frontend/node_modules api/dist frontend/.next
   rm -f api/.env frontend/.env frontend/.env.local
   ```
8. Limpiar referencias mínimas: campo `name` en `package.json` raíz/`api`/`frontend`, header del README, `CLAUDE.md` (cambiar nombre del repo activo). NO tocar arquitectura.
9. `git init && git add . && git commit -m "init: fork from erp-retail @ <sha-base>"`.
10. Crear repo GitHub `erp-<slug>` (privado), `git remote add origin ...`, push `main`. Para iterar sin disparar deploys, usar feature branches y mergear a `main` cuando esté listo.

### Fase 2 — Seed del rubro en LOCAL contra DB local (paralelo)

**Crítico:** el loop `drop schema → migrate → seed` toma 30s en local y 3-5 min vía `coolify exec`. Desarrollar 100% local antes de tocar prod.

11. En `~/Documents/work/erp-<slug>/api`:
    - `npm install`, configurar `api/.env` apuntando a Postgres local.
    - `npm run migrate:dev` para crear schema.
12. **Pre-bake del catálogo desde el CSV.** Para Ferretería del Norte el archivo fuente es `Ferretera_del_Norte_catalogo_con_precios.csv` (3458 productos, columnas `Codigo, Categoria, Subcategoria, Articulo / Descripcion, Medida, Unidad de Venta, Cantidad por Caja/Paq, Precio Estimado (ARS), Precio (USD), Pagina del Catalogo`). Crear `api/scripts/csv-to-ferreteria-catalog.ts` que parsea ese CSV y emite `api/src/seeds/demo/ferreteria-del-norte/catalog-mapped.json`. Ese JSON es la fuente de verdad para el seed; el CSV original puede quedar fuera del repo si pesa.
    - Mapear `Codigo` → `sku` (ya determinista, perfecto para re-seeds).
    - Mapear `Categoria` → `CategoryEntity` (parent), `Subcategoria` → `CategoryEntity` (child) cuando exista.
    - Mapear `Medida` → `ProductVariantEntity` cuando varios productos comparten todo menos la medida; si cada SKU es único, dejarla en `metadata.measure`.
    - Mapear `Unidad de Venta` → `units` (`c/u`, `caja`, `paquete`, `atado`, `juego`, `metro`, `kg`).
    - Mapear `Precio Estimado (ARS)` → `PriceListItemEntity` en `Lista General`.
    - Mapear `Precio (USD)` → `PriceListItemEntity` en `Lista USD` opcional (segunda lista para demostrar pricing por canal).
13. Crear `api/src/seeds/seedFerreteriaDelNorteDemo.ts` siguiendo el patrón de `catalogopro-demo.seed.ts` (`api/src/seeds/catalogopro-demo.seed.ts:1-53` para soft-delete idempotente). Registrar en `api/src/seeds/index.ts`. Agregar script `seed:ferreteria` en `api/package.json` con flag `SEED_FERRETERIA_DEMO=true`.

    Contenido típico a sembrar (más allá del catálogo):
    - **Categorías y marcas** representativas del rubro (las del CSV + algunas marcas ficticias top: Tramontina, Bahco, Stanley, Black+Decker, etc.).
    - **Unidades** (`units`) ricas (kg, m, m², m³, unidad, caja, paquete, par, juego) aunque no exista feature multi-unidad real — cualquier dropdown que las consume rompe sin esto.
    - **Productos** todos los del CSV (~3458) con SKUs **deterministas** del campo `Codigo` para que re-seeds no choquen UNIQUE.
    - **Listas de precio** ~3-5: `Lista General` (ARS del CSV), `Lista USD`, `Lista Mayorista` (descuento sobre general), `Lista Construcción` (descuento adicional para clientes corporativos).
    - **Sucursales y depósitos** ~1 sucursal + 2 warehouses (Salón + Depósito atrás). `StockEntity` inicial para cada producto (cantidades realistas, no todos en 100).
    - **Movimientos de stock** históricos (compras a proveedores, ventas) para que el módulo de movimientos no esté vacío.
    - **Clientes** ~30 mezcla de tipos: 15 consumidores finales sin cta cte (muchos del CSV de mostrador), 10 medianos con cta cte (constructores, plomeros, electricistas), 5 grandes con cta cte alta + cheques diferidos. Algunos cerca del límite de crédito o en mora.
    - **Cheques en cartera** ~15 en estados varios (received, deposited, cleared, bounced, endorsed) vinculados a clientes/proveedores reales del seed.
    - **Pedidos** ~20 en estados varios (draft = "presupuesto", confirmed, in_delivery, delivered). Reservas de stock para los confirmed/in_delivery.
    - **Compras a proveedores** ~5 OC con recepción parcial/completa.
    - **Facturas A/B emitidas** con CAE simulado (string realista, no validado contra AFIP).
    - **Pagos** mezcla efectivo/transferencia/cheque para cubrir el módulo cashbox.
    - **Si la decisión de POS fue B**: seedear ~10 ventas POS del día con tickets, y dejar la pantalla `/pos` lista para demostración en vivo.
14. Branding mínimo en `frontend/`: logo placeholder de Ferretería del Norte, nombre del cliente en header/título, paleta opcional (tonos amarillo+negro o azul+blanco — clásicos ferretería). Mantener componentes intactos.
15. Smoke test local end-to-end:
    ```bash
    npm run migrate:dev && SEED_FERRETERIA_DEMO=true npm run seed:ferreteria
    npm run dev  # api
    cd ../frontend && npm run dev
    ```
    Login con admin, recorrer todas las pantallas: productos (que las 3458 filas no rompan paginado), variantes, listas de precio, clientes, cuentas corrientes, cheques, hojas de ruta, facturas, pedidos, POS si Opción B. **Iterar el seed hasta que ninguna pantalla rompa visualmente** (NaN, dropdowns vacíos, columnas sin data, paginado lento con 3458 productos).
16. Commit en local. **No pushear todavía** — el push a `main` dispara el deploy real, dejarlo para Fase 5.

### Fase 3 — Provisioning Coolify (api + postgres + redis)

**Bloqueada hasta confirmar capacity en Fase 0 paso 1.** Seguir [`.agents/skills/erp-client-ops/SKILL.md`](../.agents/skills/erp-client-ops/SKILL.md) para detalles operacionales del UI de Coolify, **con las diferencias de demo notadas abajo**.

17. **Axiom:** NO crear dataset nuevo. Reusar el dataset compartido (mismo `AXIOM_DATASET` que las otras demos, ya documentado en `.env.infra`). El logger central inyecta `CLIENT_SLUG` en cada line; ese es el discriminador para queries.
18. **Verificar Dockerfile api**: confirmar que corre `npm run build` ANTES de que Coolify ejecute el pre-deploy `npm run migrate:prod` (el comando lee `build/` compilado). Si no, ajustar el Dockerfile.
19. En Coolify UI:
    - Crear proyecto `erp-<slug>` con un único environment: `production`.
    - Conectar GitHub App al repo `erp-<slug>`. Mapear `main` → production.
    - Crear servicios `postgres` y `redis` (gestionados por Coolify, **sin backup auto** — anotar en handoff). DB name `erp_<slug>` (`erp_ferreteria_del_norte` para el caso ancla).
    - Crear servicio `api`: base dir `/api`, Dockerfile, puerto interno 8081, pre-deploy `npm run migrate:prod`.
20. Cargar **environment variables** en el servicio api:
    ```
    DATABASE_URL=postgres://USER:PASS@postgres:5432/erp_<slug>
    REDIS_URL=redis://redis:6379
    JWT_SECRET=<generar nuevo, NO reusar de otra demo>
    JWT_REFRESH_SECRET=<generar nuevo>
    AXIOM_TOKEN=<reusar token del operador>
    AXIOM_DATASET=<dataset COMPARTIDO; mismo valor que en las otras demos>
    CLIENT_SLUG=<slug>
    CLIENT_NAME=<Nombre del cliente>
    ADMIN_EMAIL=admin@puroerp.com
    ADMIN_PASSWORD=<generar y guardar en password manager>
    SEED_FERRETERIA_DEMO=true
    FRONTEND_URL=https://<slug>.puroerp.com
    NODE_ENV=production
    ```
    `FRONTEND_URL` es comma-sep y se usa como CORS whitelist (`api/src/server.ts:23-26`). Con un único dominio prod fijo no hay nada más que agregar.
21. Configurar dominio y certificado en Coolify:
    - Service `api` → FQDN `api-<slug>.puroerp.com` (Coolify gestiona Let's Encrypt vía Traefik).
    - **Antes** del primer deploy: crear el **A record** `api-<slug>.puroerp.com` en el panel DNS de Vercel apuntando al IP del VPS Hetzner. Sin DNS, Coolify no puede emitir el certificado.
22. **NO crear servicio frontend en Coolify.** Vive en Vercel.

### Fase 4 — Provisioning Vercel

23. Crear proyecto en Vercel apuntando al repo `erp-<slug>`. Root directory: `frontend/`. Production branch: `main`. Desactivar previews automáticos de otros branches (Project → Settings → Git) para mantener simple.
24. Asignar custom domain en Vercel (Project → Settings → Domains):
    - Production deployment → `<slug>.puroerp.com`. Como `puroerp.com` ya está en Vercel, no hay configuración DNS adicional — el cert se emite automático.
25. Cargar env vars en Vercel (production):
    ```
    NEXT_PUBLIC_API_URL=https://api-<slug>.puroerp.com
    ```
    Más las que use el frontend (revisar `frontend/.env.example`).

### Fase 5 — First deploy + seeds + verificación

26. **Push `main`** desde local. Esto dispara dos builds en paralelo: Coolify (api+postgres+redis) y Vercel (frontend).
27. Esperar que el servicio `api` esté `running` en Coolify. Healthcheck:
    ```bash
    curl -fsS https://api-<slug>.puroerp.com/health
    ```
28. Correr seeds (una sola vez, post-deploy):
    ```bash
    # Coolify UI Terminal o CLI
    coolify exec api -- npm run seed:ferreteria
    ```
    Esto inicializa permisos, roles, admin user, master data AR, y los datos del rubro.
29. **Verificación E2E en `https://<slug>.puroerp.com`:**
    - Login con `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
    - Recorrer las pantallas clave del rubro retail:
      - **Catálogo**: productos (paginado fluido con 3458 filas), variantes, listas de precio múltiples.
      - **POS** (si Opción B): escanear SKU, carrito, descuento, total, ticket.
      - **Stock**: inventario por depósito, movimientos, alerta stock crítico.
      - **Clientes / cuentas corrientes**: saldo, mora, estado de cuenta.
      - **Compras**: OC → recepción → factura proveedor.
      - **Facturación**: emitir factura B con CAE simulado.
      - **Cashbox**: apertura, ventas, cierre con arqueo.
      - **Reportes**: ventas día, top productos, stock crítico, export Excel.
    - Confirmar logs en Axiom: `| where client_slug == "<slug>"`.
    - Flow mínimo retail: escanear producto en POS (o crear orden) → cobrar mixto efectivo+cuenta corriente → emitir factura B → recibir un cheque y depositarlo.

### Fase 6 — Handoff y cleanup

30. Crear `docs/demo-handoff-<slug>.md` en el repo nuevo con: URL prod, credenciales admin (link a password manager, NO en plano), recordatorio de que el dataset Axiom es compartido (filtro `client_slug == "<slug>"`), que postgres/redis Coolify-managed **no tienen backup automático** — `pg_dump` queda manual, y disclaimers visibles para el demo (CAE simulado, POS preview no production-grade si Opción B, etc.).
31. Si la demo va a vivir un tiempo: agendar `pg_dump` periódico (cron en el VPS o agente programado).

## Critical files (en este repo base)

- `Ferretera_del_Norte_catalogo_con_precios.csv` — fuente de datos real para el caso ancla (3458 SKUs). Si el rubro nuevo trae su propio CSV/Excel, ponerlo en `api/src/seeds/data/` o procesarlo en build-time.
- `api/scripts/csv-to-ferreteria-catalog.ts` (a crear) — parser CSV → JSON pre-bakeado. Patrón de referencia: lo que produce `seeds/demo/catalogopro/catalog-mapped.json`.
- `api/src/seeds/index.ts` — orquestador de seeds. Registrar el nuevo `seedFerreteriaDelNorteDemo` ahí.
- `api/src/seeds/catalogopro-demo.seed.ts` — referencia de patrón para el nuevo seed (soft-delete idempotente, mapeo de unidades, lectura de JSON pre-bakeado).
- `api/src/seeds/large-demo.seed.ts` — referencia de patrón para los datos no-catálogo (clientes, ctacte, cheques, pedidos, etc.).
- `api/src/modules/products/data_access/product-variant.entity.ts` — confirmación de que el campo `Medida` del CSV puede mapear a variante real.
- `api/package.json` — agregar script `seed:ferreteria`.
- `api/src/common/logger.ts` — confirmar que `CLIENT_SLUG` se inyecta como child binding.
- `api/src/server.ts` — `trust proxy` + CORS comma-sep desde `FRONTEND_URL`.
- `api/src/modules/auth/` — verificar mecanismo de auth en Fase 0.
- `api/src/modules/fiscal-authorizations/` — confirmar comportamiento simulado vs WSFE real (Fase 0 paso 4).
- `api/src/modules/inventory/` — verificar alertas de stock mínimo (Fase 0 paso 5).
- `api/src/modules/reports/` — verificar reportes empaquetados (Fase 0 paso 6).
- `api/Dockerfile` — confirmar orden `npm run build` → pre-deploy `migrate:prod` → start.
- `.agents/skills/erp-client-ops/SKILL.md` — fuente operacional para clientes pagos.
- `docs/infra.md` — fuente de verdad de la infra.

## Gotchas (no perder)

1. **POS no existe** — decidir A/B/C en Fase 0 antes de prometer la pantalla al prospecto. Default recomendado: B.
2. **Excel import runtime no existe** — pre-bake CSV→JSON build-time. Si el prospecto pide actualización mensual desde la UI, es scope de proyecto pago.
3. **Auth Bearer vs Cookie:** con dominios `*.puroerp.com` para frontend y api, las cookies funcionan con `sameSite=lax`. Igual confirmar mecanismo en Fase 0.
4. **CORS `FRONTEND_URL` no soporta wildcards** — el dominio prod es fijo; sólo importa si se habilitan previews ad-hoc.
5. **Dockerfile api** debe correr `npm run build` antes del pre-deploy `migrate:prod`.
6. **Axiom dataset es compartido** — no crear uno nuevo. Filtrar por `client_slug` en queries.
7. **Postgres/Redis Coolify-managed** no tienen backup automático.
8. **DB name por proyecto** (no compartir Postgres entre demos) para evitar colisiones.
9. **JWT secrets nuevos** por demo, NO reusar de otras instancias.
10. **Hojas de ruta con `new Date()`** caducan al día siguiente — parametrizar si se muestra varias veces.
11. **SKUs deterministas** desde el campo `Codigo` del CSV para que re-seeds no rompan UNIQUE.
12. **3458 productos pueden lentificar pantallas** — confirmar paginado server-side en `/products` antes de mostrar al prospecto.
13. **Seedeá `units`** con caja/paquete/par/juego/atado aunque no haya feature multi-unidad real, para que dropdowns no rompan.
14. **CAE simulado** — disclaimer visible en handoff. Si el prospecto pregunta "¿factura realmente en AFIP?", la respuesta es "el conector está, en el deploy productivo se conecta contra el certificado del cliente".

## Verificación end-to-end

```bash
# 1. Health del api prod
curl -fsS https://api-<slug>.puroerp.com/health

# 2. Login desde frontend prod
# Browser → https://<slug>.puroerp.com → login con ADMIN_EMAIL/ADMIN_PASSWORD

# 3. Smoke navegación retail
# /catalogo (productos), /listas-precio, /clientes, /cuentas-corrientes,
# /tesoreria/cheques, /comprobantes, /pedidos, /compras, /pos (si Opción B),
# /caja, /reportes

# 4. Logs en Axiom (dataset compartido)
# | where client_slug == "<slug>"

# 5. Flow de negocio mínimo retail
# - Escanear producto en POS (o crear orden si Opción A) → carrito → descuento.
# - Cobrar con mixto: efectivo + cuenta corriente.
# - Emitir factura B con CAE simulado.
# - Stock se descontó automático.
# - Recibir cheque de un cliente y depositarlo (received → deposited).
# - Crear OC a proveedor → recepción → factura proveedor (three-way-match).
```

## Caso de uso de referencia: Ferretería del Norte (`ferreteria-del-norte`)

Datos clave del caso ancla:

- **Slug**: `ferreteria-del-norte`
- **Cliente**: Ferretería del Norte
- **DB**: `erp_ferreteria_del_norte`
- **Subdominios**: `ferreteria-del-norte.puroerp.com` + `api-ferreteria-del-norte.puroerp.com`
- **Catálogo fuente**: `Ferretera_del_Norte_catalogo_con_precios.csv` en la raíz del repo (3458 SKUs, categorías de ferretería real, precios ARS+USD)
- **Lead arquetipo**: comercio mostrador 5-20k SKUs (Martin Álvarez, Jorge librería como referencia de exigencia de catálogo).
- **Diferencial vs el "sistema gratis" del prospecto**: facturación AFIP con CAE (aunque simulado en demo) + cuentas corrientes con bloqueo por mora + variantes reales + multi-depósito.

Para una aplicación concreta paso a paso de este playbook (con las decisiones de POS/AFIP/reportes ya resueltas para Ferretería del Norte), ver el plan que se genere a partir de la auditoría de Fase 0.
