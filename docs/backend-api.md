# API interna — v1 (backend)

> Navegação: [Índice da documentação](./README.md) · [Guia do produto](./GUIA-DO-PRODUTO.md) · [Estaduais](./estaduais.md) · [APIs da Câmara](./apis-v1.md) · [README](../README.md)

Base local: `http://localhost:3456`

Todas as respostas são JSON. Dados vêm do banco local (SQLite em dev), alimentado pelos jobs de sync:

- **Federal:** API + arquivos anuais da Câmara
- **Estadual:** adapters por casa (PE/ALEPE live; demais UFs via fixture de cadastro até haver API)

---

## Health

```http
GET /api/health
```

Retorna `ok`, contagens básicas e último `SyncRun`.

---

## Deputados (federal)

Rotas legadas focadas na Câmara. Preferir `/api/parlamentares` para busca unificada.

```http
GET /api/deputados?nome=&siglaPartido=&siglaUf=&legislaturaId=&page=1&pageSize=20
GET /api/deputados/{id}
GET /api/deputados/{id}/proposicoes?page=1&pageSize=20&siglaTipo=PL
GET /api/deputados/{id}/votos?page=1&pageSize=20&year=2026&tipoVoto=Sim
GET /api/deputados/{id}/presencas?year=2026&page=1&pageSize=30&faltas=0
```

Headers de cache na listagem: `X-Cache: HIT|MISS`.

---

## Parlamentares (busca unificada)

```http
GET /api/parlamentares?esfera=federal_deputado|estadual_deputado|senador|todos&nome=&siglaPartido=&siglaUf=&legislaturaId=&page=1&pageSize=20
GET /api/parlamentares/{source}/{id}
GET /api/assembleias
```

### Parâmetros de busca

| Param | Default | Notas |
|---|---|---|
| `esfera` | `federal_deputado` | `federal_deputado`, `estadual_deputado`, `senador` ou `todos` |
| `nome` | — | contains (case-insensitive via SQLite) |
| `siglaPartido` | — | ex.: `PT`, `PL` |
| `siglaUf` | — | UF do mandato (federal) ou da casa (estadual) |
| `legislaturaId` | — | só federal; ignorado em `estadual_deputado` |
| `page` / `pageSize` | `1` / `20` | `pageSize` máx. 100 |

Resposta inclui `items[]` com `sphere`, `source`, `href`, `assemblyName`, etc. Cache em memória (`X-Cache`).

### Perfil estadual / senador

`GET /api/parlamentares/{source}/{id}` — ex.: `/api/parlamentares/alepe/joao-paulo` ou `/api/parlamentares/senado/5672`

Campos: nome, partido, UF, e-mail, `coverage` (search/profile/propositions/votes/attendance), `syncedAt`.

Perfil do Senado inclui `attendanceDisclaimer` (a API não publica presença equivalente à da Câmara).

### Catálogo de assembleias

`GET /api/assembleias` lista as 27 casas registradas, flags de cobertura e `syncedCount`.

Detalhes por UF: [estaduais.md](./estaduais.md).

---

## Partidos

```http
GET /api/partidos/{id}/membros?legislaturaId=57
```

---

## Eventos / ata (federal)

```http
GET /api/eventos/{id}/ata
```

Usado pela aba de presença do perfil federal (pauta + votações do dia).

---

## Cache

```http
POST /api/cache/purge
```

Invalida o prefixo de busca em memória. Também limpa automaticamente após syncs de cadastro (`deputies`, `mandates`, `estadual:*`, `parties`, `bootstrap`).

Envs: `SEARCH_CACHE_TTL_MS`, `SEARCH_CACHE_MAX` (ver [.env.example](../.env.example)).

---

## Sync (dev)

```http
POST /api/sync
Content-Type: application/json
x-sync-secret: <SYNC_SECRET se definido>

{
  "domain": "bootstrap" | "parties" | "deputies" | "propositions" | "votes" | "attendance" | "estadual" | "senadores",
  "deputyId": 204379,
  "year": 2026,
  "source": "all"
}
```

`domain=estadual`:

- `source` omitido ou `"all"` → sincroniza as **27 UFs**
- `source=alepe` (ou outra casa) → só aquela Assembleia

`domain=senadores` → lista atual do Senado (`/senador/lista/atual.json`).

Preferível via CLI:

```bash
npm run sync -- parties
npm run sync -- deputies
npm run sync -- propositions --deputy=204379
npm run sync -- votes --year=2026
npm run sync -- attendance --year=2026
npm run sync -- bootstrap
npm run sync -- estadual --source=all
npm run sync -- estadual --source=alepe
npm run sync -- senadores
```

Os syncs de `votes` e `attendance` usam os arquivos anuais da Câmara (bulk) e gravam em lote no SQLite. Presença na API federal considera só **Sessões Deliberativas** não canceladas no Plenário da Câmara.

O sync estadual usa adapters (`src/lib/parliament/adapters/`): PE via ALEPE (fallback fixture); demais UFs via fixture de cadastro até existir adapter live. O sync `senadores` usa Dados Abertos do Senado (fallback fixture).

---

## Variáveis de ambiente

Ver [.env.example](../.env.example). Destaques estaduais:

| Variável | Efeito |
|---|---|
| `ALEPE_API_BASE` | URL da lista de parlamentares ALEPE |
| `ALEPE_TIMEOUT_MS` | Timeout do fetch (default 15000) |
| `ALEPE_REQUIRE_LIVE=1` | Não cair no fixture se a API falhar |

---

## Continuar navegando

- [Índice da documentação](./README.md)
- [Deputados estaduais por UF](./estaduais.md)
- [Guia do produto](./GUIA-DO-PRODUTO.md)
- [APIs externas da Câmara](./apis-v1.md)
- [Plano de expansão + cache](./PLANO-EXPANSAO.md)
