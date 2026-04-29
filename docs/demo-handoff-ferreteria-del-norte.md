# Handoff — Demo Ferretería del Norte

## URLs

- **Frontend prod**: https://ferreteria-del-norte.puroerp.com
- **API prod**: https://api-ferreteria-del-norte.puroerp.com
- **API health**: https://api-ferreteria-del-norte.puroerp.com/health
- **Repo GitHub**: https://github.com/cristianpurosoftware/erp-ferreteria-del-norte (privado puede volver a hacerse después)

## Acceso admin

- Email: `admin`
- Password: `admindemo1`
- (Cambiar antes de mostrarlo a un cliente real)

## Infraestructura

| Pieza | Dónde |
|---|---|
| Frontend (Next.js) | Vercel team `cristian-4587s-projects`, project `ferreteria-del-norte` |
| API (Node/Express) | Coolify @ Hetzner VPS `178.104.248.26`, project `erp-ferreteria-del-norte` |
| Postgres | Coolify managed DB `erp_ferreteria_del_norte` (interno, port 5432, user `erp`) |
| Redis | Coolify managed (interno, port 6379) |
| DNS | `puroerp.com` en Vercel team — A record `api-ferreteria-del-norte` → `178.104.248.26` |
| Logs | Axiom dataset `purosoftware-erp` (compartido), filtrar por `client_slug == "ferreteria-del-norte"` |

## Cómo se construyó (resumen)

1. Repo nuevo `cristianpurosoftware/erp-ferreteria-del-norte` forkeado del base `erp-retail`.
2. Local desarrollo: BaseEntity migrada a `prefix_nanoid`, módulo POS construido (frontend + backend), seed con 3371 productos del CSV `Ferretera_del_Norte_catalogo_con_precios.csv`.
3. Base de datos prod: schema vía migrations, **datos via `pg_dump` local + `pg_restore` a prod** (atajo, evita seed lento en container).
4. Frontend: Vercel auto-build desde `main`.
5. API: Coolify auto-build desde `main` con Dockerfile multi-stage.

## Datos seedeados en prod

- 3371 productos (catálogo CSV completo)
- 6742 stock rows (2 warehouses: Salón + Depósito)
- 10113 price-list items (3 listas: General ARS, USD, Mayorista 15% off)
- 5 suppliers, 10 brands
- 287 permissions, 1 admin user (`admin/admindemo1`)
- Sales POS de prueba con CAE `STUB...` simulado

## Disclaimers para mostrar al prospecto

- **CAE simulado**: la facturación AFIP en este demo genera un CAE simulado (string `STUB...`). En el deploy productivo del cliente se conecta contra el certificado real WSFE. La integración está, sólo cambia el modo.
- **POS preview**: la pantalla `/pos` es preview funcional (escanear, carrito, checkout, ticket impreso vía `window.print`). No incluye apertura/cierre de caja con arqueo desde el POS, impresoras térmicas escpos directas, ni modo offline. Esto se construye como módulo dedicado en el proyecto pago.
- **Sin backups automáticos**: postgres y redis son Coolify-managed. `pg_dump` queda manual hasta configurar S3-compatible backup.

## Operaciones comunes

### Re-deploy
- Push a `main` en GitHub → Vercel y Coolify detectan el commit y rebuildan automático.

### Restart api / DB
- Coolify UI → service → Restart.

### Logs en vivo
- Coolify UI → service `api` → tab Logs (live tail).
- Axiom (cross-time): `['purosoftware-erp'] | where client_slug == "ferreteria-del-norte" | where _time > ago(1h)`

### Rollback
- Coolify UI → service `api` → Deployments → Restore previous.
- Vercel UI → Deployments → Promote previous.

### Re-seed (drop + restore)
Si querés volver a popular la DB con datos limpios:
```bash
# 1. dump local actualizado
PGPASSWORD=macpro2022 pg_dump -U macpro -h localhost -p 5431 \
  --clean --if-exists --no-owner --no-privileges \
  -f /tmp/ferreteria.sql erp_ferreteria_del_norte

# 2. expose pg en Coolify (UI → DB → Settings → "Make public" en port 5532)
# 3. restore
PGPASSWORD=<PG_PASS_PROD> psql \
  -U erp -h 178.104.248.26 -p 5532 \
  -d erp_ferreteria_del_norte -f /tmp/ferreteria.sql

# 4. hide pg again (UI → Make private)
```

### Rotar JWT
Coolify UI → service api → Environment Variables → editar `JWT_SECRET` y `JWT_REFRESH_SECRET` (rotar ambos juntos) → Redeploy.

## Notas técnicas

- IDs son `prefix_nanoid` (`cust_xxx`, `prod_xxx`, `sale_xxx`, etc.). Convivencia con UUIDs históricos via `varchar(40)`.
- `AFIP_SANDBOX_STUB=true` en env vars del api → CAE simulado.
- `FRONTEND_URL=https://ferreteria-del-norte.puroerp.com` (CORS whitelist).
- El Dockerfile API usa multi-stage; el build stage fuerza `NODE_ENV=development` para que `npm ci` instale devDependencies (tsc, types, faker).
- Seeds CMD-mounted: el container ejecuta `npm run migrate:prod && node build/index.js` en cada start (migraciones idempotentes).
- Repo está actualmente **público** en GitHub para que Coolify pueda clonarlo sin GitHub App. Volverlo privado requiere registrar la GitHub App de Coolify en el repo.

## Verification end-to-end (copy-paste)

```bash
# Health
curl -fsS https://api-ferreteria-del-norte.puroerp.com/health
# → {"status":"ok","db":"connected"}

# Login
TOKEN=$(curl -s -X POST https://api-ferreteria-del-norte.puroerp.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin","password":"admindemo1"}' | jq -r '.data.accessToken')

# Find product by SKU (catalogo del CSV)
curl -s -H "Authorization: Bearer $TOKEN" \
  https://api-ferreteria-del-norte.puroerp.com/api/products/by-sku/100001 | jq '.data.name'

# POS sale (mostrador, Consumidor Final, factura B con CAE stub)
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  https://api-ferreteria-del-norte.puroerp.com/api/pos \
  -d '{"warehouseId":"whs_KB-e1dkQvvHj","items":[{"productId":"prod_7iC5G7xRFRzW","quantity":1,"unitPrice":260}],"payments":[{"method":"cash","amount":260}]}' \
  | jq '.data.invoice.cae'
# → "STUB..."

# Browser walkthrough
open https://ferreteria-del-norte.puroerp.com
# Login → /pos → escanear SKU 100001 → cobrar → ticket
```
