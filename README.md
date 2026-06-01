# EstateOps

Production-grade multi-tenant property management SaaS monorepo.

## Stack

| Path | Tech |
|------|------|
| `apps/web` | Next.js 14 (App Router), TypeScript, Tailwind CSS, ShadCN UI |
| `apps/api` | NestJS modular monolith, TypeScript strict |
| `packages/shared` | Shared DTOs, types, enums, constants |
| `packages/config` | ESLint, TypeScript, Prettier configs |
| `infra/docker` | Multi-stage Dockerfiles (dev + prod) |
| `infra/k8s` | Kubernetes manifests (Kustomize) |

Tooling: **pnpm workspaces** + **Turborepo**.

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/) 9 (`corepack enable`)
- Docker & Docker Compose (optional, for full stack)

## Quick start (local)

```bash
cd /home/gary/estateops
cp .env.example .env
cp apps/api/.env.example apps/api/.env

pnpm install
pnpm build
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001/api/health/live

## Scripts (root)

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start all apps in dev mode (Turbo) |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | ESLint across workspace |
| `pnpm test` | Run tests |
| `pnpm typecheck` | TypeScript check (no emit) |
| `pnpm format` | Prettier write |

## Path aliases

| Alias | Package |
|-------|---------|
| `@web/*` | `apps/web/src/*` |
| `@api/*` | `apps/api/src/*` |
| `@shared/*` | `packages/shared/src/*` |

## Docker Compose

Start Postgres, Redis, API, and Web:

```bash
docker compose up --build
```

Postgres is exposed on host port **5433** by default (see `DATABASE_PORT` in `.env`) so it does not conflict with a local Postgres on 5432. Services inside Compose still use `postgres:5432`.

### Database migrations

```bash
docker compose up -d postgres
pnpm --filter @estateops/api migration:run
```

Validate config only:

```bash
docker compose config
```

## Kubernetes

```bash
kubectl apply -k infra/k8s
```

Build prod images:

```bash
docker build -f infra/docker/api.Dockerfile --target prod -t estateops/api:latest .
docker build -f infra/docker/web.Dockerfile --target prod -t estateops/web:latest .
```

## Project structure

```
estateops/
├── apps/
│   ├── api/          # NestJS API
│   └── web/          # Next.js frontend
├── packages/
│   ├── config/       # Shared tooling configs
│   └── shared/       # Shared types & DTOs
├── infra/
│   ├── docker/
│   └── k8s/
├── docker-compose.yml
├── pnpm-workspace.yaml
└── turbo.json
```

## License

Private — all rights reserved.
