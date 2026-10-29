# Fontes públicas para completar perfis

> Pesquisa de endpoints (out/2026) cruzada com probes ao vivo neste ambiente.  
> Navegação: [Estaduais](./estaduais.md) · [Senado](./senado.md) · [Plano](./PLANO-EXPANSAO.md)

## Mapa do que faltava × o que existe

| Gap no produto | Fonte pública encontrada | Status no probe | Uso no Legis Watch |
|---|---|---|---|
| **MG — proposições** | CSV anual ALMG | **OK** | **Implementado** (CSV; API REST segue 403) |
| **MG — proposições (REST)** | `GET /api/v2/proposicoes/proposicao` | **403** Restricted | Não usar como caminho principal |
| **SP — cadastro** | `deputados.xml` ALESP | **OK** | **Implementado** |
| **SP — proposições** | `proposituras.zip` + `documento_autor.zip` | **OK** | **Implementado** (índice em `.cache/parliament`) |
| **SP — presença** | `comissoes_permanentes_presencas.xml` | **OK** (~8 MB, só comissões) | Ainda não (escopo ≠ plenário) |
| **PE — proposições** | `/api/v1/proposicoes/{projetos\|indicacoes\|requerimentos}/` | Docs OK; **timeout** daqui | **Implementado** (live + fixture de perfil) |
| **DF — proposições** | CLDF PLE `POST /proposicao/filter` | **timeout** daqui | Pendente (egress) |
| **SAPL — votos/presença** | Models internos; painel autenticado | Sem endpoint útil por parlamentar | Continua sem |
| **Senado — presença** | Sem equivalente à Câmara | Confirmado | Disclaimer + tutorial |

---

## Minas Gerais (ALMG)

| Recurso | Endpoint | Notas |
|---|---|---|
| Deputados em exercício | `GET /api/v2/deputados/em_exercicio?formato=json` | Live OK |
| Detalhe (filiações/mandatos) | `GET /api/v2/deputados/{id}?formato=json` | Live OK |
| Proposições (REST) | `GET /api/v2/proposicoes/proposicao?...` | **403** |
| **Proposições (CSV)** | `GET /arquivo/proposicoes/download?ano={AAAA}` | **OK**; `Autores[].id` |

Env: `ALMG_PROP_YEARS`, `ALMG_CSV_TTL_MS`, `ALMG_CSV_BASE`.

---

## São Paulo (ALESP)

| Recurso | URL | Notas |
|---|---|---|
| Deputados | `.../deputados/deputados.xml` | Live OK (~94) |
| Proposituras | `.../processo_legislativo/proposituras.zip` | Indexado no sync de perfil |
| Autoria | `.../processo_legislativo/documento_autor.zip` | Match por `IdAutor` ou `NomeAutor` |
| Naturezas | `.../processo_legislativo/naturezasSpl.xml` | Sigla do tipo |
| Presença em comissões | `.../comissoes_permanentes_presencas.xml` | Não usado ainda |

Cache: `.cache/parliament/alesp-props-v1.json` (`ALESP_CACHE_TTL_MS`, `ALESP_PROP_YEARS`).

---

## Pernambuco (ALEPE)

| Recurso | Endpoint | Notas |
|---|---|---|
| Parlamentares | `/api/v1/parlamentares/?formato=json` | Live com fallback fixture |
| Projetos / indicações / requerimentos | `/api/v1/proposicoes/{tipo}/?ano=&formato=xml` | Filtro por nome/slug do autor no XML |

Neste ambiente a API ALEPE costuma dar timeout → fixture de perfil (`estadual-perfil.json` → `alepe`).

---

## Distrito Federal (CLDF)

Base: `https://ple.cl.df.gov.br/pleservico/api/public` — documentada, **timeout** neste egress. Adapter live fica para quando a rede responder.

---

## SAPL / Senado

SAPL (7 UFs): matérias/filiações/mandatos já live; votos/presença sem endpoint útil por parlamentar.  
Senado: matérias + votos live; presença só disclaimer.

---

## Continuar

- [Estaduais](./estaduais.md)
- [Plano de expansão](./PLANO-EXPANSAO.md)
