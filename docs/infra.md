# Infraestructura

Cada cliente vive en un **VPS propio** orquestado con [Coolify](https://coolify.io). Adentro corren cuatro servicios containerizados: `api`, `frontend`, `postgres`, `redis`. Esta página documenta cómo se monta y se opera ese stack para *este* repo (`erp-cliente-demo`) y, por extensión, para cada fork de cliente.

> **Cómo se llegó acá:** este proyecto venía en Fly.io (api) + Vercel (frontend) + Neon (DB). La separación agregaba latencia entre piezas y costo de tener tres proveedores. El 2026-04-27 se decidió consolidar todo en un VPS por cliente.

---

## Resumen de decisiones

| Pieza | Decisión | Por qué |
|---|---|---|
| VPS | Hetzner CX32 (4 vCPU / 8 GB / 80 GB) | Mejor precio/recurso del mercado (~€6.80/mes); locations en Europa, latencia aceptable desde LATAM |
| Panel | Coolify self-hosted | Sin límites en self-hosted, API sólida, soporta auto-deploy desde GitHub |
| DB | PostgreSQL como service de Coolify, dentro del mismo VPS | Sin red de por medio entre `api` y la DB; Coolify se hace cargo del lifecycle |
| Cache | Redis como service de Coolify, dentro del mismo VPS | Idem |
| Secrets | Env vars cargadas en la UI de Coolify | Coolify las inyecta al container al arrancar; no van versionadas |
| Logs | stdout de cada container → Axiom via log drain del VPS | Axiom ya estaba en uso; lo mantenemos como destino central |

**Alternativas evaluadas y descartadas:** Easypanel (límite de 3 proyectos en plan gratis), Dokploy (onboarding de usuarios no automatizable). Como fallback de provider si Hetzner Alemania da problemas de latencia con algún cliente: Vultr São Paulo (~$20/mes) o Hostinger Brasil (~$9/mes).

---

## Estructura en Coolify (por cliente)

```
Coolify
└── Project: <cliente-slug>
    ├── Environment: producción  (rama main)
    │   ├── api        ← Express, api/Dockerfile, puerto interno 8081
    │   ├── frontend   ← Next.js standalone, frontend/Dockerfile, puerto interno 3000
    │   ├── postgres   ← service nativo de Coolify
    │   └── redis      ← service nativo de Coolify
    └── Environment: staging  (rama dev)
        └── (mismos 4 servicios)
```

Cada servicio se configura con:

- **Source:** GitHub App apuntando al repo del cliente (este repo o un fork).
- **Branch:** `main` para producción, `dev` para staging.
- **Base directory:** `/api` o `/frontend` según el servicio.
- **Build pack:** Dockerfile.

> ⚠️ **Caveat de monorepo:** hoy Coolify redespliega *todos* los servicios del proyecto ante cualquier commit, no solo el servicio cuya carpeta cambió. El maintainer planea agregar "include paths" pero todavía no está. Si el redeploy cruzado molesta, la salida es separar `api/` y `frontend/` en proyectos distintos en Coolify (mismo repo, distinto base directory).

---

## Auto-deploy desde GitHub

1. En Coolify: **Sources → GitHub App** → instalar la app en el repo del cliente.
2. Al crear cada servicio, elegir esa source y la rama (`main` o `dev`).
3. Listo: cada push dispara un build + deploy.

Para darle acceso al cliente final, se lo invita como **Member** del proyecto en Coolify. Solo ve su proyecto (logs, deploys, estado). El alta del usuario en Coolify es manual: no se puede automatizar 100% por API hoy.

---

## Dockerfiles

### `api/Dockerfile`

Ya existe y funciona en Coolify sin cambios. Es multi-stage (deps-prod → build → runtime), runtime con `tini` como PID 1 y healthcheck contra `/health`. Expone el puerto `8081`.

### `frontend/Dockerfile` — pendiente

Next.js en Docker requiere modo **standalone**. Setup:

1. En `frontend/next.config.ts`:

   ```ts
   import type { NextConfig } from "next";

   const nextConfig: NextConfig = {
     output: 'standalone',
   };

   export default nextConfig;
   ```

2. Crear `frontend/Dockerfile`:

   ```dockerfile
   # Stage 1: deps
   FROM node:20-alpine AS deps
   RUN apk add --no-cache libc6-compat
   WORKDIR /app
   COPY package.json package-lock.json* ./
   RUN npm ci

   # Stage 2: build
   FROM node:20-alpine AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   ENV NEXT_TELEMETRY_DISABLED=1
   RUN npm run build

   # Stage 3: runtime
   FROM node:20-alpine AS runner
   WORKDIR /app
   ENV NODE_ENV=production
   ENV NEXT_TELEMETRY_DISABLED=1
   RUN addgroup --system --gid 1001 nodejs && \
       adduser --system --uid 1001 nextjs
   COPY --from=builder /app/public ./public
   COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
   COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
   USER nextjs
   EXPOSE 3000
   ENV PORT=3000
   ENV HOSTNAME="0.0.0.0"
   CMD ["node", "server.js"]
   ```

---

## Secrets y env vars

Se cargan en la UI de Coolify (tab **Environment Variables** del servicio). Coolify las inyecta como variables de entorno al container. **No** versionar `.env` con valores reales — solo `.env.example` con los nombres.

Variables mínimas por servicio:

- **`api`:** `DATABASE_URL` (apuntando al service `postgres` interno: `postgres://USER:PASS@postgres:5432/DBNAME`), `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CLIENT_SLUG`, `CLIENT_NAME`, `FRONTEND_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `REDIS_URL` (`redis://redis:6379`), `AXIOM_TOKEN`, `AXIOM_DATASET`.
- **`frontend`:** `API_URL` apuntando a la URL pública del servicio `api` en el mismo VPS.

Rotar un secret = editar el valor en Coolify → save → redeploy del servicio.

---

## Migraciones

El servicio `api` se configura con un **pre-deploy command**: `npm run migrate:prod`. Coolify lo corre antes de cortar tráfico al container nuevo, así las migraciones del commit se aplican antes de cada release.

---

## Logs → Axiom

Cada container escribe a stdout. Coolify recolecta esos logs y los muestra en su UI. Para enviarlos a Axiom de forma centralizada:

1. Crear un dataset por cliente en Axiom (`erp-<slug>`).
2. En el VPS, instalar un log drain (vector / fluent-bit / promtail) que lea los logs de Docker y los envíe a Axiom usando el ingest token. Coolify no tiene drain nativo a Axiom todavía, así que esto se hace **una vez por VPS** al provisionar.

---

## Provisioning del VPS

### Manual (rápido para un cliente puntual)

1. Hetzner Cloud Console → crear servidor: **CX32**, Ubuntu 24.04, location `nbg1` (Nuremberg) o `fsn1` (Falkenstein).
2. SSH al servidor: `ssh root@<ip>`.
3. Instalar Coolify: `curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash`.
4. Acceder a `https://<ip>:8000` y completar el setup inicial.
5. Conectar la GitHub App y crear el proyecto del cliente con los 4 servicios.

### Plan recomendado

| Recurso | Valor |
|---|---|
| vCPU | 4 |
| RAM | 8 GB |
| Disco | 80 GB SSD |
| Tráfico | 20 TB/mes |
| Precio | ~€6.80/mes (~$7.50) |

8 GB de RAM dejan margen cómodo para los 4 servicios + Coolify + el entorno staging en paralelo.

### Locations Hetzner usables

| Código | Ciudad | Notas |
|---|---|---|
| `nbg1` | Nuremberg, DE | Default |
| `fsn1` | Falkenstein, DE | Alternativa europea |
| `hel1` | Helsinki, FI | Latencia algo peor a LATAM |
| `ash` | Ashburn, US | Mejor latencia desde LATAM si Europa molesta |
| `hil` | Hillsboro, US | Costa oeste US |
| `sin` | Singapur | Descartado para LATAM |

---

## Hetzner API — alta automatizada

El token se genera en **Hetzner Cloud Console → Security → API Tokens** (permiso Read & Write). Guardarlo en un secret manager local — **nunca** commitearlo. La forma de pasarlo a los scripts es por env var (`HCLOUD_TOKEN`).

### CLI `hcloud`

```bash
hcloud context create erp-clientes        # pega el token cuando lo pida
hcloud server create \
  --name cliente-acme-prod \
  --type cx32 \
  --image ubuntu-24.04 \
  --location nbg1 \
  --ssh-key cristian@laptop
```

### SDK Python (esqueleto del script de alta)

```python
import os, time, subprocess
from hcloud import Client
from hcloud.images import Image
from hcloud.server_types import ServerType
from hcloud.locations import Location
from hcloud.ssh_keys import SSHKey

client = Client(token=os.environ["HCLOUD_TOKEN"])

def alta_cliente(slug: str):
    server = client.servers.create(
        name=f"erp-{slug}-prod",
        server_type=ServerType(name="cx32"),
        image=Image(name="ubuntu-24.04"),
        location=Location(name="nbg1"),
        ssh_keys=[SSHKey(name="cristian@laptop")],
    ).server
    ip = server.public_net.ipv4.ip
    print(f"VPS creado: {ip}")

    time.sleep(30)  # esperar a que el SSH esté arriba

    subprocess.run([
        "ssh", f"root@{ip}",
        "curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash",
    ], check=True)

    print(f"Coolify en https://{ip}:8000  → invitar al cliente como Member")
```

Pendientes para el script: manejo de errores con rollback, configuración de DNS, importación del proyecto base en Coolify por API, alta del log drain a Axiom.

---

## Pendientes

- [ ] Agregar `output: 'standalone'` en `frontend/next.config.ts`
- [ ] Crear `frontend/Dockerfile` (ver sección de arriba)
- [ ] Borrar `api/fly.toml` cuando el primer deploy en Coolify esté validado en producción
- [ ] Configurar el log drain del VPS hacia Axiom (vector / fluent-bit / promtail)
- [ ] Definir política de backups de PostgreSQL por cliente (Coolify tiene backups programados a destinos S3-compatible — evaluar Hetzner Object Storage o Backblaze B2)
- [ ] Script completo de alta de cliente con manejo de errores y rollback
- [ ] Decidir si separar `api/` y `frontend/` en proyectos Coolify distintos para evitar redeploys cruzados, o esperar a que Coolify implemente "include paths"

---

## Referencias

- [Coolify Docs](https://coolify.io/docs)
- [Coolify GitHub Auto-deploy](https://coolify.io/docs/applications/ci-cd/github/auto-deploy)
- [Hetzner Cloud API](https://docs.hetzner.cloud)
- [Hetzner CLI (`hcloud`)](https://github.com/hetznercloud/cli)
- [Hetzner Python SDK](https://hcloud-python.readthedocs.io)
- [Next.js Self-hosting](https://nextjs.org/docs/app/guides/self-hosting)
- [Next.js Docker standalone](https://nextjs.org/docs/app/getting-started/deploying)
