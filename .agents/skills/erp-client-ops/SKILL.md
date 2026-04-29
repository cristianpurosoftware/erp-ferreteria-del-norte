---
name: erp-client-ops
description: |
  Operational runbook for ERP clients deployed on Hetzner VPS + Coolify — each
  client has their own VPS running 4 containers (api, frontend, postgres, redis)
  per environment (production from `main`, staging from `dev`). Auto-deploy via
  GitHub App, secrets in Coolify UI, migrations as pre-deploy command, logs to
  Axiom via VPS log drain. Use this skill whenever the user wants to "deploy
  staging/prod", "rollback", "rotate a secret", "show logs for client X", "run
  a migration on client X", "onboard a new client", "provision a VPS", "diagnose
  why staging is down", or asks how to do anything against a specific client's
  running infra. The authoritative spec lives in `docs/infra.md` — this skill
  is the operator-facing distillation. **Never reference Fly.io, Neon, or
  Vercel** — that stack was decommissioned 2026-04-27.
---

# ERP Client Ops — Hetzner + Coolify

Operating runbook for ERP clients running on Hetzner CX32 + Coolify. The
authoritative infra reference is [`docs/infra.md`](../../../docs/infra.md);
this file is the operational distillation.

## Topology per client

Each client has **one VPS** with **two Coolify environments** (production
tracking `main`, staging tracking `dev`). Each environment runs 4 services
on the same Docker network:

| Service | Source | Internal port | Build |
|---|---|---|---|
| `api` | `api/` (this repo or fork) | 8081 | `api/Dockerfile` |
| `frontend` | `frontend/` | 3000 | `frontend/Dockerfile` |
| `postgres` | Coolify managed service | 5432 | — |
| `redis` | Coolify managed service | 6379 | — |

Inter-service traffic uses the service name as host (`postgres`, `redis`,
`api`) — Coolify wires them on the same Docker network so `DATABASE_URL`
becomes `postgres://USER:PASS@postgres:5432/DB`.

## Safety rules (non-negotiable)

1. **Never print secret values.** Mask as `xaat-****`, `eyJ****`. Secrets
   live in two places only: the Coolify UI (Environment Variables tab) and
   the operator's local secret manager. Never commit them, never echo them.
2. **Echo the target before every mutation.** Print client slug, environment,
   service, action — then ask to proceed for non-routine ops.
3. **Read-only first.** `gh run list`, `curl /health`, `docker logs` over
   SSH are safe. Anything that changes container state, secrets, or DB
   schema needs confirmation.
4. **Migrations are wired into deploys.** The `api` service's pre-deploy
   command is `npm run migrate:prod`. They run automatically before each new
   container takes traffic. To preview before prod, push to `dev` and let
   staging run them first.
5. **Don't reference the old stack.** Fly.io apps, Neon DB, Vercel projects
   were decommissioned on 2026-04-27. If a runbook step mentions `flyctl`,
   `neonctl`, or Vercel, it is stale — use the Coolify equivalent below.

## Common ops

### Deploy staging

Push to `dev`. Coolify GitHub App detects the push and rebuilds the staging
environment.

```bash
git push origin dev
gh run list --limit 3
curl -fsS https://staging.<client-domain>/health
```

### Deploy production

Merge `dev` → `main`. Coolify rebuilds the production environment.

```bash
git checkout main && git merge --ff-only dev && git push origin main
curl -fsS https://<client-domain>/health
```

Before promoting, confirm:
- Staging is green (smoke test the affected pages, not just `/health`).
- Migrations are backwards-compatible with current prod data.

### Rollback production

Coolify keeps previous images. In the service's **Deployments** tab, find
the last good deployment and click **Restore**. Postgres data is unaffected
(rollback is image-only — for schema rollback, restore from a Postgres
backup configured on the `postgres` service).

### Inspect logs

Three options, in increasing depth:

1. **Coolify UI** — service → Logs tab. Live tail.
2. **SSH to the VPS:**
   ```bash
   ssh root@<vps-ip>
   docker ps                           # find container id
   docker logs -f <container-id>
   ```
3. **Axiom** — for cross-time queries against structured logs:
   ```apl
   ['erp-<slug>']
   | where _time > ago(1h) and ['level'] == "error"
   | project _time, msg, requestId, userId, http.method, http.url
   ```
   `clientSlug`, `requestId`, `userId`, `http.*` are auto-injected by the
   logger (see `api-logging` skill). To trace one request end-to-end:
   `requestId == "<uuid>" | order by _time asc`.

### Run a one-off migration (between deploys)

Migrations run automatically on every deploy. To run one without pushing
code, exec into the running `api` container:

```bash
ssh root@<vps-ip>
docker exec -it <api-container-id> npm run migration:run
```

Don't generate-and-run on prod blind — generate locally against a copy of
the prod schema, commit, push to `dev`, validate on staging, then merge.

### Rotate a secret

```
Coolify UI → <project> → <env> → <service> → Environment Variables
  → edit JWT_SECRET (or whichever)
  → Save
  → Redeploy the service (Deployments tab → Redeploy)
```

