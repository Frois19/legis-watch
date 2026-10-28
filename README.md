# Legis Watch

Acompanhe deputados federais: perfil, partido, proposições, votações e presença — com dados da [API de Dados Abertos da Câmara](https://dadosabertos.camara.leg.br/).

**Monorepo (recomendado no v1):** backend (API + sync), frontend e docs no mesmo repositório. Repos separados só fazem sentido depois, se times/deploys se separarem.

## Stack

- Next.js 15 (App Router) + TypeScript
- Prisma + SQLite (dev; troque `DATABASE_URL` para Postgres em produção)
- Jobs CLI de sync com a Câmara

## Docs

- [Estudo de viabilidade](./ESTUDO-VIABILIDADE.md)
- [APIs externas da Câmara (v1)](./docs/apis-v1.md)
- [API interna do produto](./docs/backend-api.md)

## Setup

```bash
cp .env.example .env
npm install
npx prisma migrate dev --name init
```

## Sync (backend)

```bash
# Cadastro rápido (lista sem detalhar redes de todos)
SKIP_DEPUTY_DETAIL=1 npm run sync -- bootstrap

# Ou detalhar só N deputados (redes sociais / gabinete)
DEPUTY_DETAIL_LIMIT=10 npm run sync -- deputies

# Proposições de um deputado
npm run sync -- propositions --deputy=204379

# Votos e presença (arquivos anuais — pode demorar / ser pesado)
npm run sync -- votes --year=2026
npm run sync -- attendance --year=2026
```

## Dev server

```bash
npm run dev
```

API em [http://localhost:3456/api/health](http://localhost:3456/api/health).

## Endpoints principais

| Método | Rota |
|---|---|
| GET | `/api/health` |
| GET | `/api/deputados` |
| GET | `/api/deputados/{id}` |
| GET | `/api/deputados/{id}/proposicoes` |
| GET | `/api/deputados/{id}/votos` |
| GET | `/api/deputados/{id}/presencas` |
| GET | `/api/partidos/{id}/membros` |
| POST | `/api/sync` |
