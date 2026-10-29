# Fontes públicas para completar perfis

> Pesquisa de endpoints (out/2026) cruzada com probes ao vivo neste ambiente.  
> Navegação: [Estaduais](./estaduais.md) · [Senado](./senado.md) · [Plano](./PLANO-EXPANSAO.md)

## Mapa do que faltava × o que existe

| Gap no produto | Fonte pública encontrada | Status no probe | Uso no Legis Watch |
|---|---|---|---|
| **MG — proposições** | CSV anual ALMG | **OK** | Implementado (CSV; API REST segue 403) |
| **MG — proposições (REST)** | `GET /api/v2/proposicoes/proposicao` | **403** Restricted | Não usar como caminho principal |
| **SP — cadastro** | `deputados.xml` ALESP | **OK** | Implementado (adapter live) |
| **SP — proposições** | `proposituras.zip` + `documento_autor.zip` | **OK** (~17 MB + ~6 MB) | Próximo (sync offline/cache) |
| **SP — presença** | `comissoes_permanentes_presencas.xml` | **OK** (~8 MB, só comissões) | Possível; não é plenário |
| **PE — proposições** | `/api/v1/proposicoes/{projetos\|indicacoes\|requerimentos}/` | Docs oficiais; **timeout** daqui | Documentado; falta filtro por autor |
| **DF — proposições** | CLDF PLE `POST /proposicao/filter` | **timeout** daqui | Promissor; re-tentar |
| **SAPL — votos/presença** | Models internos; painel autenticado | Sem endpoint útil por parlamentar | Continua sem |
| **Senado — presença** | Sem equivalente à Câmara | Confirmado | Disclaimer + tutorial |

---

## Minas Gerais (ALMG)

Docs: [dadosabertos.almg.gov.br](https://dadosabertos.almg.gov.br/)

| Recurso | Endpoint | Notas |
|---|---|---|
| Deputados em exercício | `GET /api/v2/deputados/em_exercicio?formato=json` | Live OK |
| Detalhe (filiações/mandatos) | `GET /api/v2/deputados/{id}?formato=json` | Live OK |
| Proposições (REST) | `GET /api/v2/proposicoes/proposicao?...` | **403** mesmo com intervalo |
| **Proposições (CSV)** | `GET /arquivo/proposicoes/download?ano={AAAA}` | **OK**; coluna `Autores` = JSON `[{id,nome,partido}]` |

Limites oficiais da API REST: máx. 2 concurrent, ≥1 s entre calls. O CSV anual evita o 403 e casa o `id` do deputado com `Autores[].id`.

Env: `ALMG_PROP_YEARS` (ex. `2026,2025`), `ALMG_CSV_TTL_MS`, `ALMG_CSV_BASE`.

---

## São Paulo (ALESP)

Portal: [dados-abertos ALESP](https://www.al.sp.gov.br/dados-abertos/)

| Recurso | URL | Notas |
|---|---|---|
| Deputados | `https://www.al.sp.gov.br/repositorioDados/deputados/deputados.xml` | Live OK (~94) |
| Proposituras | `.../processo_legislativo/proposituras.zip` | ~17 MB, XML |
| Autoria | `.../processo_legislativo/documento_autor.zip` | Liga `IdAutor` ↔ `IdDocumento` |
| Presença em comissões | `.../processo_legislativo/comissoes_permanentes_presencas.xml` | ~8 MB; não é plenário |
| Votações em comissões | `.../processo_legislativo/comissoes_permanentes_votacoes.xml` | ~67 MB |

A “API REST” do catálogo (`/dados-abertos/api/...`) devolve HTML/404; a fonte estável é o **repositório XML**.

---

## Pernambuco (ALEPE)

Portal: [dadosabertos.alepe.pe.gov.br](https://dadosabertos.alepe.pe.gov.br/)

| Recurso | Endpoint | Notas |
|---|---|---|
| Parlamentares | `/api/v1/parlamentares/?formato=json` | Já usado; daqui timeout → fixture |
| Projetos / indicações / requerimentos | `/api/v1/proposicoes/{tipo}/?ano=&legislatura=&formato=xml\|csv` | Docs OK; **sem filtro por autor** na listagem |
| Proposição unitária | `...?numero=&ano=` | XML completo |

Para preencher o perfil PE seria preciso baixar o ano, parsear autores no XML e indexar — não há `idDeputadoAutor` na listagem.

---

## Distrito Federal (CLDF)

Base: `https://ple.cl.df.gov.br/pleservico/api/public`

| Recurso | Endpoint | Notas |
|---|---|---|
| Filtrar proposições | `POST /proposicao/filter?page=&size=&sort=` | Documentado (JSON) |
| Autores | `GET /autor/listar` | Catálogo |
| Detalhe / tramitações | `GET /proposicao/{id}` (+ `/autores`, `/tramitacoes`) | |

Probe daqui: timeout. Vale retestar com egress liberado e então adapter `cldf`.

---

## SAPL (AC, AL, AM, PB, PI, RO, TO — já live)

Matérias/filiações/mandatos já entram via API SAPL.  
Votos nominais e presença existem no modelo (`VotoParlamentar`, `SessaoPlenariaPresenca`), mas **não há endpoint público estável por parlamentar** nas instâncias estaduais usadas (painel costuma exigir sessão). Relatórios HTML não são fonte confiável para o produto.

---

## Senado

Já cobertos: lista, filiações, mandatos, autorias, **votações** (`/senador/{codigo}/votacoes.json`).  
Presença: sem API equivalente à Câmara — manter disclaimer + [tutorial de assiduidade](https://www12.senado.leg.br/assessoria-de-imprensa/tutorial-de-verificacao-da-assiduidade-dos-senadores).

---

## Prioridade de implementação sugerida

1. **Feito:** ALMG proposições via CSV · ALESP cadastro XML  
2. **Próximo:** ALESP proposições (ZIP + autor) com cache em disco no sync  
3. **Depois:** CLDF PLE (quando a rede responder) · ALEPE proposições por parse de XML anual  
4. **Oportunista:** presença ALESP em comissões (com disclaimer de escopo)  
5. **Improvável no curto prazo:** votos/presença SAPL por parlamentar · presença Senado via API

---

## Continuar

- [Estaduais](./estaduais.md)
- [Plano de expansão](./PLANO-EXPANSAO.md)
