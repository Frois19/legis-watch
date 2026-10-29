# Plano de expansão e cache — Legis Watch

> Navegação: [Índice](./README.md) · [Guia do produto](./GUIA-DO-PRODUTO.md) · [Estaduais](./estaduais.md) · [APIs Câmara](./apis-v1.md) · [API interna](./backend-api.md)

Situação: **federal completo** (Câmara) + **estadual em 27 UFs** (busca/perfil; PE live via ALEPE, demais fixture até adapter live). Este plano define o que falta:

1. Aprofundar **deputados estaduais** (proposições/votos/presença casa a casa)
2. Expansão para **senadores**
3. **Cache nas buscas** (já feito em memória; Redis em multi-instância)

---

## Situação atual

| Casa | Status |
|---|---|
| Câmara dos Deputados (federal) | Implementado (sync + UI) |
| Assembleias Legislativas (estadual) | 27 UFs: busca + perfil (PE live ALEPE; demais fixture de cadastro) |
| Senado Federal | Busca + perfil (lista, filiações, mandatos, matérias); votos em breve; presença com disclaimer |

Não existe API nacional única para deputados estaduais. Cada Assembleia publica (ou não) seus dados com formatos diferentes. Por isso a expansão estadual precisa ser **por adapter + rollout UFs**.

---

# Parte A — Deputados estaduais

## A.1 Objetivo

Permitir buscar e acompanhar deputados estaduais com o mesmo tipo de perfil do federal (quando a Assembleia publicar dados suficientes):

- busca (nome, partido, UF)
- projetos / proposições
- votações (quando houver nominal)
- presença / faltas (quando houver)
- partido / bancada

## A.2 Estratégia (por maturidade da fonte)

### Fase E0 — Modelo unificado (pré-requisito)

Antes de plugar UFs:

1. Introduzir no domínio o conceito de **casa / esfera**:
   - `sphere`: `federal_deputado` | `estadual_deputado` | `senador`
   - `source`: `camara` | `almg` | `alepe` | `alep` | … | `senado`
   - IDs compostos ou namespaced (`almg:123`, `camara:204515`) para evitar colisão
2. Adaptar a busca e o perfil para filtrar por esfera + UF
3. Criar interface `StateAssemblyAdapter` com métodos:
   - `listParliamentarians()`
   - `getParliamentarian(id)`
   - `listPropositions(authorId)`
   - `listVotes(parliamentarianId, year?)`
   - `listAttendance(parliamentarianId, year?)` (opcional)

### Fase E1 — Pilotos (alta maturidade)

Começar com Assembleias que já têm API JSON documentada:

| UF | Casa | Base / portal | Motivo |
|---|---|---|---|
| MG | ALMG | `https://dadosabertos.almg.gov.br/` (Swagger) | API madura, proposições e processo legislativo |
| PE | ALEPE | `https://dadosabertos.alepe.pe.gov.br/api/v1/` | API simples de parlamentares |
| PR | ALEP | `http://webservices.assembleia.pr.leg.br/api/public` | Proposições + autores + status |
| MT | ALMT | portal de dados abertos / API documentada | Alta maturidade (pesquisa 2025) |
| DF | CLDF | dados abertos da Câmara Legislativa | Alta maturidade |

**Entrega E1:** 1–2 UFs completas (ex.: **MG + PE**) com busca + perfil mínimo + proposições; votos/presença se a API permitir.

### Fase E2 — Casas SAPL / cobertura média

Várias Assembleias usam **SAPL** (Interlegis) com API semelhante:

- Exemplos: AC (ALEAC), AM (ALEAM), e outras com Swagger SAPL
- Endpoints típicos (padrão SAPL; path pode variar por casa):
  - parlamentares / autores
  - matérias / proposições
  - tramitações
  - composições de comissão

**Entrega E2:** adapter genérico `SaplAdapter` + config por UF (base URL).

### Fase E3 — UFs sem API boa

SP, RJ, BA e outras com transparência sobretudo em HTML/PDF:

- não bloquear o produto nacional
- opções: (a) só link externo para a Assembleia; (b) importação manual/CKAN se houver CSV; (c) scraper **só** se houver base legal/ToS claros (evitar no v1 estadual)

## A.3 Endpoints a utilizar (estaduais)

### A.3.1 ALEPE (PE)

Base: `https://dadosabertos.alepe.pe.gov.br/api/v1`

| Uso | Endpoint |
|---|---|
| Lista / busca de parlamentares | `GET /parlamentares/?formato=json` |
| Filtro por partido | `GET /parlamentares/?partido={sigla}&formato=json` |

Campos típicos: `nomeParlamentar`, `partido`, e-mail. Cobertura de votos/presença pode exigir outros datasets do portal ALEPE — mapear no onboarding da UF.

