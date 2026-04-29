# Handoff: Infraestructura para empresa de software SaaS multi-cliente

## Contexto del proyecto

Empresa de desarrollo de software que provee sistemas de gestión (ERP) a empresas de América del Sur. Cada cliente recibe su propio entorno aislado con los siguientes servicios:

- **Frontend**: Next.js
- **Backend**: Express.js
- **Agente**: servicio adicional (IA u otro)
- **Base de datos**: PostgreSQL
- **Cache**: Redis

El código de cada cliente vive en un **monorepo en GitHub** con la siguiente estructura:

```
mi-repo/
├── frontend/   ← Next.js
└── backend/    ← Express.js
```

---

## Decisiones tomadas

### Panel de orquestación: Coolify

Se descartó Easypanel (límite de 3 proyectos en el plan gratis) y se evaluaron:

| Panel | Decisión | Motivo |
|-------|----------|--------|
| Easypanel | ❌ Descartado | Límite de 3 proyectos |
| Dokploy | 🟡 Candidato | Buen API/CLI pero onboarding de usuarios no automatizable |
| **Coolify** | ✅ **Elegido** | Sin límites en self-hosted, API sólida, mejor madurez |

**Coolify self-hosted es completamente gratuito y sin límite de proyectos ni servicios.**

#### Estructura en Coolify por cliente

```
Coolify
└── Proyecto: Cliente A
    ├── Entorno: producción  (rama: main)
    │   ├── App: frontend (Next.js)
    │   ├── App: backend (Express.js)
    │   ├── App: agente
    │   ├── DB: PostgreSQL
    │   └── DB: Redis
    └── Entorno: staging  (rama: dev)
        └── (mismos 4 servicios)
```

#### Auto-deploys con GitHub

- Push a rama `dev` → deploy automático a **staging**
- Merge a rama `main` → deploy automático a **producción**
- Coolify se conecta al repo vía **GitHub App**
- ⚠️ Limitación actual: en monorepos, un commit a cualquier carpeta redespliega todas las apps del proyecto (no solo la modificada). El creador planea agregar soporte de "include paths" pero aún no está disponible.

#### Alta de clientes

El onboarding de usuarios no es 100% automatizable (requiere invitación manual). Dado que los clientes no se dan de alta masivamente, el flujo es:

1. Crear el proyecto en Coolify manualmente
2. Configurar los 4 servicios
3. Invitar al cliente como Member con permisos acotados
4. El cliente ve solo su proyecto (logs, deploys, debug)

---

### Next.js en Docker: modo standalone

La forma correcta de dockerizar Next.js para self-hosting es con `output: 'standalone'`.

**`next.config.js`:**
```js
module.exports = {
  output: 'standalone',
}
```

**Dockerfile recomendado (multi-stage):**
```dockerfile
# Stage 1: dependencias
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: producción (imagen mínima)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
```

En Coolify, cada servicio del monorepo se configura con su propio **Base Directory** (`/frontend` o `/backend`).

---

### Proveedor de VPS

#### Arquitectura elegida: un VPS por cliente

Cada cliente tiene su propio VPS donde Coolify orquesta los 4 servicios. Esto garantiza aislamiento total de recursos y datos.

#### Comparativa de proveedores evaluados

| Proveedor | Precio ~4vCPU/8GB | DC en Sudamérica | Confiabilidad | Veredicto |
|-----------|------------------|-----------------|---------------|-----------|
| **Hetzner** | ~€6.80/mes | ❌ Europa | ⭐⭐⭐⭐⭐ | Más barato, latencia alta |
| Vultr | ~$20/mes | ✅ São Paulo / Santiago | ⭐⭐⭐⭐⭐ | Mejor latencia, más caro |
| OVHcloud | ~€8/mes | ❌ Europa | ⭐⭐⭐⭐ | Similar a Hetzner |
| LightNode | ~$7.70/mes | ✅ Buenos Aires | ⚠️ Menos conocido | Precio+latencia, menos track record |
| Hostinger | ~$9/mes | ✅ Brasil | ⭐⭐⭐⭐ | Buen balance precio/latencia |
| Oracle Free | $0 | ✅ Brasil | ❌ Poco confiable | No usar en producción |

#### Recomendación según prioridad

