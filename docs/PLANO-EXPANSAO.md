# Roadmap — Legis Watch

> Navegação: [Índice](./README.md) · [Guia](./GUIA-DO-PRODUTO.md) · [Estaduais](./estaduais.md) · [Fontes](./fontes-endpoints.md)

Plano **para frente**: o que já entregamos fica só como baseline; o foco é qualidade, gaps de dados e ideias de produto.

---

## Baseline (já entregue — não reabrir)

| Área | Estado |
|---|---|
| **Federal (Câmara)** | Busca, perfil, projetos, votos, presença/ata, partido, sync + SQLite |
| **Estadual** | 27 UFs na busca; **11 live** (PE, MG, SP, PR + 7 SAPL); 16 fixture |
| **ALEP (PR)** | Cadastro + proposições + presença + **votos nominais (ZIP)** |
| **Senado** | Busca, perfil (matérias, votos, filiações, mandatos) + disclaimer de presença |
| **Favoritos** | Multi-esfera no `localStorage` |
| **Cache** | Busca em memória + HTTP externo (assembleias/Senado) em disco; Redis ainda não |

Detalhe de cobertura: [estaduais.md](./estaduais.md) · [fontes-endpoints.md](./fontes-endpoints.md) · [senado.md](./senado.md).

---

## 1. Gaps de dados (próximo trabalho técnico)

Prioridade por **impacto no perfil** × **API já confirmada**.

| # | Item | Por quê | Risco |
|---|---|---|---|
| 1 | **CLDF (DF)** live | PLE/CKAN documentados; timeout neste egress | Rede; fixture até liberar |
| 2 | **Mais SAPL** (CE, ES, GO, RS…) | Adapter genérico já existe | Host/DNS por casa |
| 3 | **ALMT / outras UFs** com CSV/CKAN | Tirar fixture onde houver arquivo estável | Schemas frágeis |
| 4 | **Presença fora do PR** | Só Paraná tem lista plenária utilizável hoje | Maioria das casas não publica |
| 5 | **Senado — presença** | Continua sem API equivalente à Câmara | Manter disclaimer; não inventar “falta” |

Critério: só plugar adapter/live se o probe responder **e** o dado couber no modelo (`StateProposition` / `StateAttendance` / votos).

---

## 2. Qualidade da aplicação (melhorias concretas)

### 2.1 Dados e sync

- [x] Sync agendado / cron (`npm run sync -- cron`, `POST /api/sync` domain `cron`, UI `/admin`)
- [x] Indicador de **frescor** no perfil (`formatRelativeTime` + `profileSyncedAt`)
- [x] Retry/backoff unificado no HTTP cache (estaduais/Senado) + Câmara já tinha
- [x] Alertas quando fixture substitui live (banner “Dados de demonstração” + badge)

### 2.2 UX e acessibilidade

- [x] Estados vazios mais guiados (link para portal da casa)
- [x] Loading skeleton no enrich on-demand (estadual/Senado via loaders)
- [x] Filtro de presença estadual (todas / faltas / presentes / justificados) + paginação
- [x] Busca: deep-link `?esfera=&uf=&nome=&partido=&legislaturaId=`
- [x] Abas com wrap/scroll no mobile (perfil estadual e senador)

### 2.3 Performance e confiabilidade

- [ ] Redis para cache de busca em multi-instância (C4) — adiado
- [x] Paginação na UI de proposições/presença/votos estadual
- [x] Observabilidade: `GET /api/cache/stats` + `cache`/`durationMs` em `/api/health`
- [x] Smoke de screenshots no CI (`screenshots-smoke`)

### 2.4 Código e testes

- [x] Cobertura de integração para ALEP (lista + perfil)
- [x] Contrato de serialização do perfil estadual (`serialize.test.ts`)
- [x] Envs de cache/TTL documentados no README + backend-api

---

## 3. Sugestões de novas features

### 3.1 Alto valor / encaixa no produto atual

| Feature | Descrição |
|---|---|
| **Comparar 2–3 parlamentares** | Lado a lado: presença %, votos em matérias comuns, volume de proposições |
| **Alertas leves** | “Acompanhar” + e-mail/webhook quando houver nova proposição ou falta (opt-in; precisa canal) |
| **Linha do tempo unificada** | Mistura votos + proposições + faltas em ordem cronológica no perfil |
| **Exportar CSV/PDF do perfil** | Transparência para jornalismo cidadão / trabalho escolar |
| **Busca por tema / palavra na ementa** | Full-text local nas proposições já sincronizadas |

### 3.2 Médio prazo

| Feature | Descrição |
|---|---|
| **Contas (opcional)** | Favoritos e alertas sincronizados entre dispositivos |
| **Painéis por partido / UF** | Ranking simples de assiduidade ou autoria (com metodologia explícita) |
| **Comissões** | Onde o parlamentar atua (Senado/SAPL já têm endpoints parciais) |
| **Congresso (CN)** | Sessões conjuntas — só se a API de Dados Abertos cobrir bem |

### 3.3 Evitar / adiar

- Scraping de portais HTML sem ToS claro  
- “Nota” ou score moral sem metodologia auditável  
- Rede social como fonte primária de presença/voto  
- App nativo antes do web estar estável em mobile

---

## 4. Ordem sugerida (próximos ciclos)

```text
Ciclo A — Qualidade UX                         ← feito
  deep-link busca · skeleton enrich · banner fixture · filtro presença PR

Ciclo B — Dados PR completo + qualidade ops   ← feito
  votos ALEP (ZIP) · cron/admin · retry HTTP · CI smoke · integração ALEP

Ciclo C — Mais casas live
  CLDF quando a rede responder · 1–2 SAPL extras · CKAN/CSV onde couber

Ciclo D — Produto
  comparar parlamentares · export CSV · (opcional) contas/alertas

Ainda adiado
  Redis (multi-instância)
```

---

## 5. Métricas de sucesso

| Métrica | Meta prática |
|---|---|
| Casas estaduais live | > 11 (hoje) sem regressão nas atuais |
| Perfil PR | proposições + presença + votos (ZIPs recentes) |
| Tempo até 1º resultado na busca (cache quente) | < 200 ms p95 na instância única |
| Prints do guia | regeneráveis com `npm run docs:screenshots` |
| Clareza de cobertura | usuário vê o que falta em cada casa (aba Cobertura) |

---

## Continuar

- [Guia do usuário (prints)](./GUIA-DO-PRODUTO.md)
- [Estaduais por UF](./estaduais.md)
- [Fontes / endpoints](./fontes-endpoints.md)
- [API interna](./backend-api.md)