### A.3.2 ALEP (PR)

Base: `http://webservices.assembleia.pr.leg.br/api/public`

| Uso | Endpoint |
|---|---|
| Metadados de pesquisa legislativa | `GET /proposicao/campos` |
| Listagem / filtro de proposições | `GET /proposicao` (filtros: `codigoTipoProposicao`, `dataInicial`, `dataFinal`, `assunto`, `emenda`, autor, status, etc.) |
| Autores (via campos de pesquisa) | lista em `/proposicao/campos` → `autor[]` |

Parlamentares: complementar com endpoints de transparência/deputados do mesmo portal (mapear no adapter PR). Rate limit documentado (`429`).

### A.3.3 ALMG (MG)

Base: `https://dadosabertos.almg.gov.br/`  
Docs: Swagger em `/api/ajuda/swagger/view/lastest`

| Uso | Endpoint (família) |
|---|---|
| Ajuda / catálogo | `GET /api/ajuda/...` |
| Parlamentares | endpoints de deputados/parlamentares no Swagger ALMG |
| Proposições / projetos | endpoints de proposições / tramitação |
| Votações / presença | conforme disponível no Swagger (validar cobertura) |

Restrições ALMG: poucas requisições simultâneas e intervalo ≥ 1 s entre chamadas — o sync precisa respeitar isso.

### A.3.4 SAPL (padrão multi-UF)

Base (exemplo AC): portal `.../dados-abertos` + API SAPL da casa.

| Uso | Família de endpoints SAPL |
|---|---|
| Parlamentares / autores | API SAPL de parlamentares / autores |
| Matérias | API SAPL de matérias |
| Tramitação | API SAPL de tramitação |
| Comissões / mesa | API SAPL de composição |

Cada UF SAPL recebe só a **base URL** + mapeamento de campos no adapter.

### A.3.5 Mudanças na API interna do Legis Watch

| Método | Rota | Status |
|---|---|---|
| GET | `/api/parlamentares?esfera=estadual_deputado&siglaUf=MG&nome=` | Feito (busca unificada + cache) |
| GET | `/api/parlamentares/{source}/{id}` | Feito (perfil namespaced) |
| GET | `/api/parlamentares/{source}/{id}/proposicoes` | Pendente (quando a casa publicar) |
| GET | `/api/parlamentares/{source}/{id}/votos` | Pendente |
| GET | `/api/parlamentares/{source}/{id}/presencas` | Pendente |
| GET | `/api/assembleias` | Feito (27 UFs + `syncedCount`) |
| POST | `/api/sync` | Feito (`domain=estadual`, `source=all\|alepe\|…`) |

Catálogo detalhado: [estaduais.md](./estaduais.md).

## A.4 Riscos estaduais

- Cobertura desigual: nem toda UF terá votos/presença
- Schemas instáveis e sem versionamento
- IDs locais não batem com TSE/Câmara
- Rate limits agressivos (ALMG, ALEP)
- UI precisa deixar claro “dados da Assembleia de {UF}” e gaps

## A.5 Critérios de pronto (estadual piloto)

- [x] Modelo `sphere/source` no Prisma (`StateDeputy` / `StateProposition`)
- [x] Busca federal + estadual (filtro UF/esfera) via `/api/parlamentares`
- [x] Perfil PE (ALEPE) com nome/partido/e-mail; proposições ainda não (API)
- [x] Doc por UF: endpoints ALEPE + cobertura no catálogo `/api/assembleias`
- [x] Testes de adapter com fixtures (sem rede)
- [x] Perfil MG (ALMG) live + filiações/mandatos (proposições API 403)
- [x] Adapter SAPL multi-UF (AC/AL/AM/PB/PI/RO/TO) com matérias
- [ ] Votos/presença estadual quando a casa publicar voto nominal por parlamentar

### A.6 Status E0 / E1

| Item | Status |
|---|---|
| E0 tipos `sphere` / `source` + IDs namespaced | Feito (`src/lib/parliament/`) |
| E0 `StateAssemblyAdapter` | Feito |
| E1 adapter ALEPE (PE) + fixture fallback | Feito |
| E1 sync `npm run sync -- estadual --source=alepe` | Feito |
| E1 UI filtro de esfera + perfil `/parlamentares/[source]/[id]` | Feito |
| E1 cobertura 27 UFs (fixture + matriz de testes) | Feito |
| E1 ALMG (MG) live + filiações/mandatos | Feito (proposições bloqueadas na API) |
| E2 SAPL multi-UF (7 casas) + matérias | Feito |

---

# Parte B — Senadores (depois dos estaduais)

## B.1 Objetivo

