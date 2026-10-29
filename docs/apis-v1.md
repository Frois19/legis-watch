# APIs externas — v1 (apenas deputados federais)

> Navegação: [Índice da documentação](./README.md) · [Guia do produto](./GUIA-DO-PRODUTO.md) · [API interna](./backend-api.md) · [README](../README.md)

Catálogo das fontes oficiais que o backend do **v1** vai consumir. Escopo: **Câmara dos Deputados** apenas. Senado fica fora desta versão.

- **Auth:** nenhuma (dados abertos públicos)
- **Base REST:** `https://dadosabertos.camara.leg.br/api/v2`
- **Base arquivos:** `https://dadosabertos.camara.leg.br/arquivos`
- **Formato preferido:** JSON (`Accept: application/json` na REST; `/json/` nos downloads)
- **Docs oficiais:** [Swagger Câmara](https://dadosabertos.camara.leg.br/swagger/api.html)

Sempre chamar estas APIs **pelo backend** (jobs de sync / Route Handlers). Não consumir direto do browser (CORS, rate limit, timeouts).

---

## Mapa rápido: feature → fonte

| Feature do produto | Fonte no v1 |
|---|---|
| Buscar / listar deputados | REST `/deputados` |
| Perfil (foto, partido, UF, redes) | REST `/deputados/{id}` |
| Partido + outros membros | REST `/partidos/{id}` e `/partidos/{id}/membros` |
| Projetos propostos | REST `/proposicoes?idDeputadoAutor=` (+ detalhe) |
| Histórico de votações | Bulk `votacoes-{ano}` + `votacoesVotos-{ano}` (REST sob demanda) |
| Presença / faltas | Bulk `eventos-{ano}` + `eventosPresencaDeputados-{ano}` (+ SOAP opcional) |
| Favoritos | **API própria** (não existe na Câmara) |

---

## 1. REST — Deputados

### 1.1 Listar / pesquisar

```http
GET /api/v2/deputados
```

**Query params úteis no v1**

| Param | Uso |
|---|---|
| `nome` | Busca por parte do nome parlamentar |
| `siglaPartido` | Filtrar partido (ex.: `PT`, `MDB`) |
| `siglaUf` | Filtrar UF |
| `idLegislatura` | Legislatura atual (ex.: `57`) |
| `pagina`, `itens` | Paginação |
| `ordem`, `ordenarPor` | Ordenação (`nome`, `id`, …) |

**Exemplo**

```text
https://dadosabertos.camara.leg.br/api/v2/deputados?nome=favacho&idLegislatura=57&ordem=ASC&ordenarPor=nome
```

**Campos típicos da listagem:** `id`, `uri`, `nome`, `siglaPartido`, `uriPartido`, `siglaUf`, `idLegislatura`, `urlFoto`, `email`.

**Foto:** `urlFoto` aponta para o CDN da Câmara  
(`https://www.camara.leg.br/internet/deputado/bandep/{id}.jpg`).  
Se vier vazio, o backend/front montam essa URL pelo `id`.

**Uso no produto:** tela de busca e seed de cadastro.

---

### 1.2 Detalhe do perfil

```http
GET /api/v2/deputados/{id}
```

**Exemplo**

```text
https://dadosabertos.camara.leg.br/api/v2/deputados/204379
```

**Campos relevantes**

| Campo | Uso |
|---|---|
| `nomeCivil`, `ultimoStatus.nome`, `ultimoStatus.nomeEleitoral` | Identidade |
| `ultimoStatus.siglaPartido`, `ultimoStatus.siglaUf` | Partido / UF |
| `ultimoStatus.urlFoto` | Foto |
| `ultimoStatus.gabinete` | Contato do gabinete |
| `ultimoStatus.situacao`, `condicaoEleitoral` | Status do mandato |
| `redeSocial[]` | Links de redes (Twitter/X, Facebook, YouTube, etc.) |
| `dataNascimento`, `municipioNascimento`, `escolaridade` | Bio opcional |

**Uso no produto:** cabeçalho do perfil + redes sociais.

---

## 2. REST — Partidos

### 2.1 Detalhe do partido

```http
GET /api/v2/partidos/{id}
```

O `id` (ou `uriPartido`) vem da listagem/detalhe do deputado.

### 2.2 Membros do partido

```http
GET /api/v2/partidos/{id}/membros
```

**Query útil:** `idLegislatura` para membros da legislatura atual.

**Uso no produto:** bloco “outros membros deste partido” no perfil.

**Observação:** a mesma sigla pode ter ids diferentes entre legislaturas — sempre persistir `id` + `idLegislatura`.

---

## 3. REST — Proposições (projetos)

### 3.1 Listar proposições de um autor

```http
GET /api/v2/proposicoes?idDeputadoAutor={id}
```

**Query params úteis**

| Param | Uso |
|---|---|
| `idDeputadoAutor` | ID do deputado (obrigatório para esta feature) |
| `siglaTipo` | Filtrar tipo (`PL`, `PEC`, `PLP`, …) |
| `ano` | Ano de apresentação |
| `ordem`, `ordenarPor` | Ex.: `DESC` + `id` |
| `pagina`, `itens` | Paginação |

**Exemplo**

```text
https://dadosabertos.camara.leg.br/api/v2/proposicoes?idDeputadoAutor=204379&siglaTipo=PL&ordem=DESC&ordenarPor=id&itens=15
```

**Campos típicos:** `id`, `uri`, `siglaTipo`, `numero`, `ano`, `ementa`, `dataApresentacao`.

### 3.2 Detalhe da proposição

```http
GET /api/v2/proposicoes/{id}
```

Inclui ementa completa, status/tramitação recente e metadados.

### 3.3 Autores da proposição (opcional)

```http
GET /api/v2/proposicoes/{id}/autores
```

**Uso no produto:** distinguir autor principal vs coautor.

### 3.4 Votações ligadas à proposição (opcional / enriquecimento)

```http
GET /api/v2/proposicoes/{id}/votacoes
```

**Uso no produto:** ligar um projeto às votações em que ele entrou.

**Observação:** proposições incluem muitos tipos (requerimentos, etc.). No v1, filtrar tipos legislativos principais (`PL`, `PEC`, `PLP`, `PDC`, …) na UI ou no sync.

---

## 4. REST — Votações (complemento pontual)

Preferência do v1: **arquivos anuais** (seção 5). Usar REST só para detalhe sob demanda.

### 4.1 Detalhe de uma votação

```http
GET /api/v2/votacoes/{id}
```

### 4.2 Votos de uma votação

```http
GET /api/v2/votacoes/{id}/votos
```

Retorna quem registrou voto/obstrução. **Ausentes não aparecem nesta lista.**

**Posições comuns:** `Sim`, `Não`, `Abstenção`, `Obstrução`, e variações registradas pela Câmara.

---

## 5. Downloads anuais (bulk) — preferidos para sync

Atualização diária no portal. Preferir formato `json` (ou `csv` se o parse for mais simples).

### 5.1 Metadados das votações

```text
https://dadosabertos.camara.leg.br/arquivos/votacoes/json/votacoes-{ano}.json
```

Inclui id da votação, data/hora, descrição do resultado, órgão/evento, placar resumido, aprovação, proposições relacionadas quando disponíveis.

### 5.2 Voto de cada parlamentar

```text
https://dadosabertos.camara.leg.br/arquivos/votacoesVotos/json/votacoesVotos-{ano}.json
```

Cada registro: identificadores da votação + do deputado + valor do voto + horário.

**Uso no produto:** histórico “votou a favor/contra neste projeto”. Indexar no banco por `deputadoId`.

### 5.3 Eventos (sessões, reuniões, etc.)

```text
https://dadosabertos.camara.leg.br/arquivos/eventos/json/eventos-{ano}.json
```

Datas, tipo, local e descrição do evento — necessários para montar o calendário de presença.

### 5.4 Presença de deputados nos eventos

```text
https://dadosabertos.camara.leg.br/arquivos/eventosPresencaDeputados/json/eventosPresencaDeputados-{ano}.json
```

Liga `idEvento` ↔ `idDeputado` quando houve marcação de presença.

**Como derivar faltas no v1**

1. Definir o conjunto de eventos relevantes (ex.: sessões deliberativas de plenário a partir de `eventos-{ano}`).
2. Cruzar com `eventosPresencaDeputados-{ano}`.
3. Evento relevante **sem** registro de presença do deputado → candidato a “falta” (exibir com a ressalva metodológica abaixo).

**Ressalva de produto:** presença oficial da Câmara é por evento/sessão registrada — não é “todos os dias úteis do calendário civil”.

---

## 6. SOAP legado — presença em plenário (opcional no v1)

Complemento se o bulk de eventos não cobrir bem o plenário.

| Item | Valor |
|---|---|
| Serviço | `ListarPresencasParlamentar` |
| WSDL / endpoint | `https://www.camara.gov.br/SitCamaraWS/SessoesReunioes.asmx?wsdl` |
| Protocolos | SOAP, HTTP GET, HTTP POST |
| Docs | [ListarPresencasParlamentar](https://www2.camara.leg.br/transparencia/dados-abertos/dados-abertos-legislativo/webservices/sessoesreunioes-2/listarpresencasparlamentar) |

**Parâmetros**

| Param | Descrição |
|---|---|
| `dataIni` | Data inicial |
| `dataFim` | Data final |
| `numMatriculaParlamentar` | Matrícula do parlamentar (via serviço legado `ObterDeputados`, distinta do `id` da API v2) |

**Retorno:** sessões do período e presença do parlamentar por dia/sessão.

**Uso no produto:** reforço da aba “Presença / faltas” no plenário. Tratar como fonte secundária; exige mapeamento matrícula ↔ `id` da API v2.

---

## 7. Referências auxiliares (opcional)

Úteis para popular filtros da UI sem hardcode:

| Recurso | Endpoint |
|---|---|
| Siglas de UF | `GET /api/v2/referencias/deputados/siglaUf` |
| Tipos de proposição | `GET /api/v2/referencias/proposicoes/siglaTipo` |
| Lista de partidos | `GET /api/v2/partidos?idLegislatura=57` |
| Legislaturas | `GET /api/v2/legislaturas` |

---

## 8. O que NÃO entra no v1

| Item | Motivo |
|---|---|
| APIs do Senado | Fora do escopo v1 |
| Despesas / cota parlamentar (CEAP) | Não pedido no MVP de acompanhamento |
| Conta de usuário / favoritos na nuvem | Favoritos ficam no cliente (`localStorage`) |
| Alertas push | Fase posterior |

---

## 9. Convenções de integração no backend

1. Header `Accept: application/json` em todas as chamadas REST.
2. Paginar até o link `rel=last` (ou enquanto houver `next`).
3. Delay ~0,5–1,5 s entre páginas; retry com backoff em `429` / `503` / `504`.
4. Preferir **bulk anual** para votos e presença; REST para busca, perfil, partido e proposições.
5. Persistir `id` externo da Câmara + `idLegislatura` em todas as entidades.
6. Registrar `sync_run` (domínio, início/fim, status, contagem) para auditoria.
7. Na UI, citar a fonte: Dados Abertos da Câmara dos Deputados.

---

## 10. Checklist de sync sugerido (v1)

| Frequência | Job | Fontes |
|---|---|---|
| Diário | Cadastro de deputados + detalhes (redes) | `/deputados`, `/deputados/{id}` |
| Diário | Partidos e membros | `/partidos`, `/partidos/{id}/membros` |
| Diário | Votações do ano corrente | `votacoes-{ano}.json`, `votacoesVotos-{ano}.json` |
| Diário ou semanal | Eventos e presenças do ano corrente | `eventos-{ano}.json`, `eventosPresencaDeputados-{ano}.json` |
| Sob demanda / noturno | Proposições dos favoritados | `/proposicoes?idDeputadoAutor=` |
| Sob demanda | Enriquecimento pontual | `/votacoes/{id}`, `/proposicoes/{id}` |
| Opcional | Presença plenário legado | SOAP `ListarPresencasParlamentar` |

---

## Continuar navegando

- [Índice da documentação](./README.md)
- [Guia do produto](./GUIA-DO-PRODUTO.md)
- [API interna do produto](./backend-api.md)
