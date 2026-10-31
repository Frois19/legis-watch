# Legis Watch — Guia do usuário

> Navegação: [Índice](./README.md) · [Estaduais](./estaduais.md) · [Senadores](./senado.md) · [Roadmap](./PLANO-EXPANSAO.md) · [README](../README.md)

Telas e funcionalidades do produto. Cada print aparece **lado a lado** nas versões **clara** e **escura** (toggle no cabeçalho).

**Legis Watch** acompanha parlamentares brasileiros com dados públicos:

| Esfera | Casa | No perfil |
|---|---|---|
| **Deputados federais** | Câmara dos Deputados | Projetos, votações, presença/ata, partido |
| **Deputados estaduais** | 27 Assembleias / CLDF | Cadastro em todas; proposições / filiações / mandatos / presença / votos conforme a casa |
| **Senadores** | Senado Federal | Matérias, votações, filiações, mandatos + disclaimer de presença |

Repo: [github.com/Frois19/legis-watch](https://github.com/Frois19/legis-watch)  
Regenerar prints: `npm run docs:screenshots` (dev server em `:3456`) — gera pares `-light.png` / `-dark.png`.

---

## Mapa de funcionalidades

| Funcionalidade | Esfera | O que resolve |
|---|---|---|
| Busca por esfera | Todas | Federais, estaduais, senadores ou todos |
| Busca por mandato | Federal | Legislatura (ex.: 56ª / 57ª) |
| Busca por UF / partido / nome | Estadual e Senado | Achar o parlamentar rápido |
| Favoritos locais | Todas | Guardar no navegador, sem login |
| Tema claro / escuro | Todas | Preferência no `localStorage`, sem flash |
| Projetos / proposições | Federal + casas live + Senado | O que a pessoa apresentou |
| Votações nominais | Federal + Senado + **PR (ALEP)** | Sim / Não / Abstenção + matéria |
| Presença e ata | Federal | Faltas + pauta e votações do dia |
| Presença plenária | **Paraná (ALEP)** | Sessões com presente / justificado / ausente |
| Filiações e mandatos | Senado + SAPL + MG | Histórico partidário e legislaturas |
| Cobertura da casa | Estadual + Senado | O que já está disponível vs em breve |

---

## 1. Busca

Na home, escolha a **esfera** e os filtros. No federal, escolha também o **mandato**.

A URL reflete a busca e pode ser compartilhada, por exemplo  
`/?esfera=estadual_deputado&uf=PR` ou `/?esfera=senador&uf=AC`.

| Claro | Escuro |
|:---:|:---:|
| ![Busca com filtro de esfera — claro](./screenshots/07-busca-esfera-light.png) | ![Busca com filtro de esfera — escuro](./screenshots/07-busca-esfera-dark.png) |

**Na prática**

- Esfera: Deputados federais · Deputados estaduais · Senadores · Todos
- Federais: legislaturas recentes (52ª–57ª)
- Estaduais: **11 casas live** (PE, MG, SP, PR + 7 SAPL) e 16 UFs com cadastro de demonstração (banner no perfil)
- Senadores: lista em exercício do Senado
- Perfis mostram **frescor** (“atualizado há X h”) e skeleton enquanto enriquecem
- Tema: botão Lua / Sol no cabeçalho

### Resultados federais

Exemplo: “Janones” na 56ª legislatura.

| Claro | Escuro |
|:---:|:---:|
| ![Busca federal — claro](./screenshots/01-busca-light.png) | ![Busca federal — escuro](./screenshots/01-busca-dark.png) |

### Resultados estaduais

Pernambuco (ALEPE):

| Claro | Escuro |
|:---:|:---:|
| ![Busca estadual PE — claro](./screenshots/07b-busca-estadual-pe-light.png) | ![Busca estadual PE — escuro](./screenshots/07b-busca-estadual-pe-dark.png) |

Paraná (ALEP — proposições, presença e votos):

| Claro | Escuro |
|:---:|:---:|
| ![Busca estadual PR — claro](./screenshots/07c-busca-estadual-pr-light.png) | ![Busca estadual PR — escuro](./screenshots/07c-busca-estadual-pr-dark.png) |

### Resultados de senadores

Exemplo: esfera **Senadores** + UF **AC**.

| Claro | Escuro |
|:---:|:---:|
| ![Busca de senadores — claro](./screenshots/11-busca-senadores-light.png) | ![Busca de senadores — escuro](./screenshots/11-busca-senadores-dark.png) |

---

## 2. Perfil federal — projetos

Resumo do mandato, contadores e abas (a ativa aparece como **pill** preenchida no trilho). Em **Projetos**: filtro por status, link para a Câmara, ementa e data.

| Claro | Escuro |
|:---:|:---:|
| ![Perfil com lista de projetos — claro](./screenshots/02-perfil-projetos-light.png) | ![Perfil com lista de projetos — escuro](./screenshots/02-perfil-projetos-dark.png) |

---

## 3. Votações (Sim / Não / Abstenção)

Aba **Votações** (federal): cards por tipo de voto, filtro e matéria relacionada.

| Claro | Escuro |
|:---:|:---:|
| ![Filtro de votações por Não — claro](./screenshots/03-votacoes-filtro-light.png) | ![Filtro de votações por Não — escuro](./screenshots/03-votacoes-filtro-dark.png) |

---

## 4. Presença, faltas e ata do dia

Aba **Presença** (federal): filtros (todas / faltas / presentes) e **Ver ata do dia** (pauta + votações).

| Claro | Escuro |
|:---:|:---:|
| ![Faltas com ata — claro](./screenshots/04-presenca-faltas-ata-light.png) | ![Faltas com ata — escuro](./screenshots/04-presenca-faltas-ata-dark.png) |

| Claro | Escuro |
|:---:|:---:|
| ![Ata com pauta — claro](./screenshots/04b-presenca-ata-pauta-light.png) | ![Ata com pauta — escuro](./screenshots/04b-presenca-ata-pauta-dark.png) |

---

## 5. Partido (federal)

Outros deputados do mesmo partido no mandato selecionado.

| Claro | Escuro |
|:---:|:---:|
| ![Aba partido — claro](./screenshots/05-partido-light.png) | ![Aba partido — escuro](./screenshots/05-partido-dark.png) |

---

## 6. Favoritos

Parlamentares **federais, estaduais e senadores** neste dispositivo (`localStorage`).

| Claro | Escuro |
|:---:|:---:|
| ![Lista de favoritos — claro](./screenshots/06-favoritos-light.png) | ![Lista de favoritos — escuro](./screenshots/06-favoritos-dark.png) |

---

## 7. Perfil estadual

URL: `/parlamentares/{source}/{id}`

### Exemplos por casa

Pernambuco (ALEPE):

| Claro | Escuro |
|:---:|:---:|
| ![Perfil PE — claro](./screenshots/08-perfil-estadual-pe-light.png) | ![Perfil PE — escuro](./screenshots/08-perfil-estadual-pe-dark.png) |

São Paulo (ALESP):

| Claro | Escuro |
|:---:|:---:|
| ![Perfil SP — claro](./screenshots/09-perfil-estadual-sp-light.png) | ![Perfil SP — escuro](./screenshots/09-perfil-estadual-sp-dark.png) |

Paraná (ALEP) — proposições:

| Claro | Escuro |
|:---:|:---:|
| ![Perfil PR proposições — claro](./screenshots/17-perfil-estadual-pr-light.png) | ![Perfil PR proposições — escuro](./screenshots/17-perfil-estadual-pr-dark.png) |

Paraná (ALEP) — presença plenária:

| Claro | Escuro |
|:---:|:---:|
| ![Perfil PR presença — claro](./screenshots/18-perfil-estadual-pr-presenca-light.png) | ![Perfil PR presença — escuro](./screenshots/18-perfil-estadual-pr-presenca-dark.png) |

Paraná (ALEP) — votações nominais (ZIP):

| Claro | Escuro |
|:---:|:---:|
| ![Perfil PR votações — claro](./screenshots/17b-perfil-estadual-pr-votacoes-light.png) | ![Perfil PR votações — escuro](./screenshots/17b-perfil-estadual-pr-votacoes-dark.png) |

Minas Gerais:

| Claro | Escuro |
|:---:|:---:|
| ![Perfil MG — claro](./screenshots/10-perfil-estadual-mg-light.png) | ![Perfil MG — escuro](./screenshots/10-perfil-estadual-mg-dark.png) |

Acre — proposições:

| Claro | Escuro |
|:---:|:---:|
| ![Perfil AC proposições — claro](./screenshots/15-perfil-estadual-ac-proposicoes-light.png) | ![Perfil AC proposições — escuro](./screenshots/15-perfil-estadual-ac-proposicoes-dark.png) |

Acre — filiações:

| Claro | Escuro |
|:---:|:---:|
| ![Perfil AC filiações — claro](./screenshots/16-perfil-estadual-ac-filiacoes-light.png) | ![Perfil AC filiações — escuro](./screenshots/16-perfil-estadual-ac-filiacoes-dark.png) |

UFs ainda em fixture mostram banner de demonstração:

| Claro | Escuro |
|:---:|:---:|
| ![Banner fixture — claro](./screenshots/19-perfil-fixture-banner-light.png) | ![Banner fixture — escuro](./screenshots/19-perfil-fixture-banner-dark.png) |

### O que cada casa live entrega

| Casa | `source` | Proposições | Filiações | Mandatos | Presença | Votos |
|---|---|---|---|---|---|---|
| AC, AL, AM, PB, PI, RO, TO | `aleac`… | SAPL | Sim | Sim | — | — |
| Minas Gerais | `almg` | CSV anual | Sim | Sim | — | — |
| São Paulo | `alesp` | XML/ZIP | — | — | — | — |
| Pernambuco | `alepe` | XML (+ fixture se offline) | — | — | — | — |
| Paraná | `alep` | Webservice | — | — | **Plenário** | **ZIP/XLSX** |
| Demais UFs | fixture | — | — | — | — | — |

Catálogo completo: [estaduais.md](./estaduais.md).

---

## 8. Senadores

Esfera **Senadores** · `/parlamentares/senado/{codigo}`.

| Aba | Conteúdo |
|---|---|
| **Matérias** | Autorias (ementa, data, link) |
| **Votações** | Voto nominal + matéria e resultado |
| **Filiações** | Histórico partidário |
| **Mandatos** | UF, participação e legislaturas |
| **Cobertura** | O que existe + disclaimer de presença |

Matérias:

| Claro | Escuro |
|:---:|:---:|
| ![Senador matérias — claro](./screenshots/12-perfil-senador-light.png) | ![Senador matérias — escuro](./screenshots/12-perfil-senador-dark.png) |

Votações:

| Claro | Escuro |
|:---:|:---:|
| ![Senador votações — claro](./screenshots/12b-perfil-senador-votacoes-light.png) | ![Senador votações — escuro](./screenshots/12b-perfil-senador-votacoes-dark.png) |

Filiações:

| Claro | Escuro |
|:---:|:---:|
| ![Senador filiações — claro](./screenshots/13-perfil-senador-filiacoes-light.png) | ![Senador filiações — escuro](./screenshots/13-perfil-senador-filiacoes-dark.png) |

Cobertura e disclaimer:

| Claro | Escuro |
|:---:|:---:|
| ![Senador cobertura — claro](./screenshots/14-perfil-senador-cobertura-light.png) | ![Senador cobertura — escuro](./screenshots/14-perfil-senador-cobertura-dark.png) |

Presença no Senado **não** é inferida pela API — use o tutorial oficial (link na aba Cobertura). Detalhes: [senado.md](./senado.md).

---

## Fluxo típico

1. Busca → escolher esfera (e UF / mandato)  
2. Abrir o perfil  
3. **Federal:** Projetos → Votações → Presença (ata) → Partido  
4. **Estadual:** Proposições / Presença (PR) / Votações (PR) / Filiações / Mandatos / Cobertura  
5. **Senador:** Matérias / Votações / Filiações / Mandatos / Cobertura  
6. Favoritar se quiser acompanhar depois  
7. Alternar tema claro/escuro no cabeçalho quando preferir  

---

## Dados e limitações

- **Federal:** Dados Abertos da Câmara  
- **Estadual:** 11 live · 16 fixture — [estaduais.md](./estaduais.md) · [fontes](./fontes-endpoints.md)  
- **Senado:** matérias e votos; presença só pelo Diário / tutorial  
- Favoritos e tema: só neste navegador  
- Votos nominais estaduais: **Paraná (ALEP)** indexa ZIPs recentes; demais UFs ainda sem API útil  

Roadmap (qualidade + features): [PLANO-EXPANSAO.md](./PLANO-EXPANSAO.md).

---

## Continuar

- [Índice](./README.md) · [Estaduais](./estaduais.md) · [Senadores](./senado.md) · [API interna](./backend-api.md)