- **Precio puro**: Hetzner (€6.80/mes, servidores en Europa)
- **Precio + latencia LATAM**: LightNode BA (~$7.70) o Hostinger BR (~$9)
- **Latencia + confiabilidad**: Vultr São Paulo (~$20)

#### Recursos recomendados por cliente

**Plan: CX32 de Hetzner (o equivalente)**

| Recurso | Valor |
|---------|-------|
| vCPU | 4 |
| RAM | 8 GB |
| Disco | 80 GB |
| Tráfico | 20 TB |
| Precio | ~€6.80/mes (~$7.50) |

Con 8 GB de RAM hay margen cómodo para correr los 4 servicios + Coolify + staging en paralelo.

---

### API de Hetzner

#### Obtener token

Cloud Console → proyecto → **Security → API Tokens** → generar token con permiso **Read & Write**.

#### Formas de usar la API

**1. curl:**
```bash
# Crear servidor
curl -X POST \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "cliente-a-prod",
    "server_type": "cx32",
    "image": "ubuntu-24.04",
    "location": "nbg1",
    "ssh_keys": ["mi-ssh-key"]
  }' \
  https://api.hetzner.cloud/v1/servers
```

**2. CLI hcloud:**
```bash
hcloud context create mi-proyecto   # configura el token
hcloud server create --name cliente-a --type cx32 --image ubuntu-24.04 --location nbg1
hcloud server delete cliente-a
```

**3. SDK Python:**
```bash
pip install hcloud
```

```python
from hcloud import Client
from hcloud.images import Image
from hcloud.server_types import ServerType

client = Client(token="TU_TOKEN")

response = client.servers.create(
    name="cliente-a-prod",
    server_type=ServerType(name="cx32"),
    image=Image(name="ubuntu-24.04"),
)
print(f"IP: {response.server.public_net.ipv4.ip}")
```

#### Script de alta de cliente (esqueleto)

```python
import time
import subprocess
from hcloud import Client
from hcloud.images import Image
from hcloud.server_types import ServerType
from hcloud.locations import Location
from hcloud.ssh_keys import SSHKey

client = Client(token="TU_TOKEN")

def crear_servidor_cliente(nombre_cliente):
    # 1. Crear VPS
    response = client.servers.create(
        name=f"{nombre_cliente}-prod",
        server_type=ServerType(name="cx32"),
        image=Image(name="ubuntu-24.04"),
        location=Location(name="nbg1"),
        ssh_keys=[SSHKey(name="mi-clave-ssh")]
    )
    ip = response.server.public_net.ipv4.ip
    print(f"Servidor creado: {ip}")

    # 2. Esperar que el servidor esté up
    time.sleep(30)

    # 3. Instalar Coolify
    subprocess.run([
        "ssh", f"root@{ip}",
        "curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash"
    ])

    print(f"✅ {nombre_cliente} listo en https://{ip}:8000")
```

#### Locations Hetzner disponibles

| Código | Ciudad |
|--------|--------|
| `nbg1` | Nuremberg, DE |
| `fsn1` | Falkenstein, DE |
| `hel1` | Helsinki, FI |
| `ash` | Ashburn, US |
| `hil` | Hillsboro, US |
| `sin` | Singapur |

---

## Pendientes / próximos pasos

- [ ] Decidir proveedor VPS definitivo (Hetzner vs Vultr vs Hostinger)
- [ ] Crear cuenta y configurar SSH key en el proveedor elegido
- [ ] Instalar Coolify en un VPS propio (servidor de control)
- [ ] Conectar GitHub App a Coolify
- [ ] Crear primer proyecto de prueba con los 4 servicios
- [ ] Armar script completo de alta de cliente con manejo de errores
- [ ] Definir política de backups de PostgreSQL por cliente
- [ ] Escribir `Dockerfile` del backend Express.js

---

## Referencias

- [Coolify Docs](https://coolify.io/docs)
- [Coolify GitHub Auto-deploy](https://coolify.io/docs/applications/ci-cd/github/auto-deploy)
- [Hetzner Cloud API](https://docs.hetzner.cloud)
- [Hetzner CLI (hcloud)](https://github.com/hetznercloud/cli)
- [Hetzner Python SDK](https://hcloud-python.readthedocs.io)
- [Next.js Self-hosting Docs](https://nextjs.org/docs/app/guides/self-hosting)
- [Next.js Docker Standalone](https://nextjs.org/docs/app/getting-started/deploying)
