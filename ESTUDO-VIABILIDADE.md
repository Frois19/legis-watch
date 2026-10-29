# Estudo de viabilidade — acompanhamento de parlamentares

> Navegação: [Índice da documentação](./docs/README.md) · [Guia do produto](./docs/GUIA-DO-PRODUTO.md) · [APIs da Câmara](./docs/apis-v1.md) · [README](./README.md)

Documento de viabilidade técnica para um site que permite pesquisar, favoritar e acompanhar o trabalho de deputados federais e senadores (presença, faltas, projetos, votações, partido e redes sociais).

**Data:** outubro de 2026  

Catálogo das APIs do **v1 (só deputados):** [docs/apis-v1.md](docs/apis-v1.md).

---

## 1. Veredito

**Viável.** Quase todos os requisitos pedem dados já publicados por APIs oficiais gratuitas e sem autenticação.

O maior risco não é “falta de API”, e sim:

1. **Cobertura desigual entre Câmara e Senado** (presença e redes sociais são bem piores no Senado).
2. **Volume de votações** (centenas de milhares de registros por ano).
3. **Necessidade de um backend próprio** que sincronize e cacheie — as APIs oficiais não devem ser chamadas direto do browser (CORS, rate limit, latência e timeouts).

**Recomendação de escopo:** MVP só com **deputados federais (Câmara)**; senadores na fase 2.

---

## 2. Objetivo do produto

Permitir que o cidadão:

- Pesquise um ou mais senadores/deputados.
- Favorite perfis para acompanhamento contínuo.
- Veja, em um único perfil:
  - presença ao trabalho e dias de falta;
  - projetos propostos;
  - histórico em votações (a favor / contra / outros + o projeto em questão);
  - partido e lista de outros membros;
  - redes sociais.

Arquitetura desejada: **front + back**, com o back consumindo APIs públicas para manter os perfis atualizados.

---

## 3. Fontes públicas oficiais

| Fonte | Base | Auth | Formato |
|---|---|---|---|
| Câmara — API REST v2 | `https://dadosabertos.camara.leg.br/api/v2` | Nenhuma | JSON/XML (preferir `Accept: application/json`) |
| Câmara — arquivos anuais | `https://dadosabertos.camara.leg.br/arquivos/...` | Nenhuma | CSV, JSON, XML, XLSX, ODS |
| Câmara — SOAP legado | `https://www.camara.gov.br/SitCamaraWS/...` | Nenhuma | XML |
| Senado — Dados Abertos | `https://legis.senado.leg.br/dadosabertos` | Nenhuma | JSON/XML/CSV (usar sufixo `.json` ou header `Accept`) |

Documentação:

