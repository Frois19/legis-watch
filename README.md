# Legis Watch

Acompanhe **deputados federais** (Câmara), **deputados estaduais** (27 UFs) e **senadores**: busca unificada por esfera, perfil, partido, proposições, votações e presença quando a casa publicar.

**Documentação:** [índice produto + técnica](./docs/README.md) · [guia do usuário](./docs/GUIA-DO-PRODUTO.md) · [estaduais por UF](./docs/estaduais.md)

**Monorepo (recomendado no v1):** backend (API + sync), frontend e docs no mesmo repositório. Repos separados só fazem sentido depois, se times/deploys se separarem.

## Stack

- Next.js 15 (App Router) + TypeScript
- Prisma + SQLite (dev; troque `DATABASE_URL` para Postgres em produção)
- Jobs CLI de sync (Câmara + adapters estaduais)

## Docs

Comece pelo índice e escolha o caminho:

- [**Índice da documentação**](./docs/README.md) — produto e técnica
- [Guia do usuário](./docs/GUIA-DO-PRODUTO.md) — telas com prints
- [Deputados estaduais por UF](./docs/estaduais.md) — 11 live + 16 fixture
- [Roadmap](./docs/PLANO-EXPANSAO.md) — gaps, qualidade e ideias de features
- [APIs da Câmara (v1)](./docs/apis-v1.md) — sync federal
- [API interna](./docs/backend-api.md) — `/api/...`
- [Estudo de viabilidade](./ESTUDO-VIABILIDADE.md)

## Setup

```bash
cp .env.example .env
npm install
npx prisma db push
```

## Sync (backend)

```bash
# Cadastro rápido federal (lista sem detalhar redes de todos)
SKIP_DEPUTY_DETAIL=1 npm run sync -- bootstrap

# Ou detalhar só N deputados (redes sociais / gabinete)
DEPUTY_DETAIL_LIMIT=10 npm run sync -- deputies

# Proposições de um deputado
npm run sync -- propositions --deputy=204379

# Votos e presença (arquivos anuais em lote)
npm run sync -- votes --year=2026
npm run sync -- attendance --year=2026

# Estaduais — todas as 27 UFs (PE via ALEPE; demais via fixture de cadastro)
npm run sync -- estadual --source=all

# Só PE (ALEPE live + fallback de fixture)
npm run sync -- estadual --source=alepe

# Casas live adicionais: MG (ALMG), SP (ALESP), PR (ALEP) e SAPL
npm run sync -- estadual --source=almg
npm run sync -- estadual --source=alesp
npm run sync -- estadual --source=alep
npm run sync -- estadual --source=aleac

# Perfil estadual enriquecido (filiações/mandatos/proposições quando a casa publicar)
npm run sync -- estadual-perfil --source=aleac --codigo=248

# Senadores em exercício (Dados Abertos do Senado)
npm run sync -- senadores

# Perfil enriquecido (filiações, mandatos, matérias e votos de um senador)
npm run sync -- senador-perfil --codigo=5672

# Cron / agendado — federal + listas estaduais + senadores
npm run sync -- cron
# ou POST /api/sync { "domain": "cron" } com x-sync-secret / UI em /admin
```

## Dev server

```bash
npm run dev
```

App em [http://localhost:3456](http://localhost:3456) · API em `/api/health`.

### UI (v1)

- `/` — busca por esfera (federal / estadual / senador / todos); deep-link `?esfera=&uf=&nome=&partido=&legislaturaId=`
- `/favoritos` — favoritos multi-esfera no `localStorage`
- `/deputados/[id]` — perfil federal (projetos, votações, presença, partido)
- `/parlamentares/[source]/[id]` — estadual (27 UFs) ou senador; enrich on-demand com skeleton
- `/admin` — dispara sync protegido (`SYNC_SECRET`)

### Tema

- Modo claro / escuro pelo botão no cabeçalho (Lua / Sol)
- Preferência em `localStorage` (`legis-watch:theme`: `light` | `dark` | `system`)
- Sem flash: script anti-FOUC no `<html>` antes do paint

### Cache (envs)

| Env | Default | Uso |
|---|---|---|
| `SEARCH_CACHE_TTL_MS` | `120000` | Busca em memória |
| `SEARCH_CACHE_MAX` | `500` | Teto da busca |
| `HTTP_CACHE_TTL_MS` | `21600000` | APIs externas (assembleias/Senado) |
| `HTTP_CACHE_MAX` | `400` | Teto HTTP em memória |
| `HTTP_CACHE_DISK` | `1` | Disco em `.cache/parliament` (`0` desliga) |
| `HTTP_CACHE_MAX_RETRIES` | `3` | Retry em 429/503/504 e rede |

Stats: `GET /api/cache/stats` · também em `GET /api/health` → `cache`.

## Testes (backend)

Meta: **≥ 90%** de cobertura unitária em `src/lib` + `src/app/api` (exceto I/O HTTP/bulk da Câmara) e **mutation testing** (Stryker) na lógica de domínio. Integração usa SQLite isolado (`prisma/test.db`) e as rotas reais — incluindo matriz das **27 UFs** estaduais.

```bash
npm test                   # unitários (inclui matriz por UF)
npm run test:coverage      # cobertura com thresholds
npm run test:integration   # integração API ↔ Prisma (federal + estadual)
npm run test:all           # unitários + integração
npm run test:mutation      # Stryker (score de mutação)
```

Relatórios: `coverage/` e `reports/mutation/`.

## Endpoints principais

| Método | Rota |
|---|---|
| GET | `/api/health` |
| GET | `/api/parlamentares` |
| GET | `/api/parlamentares/{source}/{id}` |
| GET | `/api/parlamentares/{source}/{id}/proposicoes` |
| GET | `/api/assembleias` |
| GET | `/api/deputados` |
| GET | `/api/deputados/{id}` |
| GET | `/api/deputados/{id}/proposicoes` |
| GET | `/api/deputados/{id}/votos` |
| GET | `/api/deputados/{id}/presencas` |
| GET | `/api/partidos/{id}/membros` |
| GET | `/api/cache/stats` |
| POST | `/api/cache/purge` |
| POST | `/api/sync` |

Documentação completa: [docs/backend-api.md](./docs/backend-api.md).