Mesmo produto para senadores em exercício / por legislatura, com disclaimer forte em **presença** (API frágil).

## B.2 Ordem sugerida

1. Cadastro + detalhe + partido/filiação  
2. Matérias de autoria  
3. Votações nominais  
4. Presença (só com metodologia explícita; preferir inferência por votações + link ao Diário)

## B.3 Endpoints a utilizar (Senado)

Base: `https://legis.senado.leg.br/dadosabertos`  
Docs: [Swagger Senado](https://legis.senado.leg.br/dadosabertos/api-docs/swagger-ui/index.html)

Preferir sufixo `.json` ou `Accept: application/json`.

### Parlamentares

| Uso | Endpoint |
|---|---|
| Senadores em exercício | `GET /senador/lista/atual.json` |
| Por legislatura | `GET /senador/lista/legislatura/{legislatura}.json` |
| Intervalo de legislaturas | `GET /senador/lista/legislatura/{inicio}/{fim}.json` |
| Afastados | `GET /senador/afastados.json` |
| Detalhe | `GET /senador/{codigo}.json` |
| Mandatos | `GET /senador/{codigo}/mandatos.json` |
| Filiações | `GET /senador/{codigo}/filiacoes.json` |
| Licenças | `GET /senador/{codigo}/licencas.json` |
| Comissões | `GET /senador/{codigo}/comissoes.json` |
| Cargos | `GET /senador/{codigo}/cargos.json` |
| Partidos | `GET /senador/partidos.json` |

### Matérias / projetos

| Uso | Endpoint |
|---|---|
| Pesquisa de matérias | `GET /materia/pesquisa/lista.json?nomeAutor=...` (e filtros de ano/período; limite típico de 1 ano no período) |
| Autorias (legado) | `GET /senador/{codigo}/autorias` (**deprecated**) |
| Relatorias (legado) | `GET /senador/{codigo}/relatorias` (**deprecated**) |

### Votações

| Uso | Endpoint |
|---|---|
| Votos nominais (preferir) | `GET /votacao` (processos legislativos) |
| Votações do senador (legado) | `GET /senador/{codigo}/votacoes` (**deprecated**) |
| Votações em comissão por parlamentar | `GET /votacaoComissao/parlamentar/{codigo}` |
| Votações em comissão por matéria | `GET /votacaoComissao/materia/{sigla}/{numero}/{ano}` |
| Tipos de comparecimento | `GET /plenario/lista/tiposComparecimento` |
| Listas plenário por data (legado) | `GET /plenario/lista/votacao/{data}` / `{inicio}/{fim}` (**deprecated**) |

### API interna nova

| Método | Rota |
|---|---|
| GET | `/api/senadores` / `/api/parlamentares?esfera=senador` |
| GET | `/api/senadores/{codigo}` |
| GET | `/api/senadores/{codigo}/proposicoes` |
| GET | `/api/senadores/{codigo}/votos` |
| GET | `/api/senadores/{codigo}/presencas` (com disclaimer) |
| POST | `/api/sync` → `domain=senators` |

## B.4 Gap crítico — presença no Senado

Não há equivalente confiável ao bulk/presença da Câmara. Plano:

1. UI: “assiduidade aproximada / sem registro oficial via API”
2. Proxy: presença em votações nominais do período
3. Link para o Diário do Senado / listas oficiais
4. Nunca apresentar “falta” senatorial com a mesma certeza do federal

## B.5 Critérios de pronto (Senado)

- [x] Sync de lista atual (`npm run sync -- senadores`) + perfil
- [x] Perfil com filiações, mandatos e matérias (autorias sob demanda)
- [ ] Votações nominais
- [x] Disclaimer de presença no perfil
- [x] Busca unificada federal / estadual / senador
- [x] Testes com fixtures do Senado

### B.6 Status S1

| Item | Status |
|---|---|
| Model `Senator` + IDs `senado:{codigo}` | Feito |
| Client Senado + fixture fallback | Feito |
| Sync / API `/api/parlamentares?esfera=senador` | Feito |
| Filiações / mandatos / matérias + UI em abas | Feito |
| UI esfera Senadores + perfil | Feito |
| Votações nominais | Pendente |

---

# Parte C — Cache nas buscas

## C.1 Problema hoje

`GET /api/deputados` consulta o SQLite em toda request (filtros `nome`, `partido`, `UF`, `legislaturaId`, paginação). Funciona, mas:

- busca digitada gera rajadas de requests parecidas
- com expansão estadual/Senado o volume e o custo crescem
- syncs invalidam resultados sem política clara

## C.2 Objetivos

- Resposta rápida para consultas repetidas
- Cache seguro (não servir dado “podre” após sync)
- Implementação simples no monorepo atual; caminho para Redis em produção

## C.3 O que cachear

| Camada | O quê | TTL sugerido |
|---|---|---|
| **L1 — API de busca** | Resposta JSON de `/api/deputados` (e futuras `/api/parlamentares`) por querystring normalizada | 60–300 s |
| **L1b — legislaturas / partidos** | Listas quase estáticas | 1–24 h |
| **L2 — perfil agregado** | Bundle do perfil (projetos/votos/presença já syncados) | 30–120 s, ou até próximo sync do deputado |
| **Não cachear** | `POST /api/sync`, enrich sob demanda com efeito colateral, favoritos (client-only) | — |

## C.4 Chave de cache

Normalizar:

```text
search:v1:{esfera}:{legislaturaId}:{nomeLower}:{partidoUpper}:{uf}:{page}:{pageSize}
```

Regras:

- trim + lowercase no nome
- partido/UF em uppercase
- params vazios → token `_`
- versionar prefixo (`v1`) para invalidar em mudança de schema

## C.5 Desenho de implementação (incremental)

### C1 — Cache em memória (já no federal)

1. Módulo `src/lib/cache/memory-cache.ts` (Map + TTL + LRU max entries)
2. Wrapper em `GET /api/deputados`:
   - hit → devolve JSON
   - miss → Prisma → grava cache
3. Métricas simples em log: `hit/miss`
4. Env: `SEARCH_CACHE_TTL_MS`, `SEARCH_CACHE_MAX`

### C2 — Invalidação

- Ao concluir sync de `deputies` / `mandates` / adapters estaduais: `cache.invalidatePrefix("search:")`
- Endpoint opcional admin: `POST /api/cache/purge` (protegido em prod)

### C3 — Índices no SQLite/Postgres

Independente do cache HTTP:

- índice em `Deputy(nome)`, `Deputy(nomeEleitoral)`, `Deputy(siglaPartido, siglaUf)`
- índice em `DeputyMandate(legislaturaId, siglaPartido, siglaUf, nomeEleitoral)`
- em Postgres futuro: `pg_trgm` para `ILIKE`/contains

### C4 — Redis (produção)

Quando houver multi-instância:

- trocar backend do cache por Redis (`SET key json EX ttl`)
- mesma chave e invalidação por prefixo/tag
- manter memory cache como fallback local opcional

### C5 — Cache de UX (front)

- `useDeferredValue` / debounce 250–400 ms na busca (já reduz miss storm)
- SWR/React Query opcional com `staleTime` alinhado ao TTL do back
- Não substituir o cache de servidor

## C.6 Pseudocódigo (API)

```ts
const key = searchCacheKey(params);
const cached = await cache.get(key);
if (cached) return NextResponse.json(cached);

const result = await queryDeputies(params); // Prisma atual
await cache.set(key, result, ttlMs);
return NextResponse.json(result);
```

## C.7 Critérios de pronto (cache)

- [x] TTL configurável e LRU com teto de memória
- [x] Invalidação após sync de cadastro (inclui `estadual:*`)
- [x] Testes: hit devolve o mesmo payload; purge limpa
- [x] Busca com debounce no front
- [x] Doc no README: envs de cache

## C.8 Ordem sugerida vs expansão

```text
Agora          → C1 + C2 + C3 + debounce (benefício imediato no federal)
Em paralelo E0 → modelo unificado sphere/source
Depois         → E1 (MG/PE) reusando a mesma busca cacheada
Depois         → Senado (Parte B)
Produção       → C4 Redis se houver mais de uma instância
```

## C.9 Status de implementação

| Item | Status |
|---|---|
| C1 Memory cache + TTL/LRU | Feito (`src/lib/cache/`, header `X-Cache`) |
| C2 Invalidação pós-sync + `POST /api/cache/purge` | Feito |
| C3 Índices Prisma de busca | Feito |
| Debounce na UI (300 ms) | Feito |
| Cache em `/api/parlamentares` (esfera na chave) | Feito |
| C4 Redis | Pendente (multi-instância) |

---

## Resumo executivo

| Prioridade | Trabalho | Status |
|---|---|---|
| 1 | Cache de busca (C1–C3) | Feito (Redis = C4 pendente) |
| 2 | Modelo unificado + ALEPE + 27 UFs (E0–E1 base) | Feito (busca/perfil) |
| 3 | Adapters live (ALMG, ALEP, SAPL…) + proposições | Próximo |
| 4 | Senadores (lista + perfil enriquecido) | Feito (votos ainda pendentes) |

Continuar: [Índice](./README.md) · [Estaduais](./estaduais.md) · [APIs Câmara](./apis-v1.md) · [API interna](./backend-api.md)