- [Swagger Câmara](https://dadosabertos.camara.leg.br/swagger/api.html)
- [Swagger Senado](https://legis.senado.leg.br/dadosabertos/api-docs/swagger-ui/index.html)
- [ListarPresencasParlamentar (SOAP)](https://www2.camara.leg.br/transparencia/dados-abertos/dados-abertos-legislativo/webservices/sessoesreunioes-2/listarpresencasparlamentar)

Não é necessária chave de API. Há rate limiting real (relatos de HTTP 429/503) e timeouts ocasionais em endpoints pesados como `/votacoes`.

---

## 4. Matriz requisito × API

| Requisito | Câmara | Senado | Notas |
|---|---|---|---|
| Pesquisar perfil | Sim — `GET /deputados?nome=&siglaPartido=&siglaUf=` | Sim — `/senador/lista/atual` + `/senador/{codigo}` | Câmara tem busca nativa por nome/partido/UF |
| Favoritar 1+ | App próprio | App próprio | Não existe na API oficial |
| Presença / dias de falta | Sim — bulk `eventosPresencaDeputados-{ano}` + SOAP `ListarPresencasParlamentar` | Parcial / frágil | Senado **não publica lista de presença em API**; presença oficial está no Diário do Senado |
| Projetos propostos | Sim — `GET /proposicoes?idDeputadoAutor=` | Sim — pesquisa por `nomeAutor` / autorias | Autoria pode ser coletiva; filtrar tipos (PL, PEC, etc.) |
| Histórico de votações | Sim — bulk `votacoesVotos-{ano}` + `/votacoes/{id}/votos` | Sim — `/votacao`, `/senador/{codigo}/votacoes` (parte deprecated) | Preferir **arquivos anuais** + sync incremental |
| Partido + membros | Sim — `/partidos` e `/partidos/{id}/membros` | Sim — filiações + composição | Siglas mudam entre legislaturas |
| Redes sociais | Sim — campo `redeSocial[]` no detalhe | Incompleto | Senado: e-mail, foto e página oficial; redes nem sempre estruturadas |

### 4.1 Endpoints concretos — Câmara (MVP)

| Uso | Endpoint / arquivo |
|---|---|
| Busca / listagem | `GET /api/v2/deputados?nome=...&siglaPartido=...&siglaUf=...&idLegislatura=57` |
| Detalhe do perfil | `GET /api/v2/deputados/{id}` → nome, foto, partido, UF, gabinete, `redeSocial[]` |
| Membros do partido | `GET /api/v2/partidos/{id}` e `GET /api/v2/partidos/{id}/membros` |
| Proposições do autor | `GET /api/v2/proposicoes?idDeputadoAutor={id}&ordem=DESC&ordenarPor=id` |
| Detalhe da proposição | `GET /api/v2/proposicoes/{id}` |
| Votações de uma proposição | `GET /api/v2/proposicoes/{id}/votacoes` |
| Votos de uma votação | `GET /api/v2/votacoes/{id}/votos` |
| Bulk de votos (recomendado) | `.../arquivos/votacoesVotos/{formato}/votacoesVotos-{ano}.{formato}` |
| Bulk de votações | `.../arquivos/votacoes/{formato}/votacoes-{ano}.{formato}` |
| Bulk de presença em eventos | `.../arquivos/eventosPresencaDeputados/{formato}/eventosPresencaDeputados-{ano}.{formato}` |
| Presença plenário (legado) | SOAP/HTTP `ListarPresencasParlamentar` (`dataIni`, `dataFim`, `numMatriculaParlamentar`) |

Exemplo real verificado: o detalhe de um deputado já traz URLs de Twitter/X, Facebook e YouTube em `redeSocial`.

### 4.2 Endpoints concretos — Senado (fase 2)

| Uso | Endpoint |
|---|---|
| Lista em exercício | `GET /dadosabertos/senador/lista/atual.json` |
| Detalhe | `GET /dadosabertos/senador/{codigo}.json` |
| Filiações | `GET /dadosabertos/senador/{codigo}/filiacoes.json` |
| Licenças | `GET /dadosabertos/senador/{codigo}/licencas.json` |
| Partidos | `GET /dadosabertos/senador/partidos.json` |
| Matérias por autor | `GET /dadosabertos/materia/pesquisa/lista.json?nomeAutor=...` |
| Votações do senador | `GET /dadosabertos/senador/{codigo}/votacoes` (deprecated) / `GET /dadosabertos/votacao` |
| Tipos de comparecimento | `GET /dadosabertos/plenario/lista/tiposComparecimento` |

**Gap crítico de presença no Senado:** o próprio Senado orienta checar assiduidade via Diário do Senado Federal (listas de presença de sessões deliberativas). Não há endpoint equivalente ao `ListarPresencasParlamentar` da Câmara. Qualquer “falta” no Senado precisa de disclaimer metodológico (ex.: inferência por ausência em votações nominais).

---

## 5. Arquitetura recomendada

```text
[ Câmara API v2 ]──┐
[ Câmara arquivos ]─┼──► [ Jobs de sync ] ──► [ Postgres ] ──► [ API própria ] ──► [ Next.js ]
[ Senado API     ]──┘                                              ▲
                                                                   │
                                              [ Favoritos: localStorage (MVP) / conta (fase 3) ]
```

### 5.1 Por que o backend é obrigatório

- CORS intermitente ou ausente nas APIs oficiais → o front não deve consumi-las direto.
- Rate limit real (HTTP 429/503) e timeouts em `/votacoes`.
- Um perfil “rico” exige vários endpoints; sem cache a UX fica lenta e instável.
- Favoritos e (futuro) alertas precisam de estado nosso.

### 5.2 Stack proposta

| Camada | Escolha | Motivo |
|---|---|---|
| Front | Next.js + TypeScript + Tailwind + shadcn/ui | UI web moderna, SSR/SEO de perfis |
| Back | Route Handlers do Next.js (MVP) | Um único deploy; separar serviço depois se necessário |
| Banco | PostgreSQL | Relacional, bom para votos/presenças indexados por parlamentar |
| Jobs | Cron (GitHub Actions ou worker) | Sync diário/semanal a partir de bulk + REST |
| Auth no MVP | Nenhum — favoritos em `localStorage` | Evita conta até validar o produto |

### 5.3 Modelo de dados (MVP Câmara)

- `parliamentarian` — id externo Câmara, nome, UF, partido, foto, redes, legislatura, raw atualizado em
- `party` / `party_member` — membros atuais do partido
- `proposition` — tipo, número, ano, ementa, status + vínculo de autoria
- `vote_session` / `vote` — votação, proposição, posição (`Sim`, `Não`, `Obstrução`, `Abstenção`, etc.)
- `attendance_day` — data, tipo de evento/sessão, presente/ausente
- `sync_run` — auditoria da última sincronização por domínio

### 5.4 Estratégia de sincronização

1. **Cadastro e partidos (diário):** REST `/deputados`, detalhe com `redeSocial`, `/partidos/.../membros`.
2. **Proposições (sob demanda + backfill noturno):** REST filtrando por `idDeputadoAutor`; priorizar parlamentares favoritados.
3. **Votos (diário via bulk):** baixar `votacoesVotos-{ano}` e indexar por `deputadoId`; evitar milhares de GETs por votação.
4. **Presença (semanal ou diário):** baixar `eventosPresencaDeputados-{ano}` e/ou SOAP de plenário; na UI deixar claro que é presença em eventos/sessões **registrados**, não “todos os dias úteis”.
5. **Resiliência:** retry com backoff, delay entre páginas (~0,5–1,5 s), fallback para bulk quando a REST falhar.

---

## 6. Escopo de telas (MVP)

1. **Busca** — nome, partido, UF; resultados com foto e partido.
2. **Lista de favoritos** — 1+ perfis salvos no dispositivo.
3. **Perfil** — cabeçalho (nome, foto, partido, UF, redes) + abas:
   - Presença (calendário/lista de faltas e comparecimentos)
   - Projetos (lista paginada de proposições)
   - Votações (filtro por ano/posição; link para a proposição)
   - Partido (lista de outros membros)

Estados a cobrir: loading, vazio (sem favoritos / sem proposições), erro de sync/API.

---

## 7. Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| Senado sem presença estruturada | Alto para “faltas” | Fase 2 com disclaimer; ou inferência via votações + Diário |
| Volume de votos | Alto (storage/CPU) | Bulk anual + índice por parlamentar; UI paginada |
| Instabilidade / 429 / 504 da Câmara | Médio | Cache local como fonte de verdade; jobs com retry |
| Autoria coletiva de proposições | Médio | Rotular autor vs coautor; filtrar tipos relevantes |
| Siglas partidárias entre legislaturas | Médio | Sempre guardar `idLegislatura` e id interno do partido |
| Concorrência (Magna, Radar Parlamentar, Politicapp, Serenata) | Baixo/médio | Diferencial: UX de “meus parlamentares” (favoritos + faltas + votos no mesmo perfil) |
| Interpretação política / ética | Médio | Citar fontes oficiais; evitar score pejorativo sem metodologia |

---

## 8. Custos e operação (ordem de grandeza)

Estimativa para MVP em escala baixa/média (centenas a poucos milhares de usuários):

| Item | Faixa aproximada | Observação |
|---|---|---|
| Hosting app (Vercel/Fly/Railway) | US$ 0–20 / mês | Free tier pode bastar no início |
| Postgres gerenciado | US$ 0–15 / mês | Começar pequeno; votos aumentam disco |
| Jobs de sync | Incluso no CI ou +US$ 5 | GitHub Actions free tier costuma bastar |
| Domínio | ~R$ 40–70 / ano | Opcional no MVP |

**Custo de dados externos:** R$ 0 (APIs públicas).  
**Custo humano principal:** engenharia do sync de votos/presença e UX clara sobre o que “falta” significa.

Armazenamento: esperar crescimento relevante com `vote` e `attendance_day` (milhões de linhas ao longo de uma legislatura se indexar a Casa inteira). Estratégia barata: **sync completo de cadastro/partidos** + **histórico detalhado sob demanda / só para favoritos** no início.

---

## 9. Fases sugeridas

### Fase 1 — MVP (Câmara)

- Busca de deputados
- Perfil com partido, membros, redes
- Proposições do autor
- Histórico de votações (bulk)
- Presença / faltas (bulk + SOAP se necessário)
- Favoritos em `localStorage`

### Fase 2 — Senado

- Mesmos blocos com gaps documentados
- Disclaimer explícito em presença/faltas
- Unificação de modelo (`casa = CAMARA | SENADO`)

### Fase 3 — Conta e alertas

- Login e favoritos multi-dispositivo
- Notificações (“faltou”, “votou X em Y”)
- Comparativos simples (ex.: alinhamento com orientação do partido)

---

## 10. Conclusão e próximos passos técnicos

O projeto **é viável com APIs públicas**, especialmente na Câmara. Um backend de sincronização + cache é parte essencial do desenho, não um “extra”.

Próximos passos quando for implementar:

1. Scaffold Next.js (TypeScript, Tailwind, shadcn/ui) com Postgres.
2. Job que importa deputados + partidos da legislatura atual.
3. Job de votos via `votacoesVotos-{ano}` e job de presença via `eventosPresencaDeputados-{ano}`.
4. APIs internas `/deputados`, `/deputados/{id}`, `/deputados/{id}/votos`, `/deputados/{id}/presencas`, `/deputados/{id}/proposicoes`.
5. UI de busca + perfil + favoritos locais.
6. Só então avaliar Senado e contas de usuário.

---

## Referências

- [Dados Abertos da Câmara dos Deputados](https://dadosabertos.camara.leg.br/)
- [Swagger API Câmara](https://dadosabertos.camara.leg.br/swagger/api.html)
- [Dados Abertos Legislativos do Senado](https://legis.senado.leg.br/dadosabertos/api-docs/swagger-ui/index.html)
- [Tutorial de assiduidade dos senadores](https://www12.senado.leg.br/assessoria-de-imprensa/tutorial-de-verificacao-da-assiduidade-dos-senadores)
- Projetos relacionados (contexto de mercado): Magna, Radar Parlamentar, Politicapp, Operação Serenata de Amor
