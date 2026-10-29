# Legis Watch

Acompanhe deputados federais (Câmara) e o piloto estadual de Pernambuco (ALEPE): perfil, partido, proposições, votações e presença quando a casa publicar.

**Documentação:** [índice produto + técnica](./docs/README.md) · [guia do produto](./docs/GUIA-DO-PRODUTO.md)

**Monorepo (recomendado no v1):** backend (API + sync), frontend e docs no mesmo repositório. Repos separados só fazem sentido depois, se times/deploys se separarem.

## Stack

- Next.js 15 (App Router) + TypeScript
- Prisma + SQLite (dev; troque `DATABASE_URL` para Postgres em produção)
- Jobs CLI de sync com a Câmara

## Docs

Comece pelo índice e escolha o caminho:

- [**Índice da documentação**](./docs/README.md) — navega entre produto e técnica
- [Guia do produto](./docs/GUIA-DO-PRODUTO.md) — telas e funcionalidades (com prints)
- [Plano de expansão + cache](./docs/PLANO-EXPANSAO.md) — estaduais → senadores e cache de busca
- [APIs externas da Câmara (v1)](./docs/apis-v1.md) — fontes oficiais do sync
- [API interna do produto](./docs/backend-api.md) — endpoints `/api/...`
- [Estudo de viabilidade](./ESTUDO-VIABILIDADE.md)

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

# Votos e presença (arquivos anuais em lote)
npm run sync -- votes --year=2026
npm run sync -- attendance --year=2026

# Detalhar redes sociais dos primeiros N deputados
DEPUTY_DETAIL_LIMIT=50 npm run sync -- deputies

# Estaduais — todas as 27 UFs (PE via ALEPE; demais via fixture de cadastro)
npm run sync -- estadual --source=all

# Só PE (ALEPE live + fallback de fixture)
npm run sync -- estadual --source=alepe
```


## Dev server

```bash
npm run dev
```

App em [http://localhost:3456](http://localhost:3456) · API em `/api/health`.

### UI (v1)

- `/` — busca por esfera (federal / estadual / todos), nome, partido, UF e mandato
- `/favoritos` — favoritos federais no `localStorage` do navegador
- `/deputados/[id]` — perfil federal com abas de projetos, votações, presença e partido
- `/parlamentares/[source]/[id]` — perfil estadual mínimo (piloto ALEPE/PE)

## Testes (backend)

Meta: **≥ 90%** de cobertura unitária em `src/lib` + `src/app/api` (exceto I/O HTTP/bulk da Câmara) e **mutation testing** (Stryker) na lógica de domínio. Integração usa SQLite isolado (`prisma/test.db`) e as rotas reais.

```bash
npm test                   # unitários
npm run test:coverage      # cobertura com thresholds
npm run test:integration   # integração API ↔ Prisma (sem rede Câmara)
npm run test:all           # unitários + integração
npm run test:mutation      # Stryker (score de mutação)
```

Relatórios: `coverage/` e `reports/mutation/`.


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
