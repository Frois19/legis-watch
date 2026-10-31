# Fontes públicas para completar perfis

> Pesquisa de endpoints (out/2026) cruzada com probes ao vivo neste ambiente.  
> Navegação: [Estaduais](./estaduais.md) · [Senado](./senado.md) · [Plano](./PLANO-EXPANSAO.md) · [Cache](#cache-http-unificado)

## Mapa do que faltava × o que existe

| Gap no produto | Fonte pública encontrada | Status no probe | Uso no Legis Watch |
|---|---|---|---|
| **MG — proposições** | CSV anual ALMG | **OK** | **Implementado** (CSV; API REST segue 403) |
| **MG — proposições (REST)** | `GET /api/v2/proposicoes/proposicao` | **403** Restricted | Não usar como caminho principal |
| **SP — cadastro** | `deputados.xml` ALESP | **OK** | **Implementado** |
| **SP — proposições** | `proposituras.zip` + `documento_autor.zip` | **OK** | **Implementado** (índice em `.cache/parliament`) |
| **SP — presença comissões** | caminho antigo `comissoes_permanentes_presencas.xml` | **404** agora | Fora (escopo ≠ plenário) |
| **PR — cadastro** | Transparência `/api/remuneracao?t=deputado estadual` | **OK** | **Implementado** (matrícula) |
| **PR — proposições** | `POST .../proposicao/filtrar` | **OK** | **Implementado** |
| **PR — presença plenário** | `/api/presenca/ano?ano=` | **OK** (78 sessões/2024; 90/2025) | **Implementado** (perfil + `StateAttendance`) |
| **PR — votos** | `/api/votacoes/sessoes` + ZIP/XLSX por sessão | **OK** | Indexado no perfil (`StateVote`); limite de sessões via env |
| **PE — proposições** | `/api/v1/proposicoes/{projetos\|indicacoes\|requerimentos}/` | Docs OK; **timeout** daqui | **Implementado** (live + fixture de perfil) |
| **DF — proposições** | CLDF PLE `POST /proposicao/filter` + CKAN | **timeout** daqui | Pendente (egress) |
| **MT — dados abertos** | host `dadosabertos.al.mt.gov.br` | **DNS fail** | Pendente |
| **SAPL — votos/presença** | Models internos; painel autenticado | Sem endpoint útil por parlamentar | Continua sem |
| **Senado — presença** | Sem equivalente estruturado na API Dados Abertos | Confirmado | Disclaimer + tutorial |
| **ConsultaSIP** | Azure `ConsultaSIP.asmx` | **OK** | **Câmara Municipal SP** (`sip.saopaulo.sp.leg.br`) — **não** é Senado nem ALESP |

---

## Cache HTTP unificado

Todas as consultas externas de assembleias / Senado passam por `src/lib/cache/http-cache.ts`:

- memória (LRU simples) + disco em `.cache/parliament/http-*.json`
- chave = `namespace` + hash(`METHOD`, URL, body)
- TTL padrão `HTTP_CACHE_TTL_MS` (6 h); overrides por casa (`ALEP_CACHE_TTL_MS`, `ALMG_CSV_TTL_MS`, `ALESP_CACHE_TTL_MS`, `ALEPE_CACHE_TTL_MS`, `SAPL_CACHE_TTL_MS`, `SENADO_CACHE_TTL_MS`)
- `HTTP_CACHE_DISK=0` desliga persistência em disco

Além disso:

| Camada | Onde |
|---|---|
| Índice ALESP de proposições | `.cache/parliament/alesp-props-v1.json` |
| Busca unificada | `MemoryCache` (`SEARCH_CACHE_TTL_MS`) |
| Câmara federal | persistência SQLite após sync (não reconsulta a cada perfil) |

---

## Minas Gerais (ALMG)

| Recurso | Endpoint | Notas |
|---|---|---|
| Deputados em exercício | `GET /api/v2/deputados/em_exercicio?formato=json` | Live OK + cache |
| Detalhe (filiações/mandatos) | `GET /api/v2/deputados/{id}?formato=json` | Live OK + cache |
| Proposições (REST) | `GET /api/v2/proposicoes/proposicao?...` | **403** |
| **Proposições (CSV)** | `GET /arquivo/proposicoes/download?ano={AAAA}` | **OK** + cache |

Env: `ALMG_PROP_YEARS`, `ALMG_CSV_TTL_MS`, `ALMG_CSV_BASE`.

---

## São Paulo (ALESP)

| Recurso | URL | Notas |
|---|---|---|
| Deputados | `.../deputados/deputados.xml` | Live OK (~94) + cache HTTP |
| Proposituras | `.../processo_legislativo/proposituras.zip` | Indexado no sync de perfil |
| Autoria | `.../processo_legislativo/documento_autor.zip` | Match por `IdAutor` ou `NomeAutor` |
| Naturezas | `.../processo_legislativo/naturezasSpl.xml` | Sigla do tipo |

Cache: HTTP para XML + `.cache/parliament/alesp-props-v1.json` (`ALESP_CACHE_TTL_MS`, `ALESP_PROP_YEARS`).

---

## Paraná (ALEP) — novo

| Recurso | Endpoint | Notas |
|---|---|---|
| Cadastro (folha) | `GET https://transparencia.assembleia.pr.leg.br/api/remuneracao?t=deputado%20estadual&mes=&ano=&page=` | Header `X-Requested-With`; ~54–56 ativos |
| Metadados pesquisa | `GET http://webservices.assembleia.pr.leg.br/api/public/proposicao/campos` | Tipos, assuntos, autores |
| Proposições | `POST .../proposicao/filtrar` body `{"ano":AAAA,"numeroMaximoRegistro":N}` | **GET `/filtrar` 400**; usar POST |
| Presença plenário | `GET .../api/presenca/ano?ano=` | Colunas independentes PRESENTES / JUSTIFICADOS / AUSENTES |
| Sessões com voto | `GET .../api/votacoes/sessoes?ano=` | Mapa id→nome |
| ZIP votos da sessão | `GET .../api/votacoes/dados-abertos?sessao=` | URL do ZIP; nem toda sessão publica arquivo |
| Conteúdo do ZIP | XLSX por item (PARLAMENTAR / PARTIDO / VOTO) | Parser OOXML interno |

Env: `ALEP_PROP_YEARS`, `ALEP_ATTENDANCE_YEARS`, `ALEP_VOTE_YEARS`, `ALEP_VOTE_SESSION_LIMIT`, `ALEP_CACHE_TTL_MS`, `ALEP_WS_BASE`, `ALEP_TRANSPARENCIA_BASE`, `ESTADUAL_ATTENDANCE_LIMIT`, `ESTADUAL_VOTE_LIMIT`.

---

## Pernambuco (ALEPE)

| Recurso | Endpoint | Notas |
|---|---|---|
| Parlamentares | `/api/v1/parlamentares/?formato=json` | Live com fallback fixture + cache |
| Projetos / indicações / requerimentos | `/api/v1/proposicoes/{tipo}/?ano=&formato=xml` | Filtro por nome/slug do autor no XML + cache |

Neste ambiente a API ALEPE costuma dar timeout → fixture de perfil (`estadual-perfil.json` → `alepe`).

---

## Distrito Federal (CLDF)

Base documentada: `https://ple.cl.df.gov.br/pleservico/api/public`  
Portal CKAN: `https://dados.cl.df.gov.br/` (JSON/CSV anuais de proposições).

Ambos **timeout** neste egress. Adapter live fica para quando a rede responder; até lá DF permanece fixture.

---

## ConsultaSIP (não usar no Senado / ALESP)

`https://app-sipws-prd.azurewebsites.net/Servico/ConsultaSIP.asmx`

- Resposta JSON envelopada em XML com namespace `http://sip.saopaulo.sp.leg.br/`
- Nomes batem com vereadores da Câmara Municipal de São Paulo
- Operações: `JsonPresencaAnoMes`, `JsonVotacaoAnoMes`, etc.
- **Fora do escopo** estadual/federal deste produto

---

## SAPL / Senado

SAPL (7 UFs): matérias/filiações/mandatos já live + cache HTTP; votos/presença sem endpoint útil por parlamentar.  
Senado: matérias + votos live + cache HTTP; presença só disclaimer (Diário / tutorial oficial).

---

## Continuar

- [Estaduais](./estaduais.md)
- [Plano de expansão](./PLANO-EXPANSAO.md)
