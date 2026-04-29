# Frontend — ERP Base

Next.js 16 (App Router) + React 19 + Tailwind + Radix UI.

## Quickstart

```bash
cp .env.example .env
npm install
npm run dev
```

Arranca en `http://localhost:3001`. Apunta a la API en `http://localhost:8089/api` por default (configurable via `API_URL`).

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor dev con Turbopack |
| `npm run build` | Build de producción |
| `npm start` | Correr el build |
| `npm run lint` | ESLint |

## Estructura

```
frontend/
├── app/           ← rutas App Router
├── components/    ← componentes compartidos (Radix + shadcn style)
├── lib/           ← utilidades, clients, hooks
├── public/        ← assets estáticos
└── styles/        ← estilos globales
```

## Variables de entorno

Solo una var requerida: `API_URL` apuntando a la URL base del backend **incluyendo `/api`**.

| Env | Valor |
|---|---|
| Local | `http://localhost:8089/api` |
| Staging | URL pública del servicio `api` en Coolify (entorno staging del cliente) |
| Prod | URL pública del servicio `api` en Coolify (entorno producción del cliente) |

Se usa **server-side only** (cliente React no tiene acceso directo; todas las llamadas pasan por server components o route handlers).

## Deploy (Coolify)

El frontend se levanta como container Docker en el mismo VPS que la API. Para que esto funcione, Next.js debe estar en modo **standalone** (`output: 'standalone'` en `next.config.ts`) y el repo debe tener un `frontend/Dockerfile` que copie `.next/standalone` y `.next/static`.

Auto-deploy: push a `dev` → staging, merge a `main` → producción.

`API_URL` y demás env vars se cargan en la UI de Coolify del servicio (tab **Environment Variables**).

Dockerfile recomendado, configuración standalone y estructura del VPS: [../docs/infra.md](../docs/infra.md).
