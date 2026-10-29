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

- [**Índice da documentação**](./docs/README.md) — navega entre produto e técnica
- [Guia do usuário](./docs/GUIA-DO-PRODUTO.md) — telas e funcionalidades novas (com prints)
- [Deputados estaduais por UF](./docs/estaduais.md) — catálogo das 27 casas (live vs fixture)
- [Plano de expansão + cache](./docs/PLANO-EXPANSAO.md) — roadmap e status E0/E1 + cache
- [APIs externas da Câmara (v1)](./docs/apis-v1.md) — fontes oficiais do sync federal
- [API interna do produto](./docs/backend-api.md) — endpoints `/api/...`
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
```

## Dev server

```bash
npm run dev
```

App em [http://localhost:3456](http://localhost:3456) · API em `/api/health`.

### UI (v1)

- `/` — busca por esfera (federal / estadual / senador / todos), nome, partido, UF e mandato
- `/favoritos` — favoritos (federal, estadual e senador) no `localStorage` do navegador
- `/deputados/[id]` — perfil federal com abas de projetos, votações, presença e partido
- `/parlamentares/[source]/[id]` — perfil estadual (27 UFs) ou senador (`senado/{codigo}` com matérias, votações, filiações e mandatos)

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
| POST | `/api/cache/purge` |
| POST | `/api/sync` |

Documentação completa: [docs/backend-api.md](./docs/backend-api.md).
