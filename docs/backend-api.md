# API interna — v1 (backend)

Base local: `http://localhost:3456`

Todas as respostas são JSON. Dados vêm do banco local, alimentado pelos jobs de sync com a Câmara.

## Health

```http
GET /api/health
```

## Deputados

```http
GET /api/deputados?nome=&siglaPartido=&siglaUf=&legislaturaId=&page=1&pageSize=20
GET /api/deputados/{id}
GET /api/deputados/{id}/proposicoes?page=1&pageSize=20&siglaTipo=PL
GET /api/deputados/{id}/votos?page=1&pageSize=20&year=2026&tipoVoto=Sim
GET /api/deputados/{id}/presencas?year=2026&page=1&pageSize=30&faltas=0
```

## Partidos

```http
GET /api/partidos/{id}/membros?legislaturaId=57
```

## Sync (dev)

```http
POST /api/sync
Content-Type: application/json
x-sync-secret: <SYNC_SECRET se definido>

{
  "domain": "bootstrap" | "parties" | "deputies" | "propositions" | "votes" | "attendance",
  "deputyId": 204379,
  "year": 2026
}
```

Preferível via CLI:

```bash
npm run sync -- parties
npm run sync -- deputies
npm run sync -- propositions --deputy=204379
npm run sync -- votes --year=2026
npm run sync -- attendance --year=2026
npm run sync -- bootstrap
```

Os syncs de `votes` e `attendance` usam os arquivos anuais da Câmara (bulk) e gravam em lote no SQLite. Presença na API considera só **Sessões Deliberativas** não canceladas no Plenário da Câmara.


## Variáveis de ambiente

Ver [.env.example](../.env.example).