`api` requires both `JWT_SECRET` and `JWT_REFRESH_SECRET` rotated together
or active sessions will fail to refresh.

### Restart a single service

Coolify UI → service → **Restart**. Container restarts in place; data
volumes (`postgres`, `redis`) are unaffected.

## Monorepo caveat

Coolify currently rebuilds **all 4 services** of an environment on any
commit, not just the one whose folder changed. If cross-service redeploys
become noisy, the workaround is to split `api/` and `frontend/` into two
Coolify projects pointing at the same repo with different `Base directory`.
Tracking upstream — `include paths` is on the Coolify roadmap.

## Onboarding a new client

1. Confirm: `clientSlug`, `clientName`, friendly domain.
2. **Provision the VPS** (Hetzner CX32, Ubuntu 24.04, location `nbg1` by
   default — see `docs/infra.md` for region selection):
   ```bash
   hcloud server create --name erp-<slug>-prod --type cx32 \
     --image ubuntu-24.04 --location nbg1 --ssh-key cristian@laptop
   ```
3. **Install Coolify** on the new VPS:
   ```bash
   ssh root@<ip>
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```
4. Open `https://<ip>:8000` and finish the Coolify setup wizard.
5. **Create the project** with two environments: `production` (branch
   `main`) and `staging` (branch `dev`).
6. **Add 4 services per environment** from this repo or the client's fork:
   - `api` — Base directory `/api`, Build pack Dockerfile, internal port 8081
   - `frontend` — Base directory `/frontend`, Build pack Dockerfile, internal port 3000
   - `postgres` — Coolify managed service
   - `redis` — Coolify managed service
7. **Configure env vars** (see "Environment contract" below).
8. **Set the pre-deploy command** on `api`: `npm run migrate:prod`.
9. **Wire the log drain** on the VPS to ship Docker logs to Axiom (vector /
   fluent-bit / promtail; one-time per VPS, see `docs/infra.md`).
10. **Invite the client** as a Member of the Coolify project so they can
    see logs and deploy status (read-only by default).
11. Push to `dev` → first staging deploy. Confirm `/health` returns 200.
12. Merge `dev` → `main` → first production deploy.

## Environment contract

| Var | api prod | api staging | frontend |
|---|---|---|---|
| `NODE_ENV` | production | production | production |
| `APP_ENV` | production | staging | — |
| `CLIENT_SLUG` | ✓ | ✓ | — |
| `CLIENT_NAME` | ✓ | ✓ | — |
| `DATABASE_URL` | `postgres://USER:PASS@postgres:5432/erp_<slug>` | same w/ `_staging` DB | — |
| `REDIS_URL` | `redis://redis:6379` | `redis://redis:6379` | — |
| `JWT_SECRET` | ✓ | ✓ | — |
| `JWT_REFRESH_SECRET` | ✓ | ✓ | — |
| `AXIOM_TOKEN` | ✓ | ✓ | — |
| `AXIOM_DATASET` | `erp-<slug>` | `erp-<slug>-staging` | — |
| `FRONTEND_URL` | `https://<client-domain>` | `https://staging.<client-domain>` | — |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seed only | seed only | — |
| `API_URL` | — | — | `https://api.<client-domain>` |

## Secret rotation cadence

- **`JWT_SECRET` + `JWT_REFRESH_SECRET`**: every 6 months or on incident.
  Always rotate both together — partial rotation breaks refresh-token flows.
- **`AXIOM_TOKEN`**: rotate via Axiom dashboard, then update Coolify env on
  every client.
- **`HCLOUD_TOKEN`** (operator-side, used by provisioning scripts): yearly,
  lives in the operator's local secret manager only.
- **Postgres password**: rotation requires updating both the `postgres`
  service password and `DATABASE_URL` on `api` together. Coordinate during
  a low-traffic window.

## Open work (see `docs/infra.md` for the full list)

- Log drain to Axiom not yet wired on every VPS — manual one-time install.
- Postgres backup destination (S3-compatible) not yet standardized.
- Full provisioning script with rollback + DNS automation + Coolify project
  import via API.
- Decision pending on splitting `api/` and `frontend/` into separate Coolify
  projects to avoid the monorepo redeploy caveat.

## What NOT to do

- ❌ Reference `flyctl`, `fly.toml`, `flyctl secrets set`, `fly logs` —
  Fly.io was decommissioned. Old skill versions and CLAUDE.md sections that
  mention it are stale.
- ❌ `neonctl branches create` to test a migration — there is no Neon. Use a
  local Postgres against a copy of the prod dump, or test on staging.
- ❌ Vercel anything — the frontend lives in the `frontend` container of
  each client's VPS.
- ❌ Edit `.env` files in production. Production env vars live in the
  Coolify UI; commits don't change them.
- ❌ `docker exec ... psql` to "just look" at prod data without telling the
  user — same blast radius as connecting to the prod DB directly.
- ❌ SSH into a client's VPS and `apt install` / `apt upgrade` something
  manually — host-level changes don't survive a Coolify reinstall and
  aren't reproducible across VPSs. Put it in the provisioning script.
- ❌ Hardcode the VPS IP anywhere in the codebase — it's per-client and
  belongs in operator notes / Coolify.
