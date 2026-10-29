# Legis Watch — Guia do produto

> Navegação: [Índice da documentação](./README.md) · [Estaduais](./estaduais.md) · [Senadores](./senado.md) · [APIs da Câmara](./apis-v1.md) · [API interna](./backend-api.md) · [README](../README.md)

Documento para entender **o que o produto faz**, com prints das telas principais (atualizados a partir do app em `localhost:3456`).

**Legis Watch** é um app web para acompanhar parlamentares brasileiros — **deputados federais** (Câmara), **deputados estaduais** (Assembleias / CLDF) e **senadores** (Senado Federal) — com dados públicos. Você busca um parlamentar, escolhe a esfera e vê o que a casa já publica.

Repositório: [github.com/Frois19/legis-watch](https://github.com/Frois19/legis-watch)

Para regenerar os prints: `npm run docs:screenshots` (requer o dev server em `:3456`).

---

## O que você consegue fazer

| Funcionalidade | O que resolve |
|---|---|
| Busca por esfera | Filtrar **federais**, **estaduais**, **senadores** ou **todos** |
| Busca de senadores | Encontrar senadores em exercício por nome, partido e UF |
| Busca por mandato | Encontrar deputados federais por nome, partido e UF em qualquer legislatura |
| Busca estadual (27 UFs) | Encontrar deputados de Assembleia / CLDF por nome, partido e UF |
| Favoritos locais | Guardar parlamentares **federais** neste navegador (sem login) |
| Projetos propostos | (Federal) Ver o que o deputado apresentou, status e link para a ficha na Câmara |
| Histórico de votações | (Federal) Ver se votou **Sim / Não / Abstenção**, o projeto e se a matéria foi aprovada |
| Presença e faltas | (Federal) Filtrar dias de falta e abrir a **ata do dia** (pauta + votações) |
| Partido | (Federal) Ver outros deputados do mesmo partido no mandato selecionado |
| Perfil estadual | Nome, partido, UF, e-mail e o que a casa já cobre (projetos/votos/presença quando houver) |
| Perfil de senador | Matérias de autoria, filiações, mandatos + disclaimer de presença |

---

## 1. Busca (federal, estadual e senadores)

Tela inicial: escolha a **esfera**, depois os filtros. No federal, escolha também o **mandato** (ex.: 57ª legislatura).

![Busca com filtro de esfera](./screenshots/07-busca-esfera.png)

**Na prática**

- Esfera: Deputados federais · Deputados estaduais · Senadores · Todos
- Federais: botões das legislaturas recentes (52ª–57ª)
- Estaduais: após sync, resultados de qualquer UF (PE via ALEPE; demais com cadastro fixture até haver API live)
- Senadores: lista em exercício do Senado (nome, partido, UF)
- Resultados com foto (quando houver), partido, UF e nome da casa
- Atalhos de exemplo: Janones (federal), deputados estaduais de PE e senadores do AC

### Resultados federais

Exemplo: busca por “Janones” na 56ª legislatura.

![Busca federal com resultado](./screenshots/01-busca.png)

### Resultados estaduais

Exemplo: esfera estadual + UF **PE** (8 parlamentares da ALEPE).

![Busca estadual PE](./screenshots/07b-busca-estadual-pe.png)

### Resultados de senadores

Exemplo: esfera **Senadores** + UF **AC**.

![Busca de senadores](./screenshots/11-busca-senadores.png)

---

## 2. Perfil federal e projetos propostos

No perfil federal aparecem resumo do mandato, contadores (projetos, votos, presença) e abas.

Na aba **Projetos**:

- Filtro por **status** (com explicação de cada categoria)
- Título do projeto como **link** para a ficha na Câmara
- Ementa (“do que se trata”), data de apresentação e status

![Perfil com lista de projetos](./screenshots/02-perfil-projetos.png)

---

## 3. Votações (Sim / Não / Abstenção)

Aba **Votações** (federal) mostra o histórico nominal.

- Cards rápidos: quantos **Sim**, **Não**, **Abstenção** e **Outros**
- Filtro “Filtrar por voto do deputado” para isolar cada tipo
- Em cada item: voto do deputado, resultado da sessão (aprovado/rejeitado), ementa, autoria/partido e link do projeto

![Filtro de votações por Não](./screenshots/03-votacoes-filtro.png)

Útil para responder rápido: *“em quais matérias ele votou não?”*

---

## 4. Presença, faltas e ata do dia

Aba **Presença** (federal) cruza sessões deliberativas do plenário com o registro oficial de presença.

- Filtros: todas as sessões, **só faltas** ou só presenças
- Em cada dia: **Ver ata do dia**
  - Pauta oficial (o que ocorreu / foi votado)
  - Votações nominais do dia (aprovado/rejeitado + link do projeto)
  - Links para a página do evento e o vídeo, quando existirem

![Faltas com ata e votações do dia](./screenshots/04-presenca-faltas-ata.png)

Quando a pauta estruturada da Câmara está disponível, a ata fica ainda mais rica:

![Ata com pauta detalhada da sessão](./screenshots/04b-presenca-ata-pauta.png)

---

## 5. Partido

Aba **Partido** (federal) lista outros deputados do mesmo partido no mandato selecionado, com link para o perfil de cada um.

![Aba partido no perfil](./screenshots/05-partido.png)

---

## 6. Favoritos

Parlamentares **federais** salvos neste dispositivo (`localStorage`). Não exige conta. Favoritos estaduais e de senadores ainda não entram nesta lista.

![Lista de favoritos](./screenshots/06-favoritos.png)

---

## 7. Perfil estadual

URL: `/parlamentares/{source}/{id}` (ex.: ALEPE/PE, ALESP/SP, ALMG/MG).

O perfil estadual mostra cadastro (nome, partido, UF, e-mail) e a **cobertura da casa** — o que já está disponível vs. o que entra quando o adapter live publicar proposições, votos e presença.

![Perfil estadual — Pernambuco (ALEPE)](./screenshots/08-perfil-estadual-pe.png)

![Perfil estadual — São Paulo (ALESP)](./screenshots/09-perfil-estadual-sp.png)

![Perfil estadual — Minas Gerais (ALMG)](./screenshots/10-perfil-estadual-mg.png)

Catálogo completo das 27 UFs: [estaduais.md](./estaduais.md).

---

## 8. Senadores

Esfera **Senadores** na busca; perfil em `/parlamentares/senado/{codigo}`.

Ao abrir o perfil, o app enriquece sob demanda (filiações, mandatos e matérias de autoria via Dados Abertos do Senado). Abas:

| Aba | Conteúdo |
|---|---|
| **Matérias** | Autorias (até o limite configurado), com ementa, data e link no Senado |
| **Filiações** | Histórico partidário (entrada → saída / atual) |
| **Mandatos** | UF, participação e legislaturas |
| **Cobertura** | O que já está disponível + disclaimer de presença |

![Perfil de senador — matérias de autoria](./screenshots/12-perfil-senador.png)

![Perfil de senador — filiações partidárias](./screenshots/13-perfil-senador-filiacoes.png)

![Perfil de senador — cobertura e disclaimer de presença](./screenshots/14-perfil-senador-cobertura.png)

Detalhes técnicos e sync: [senado.md](./senado.md).

---

## Fluxo típico de uso

1. Abrir a busca e escolher a esfera (federal / estadual / senador / todos)  
2. No federal, escolher o mandato; no estadual ou senador, filtrar por UF se quiser  
3. Encontrar o parlamentar e abrir o perfil  
4. (Federal) Em **Projetos**, filtrar por status e abrir a ficha na Câmara  
5. (Federal) Em **Votações**, filtrar por Sim/Não/Abstenção  
6. (Federal) Em **Presença**, filtrar faltas e abrir a ata dos dias ausentes  
7. (Estadual) Conferir cobertura da casa e o link de dados abertos  
8. (Senador) Ver matérias, filiações e mandatos; presença só pelo tutorial oficial do Senado  

---

## Dados e limitações (transparência)

- **Federal:** Dados Abertos da Câmara (API + arquivos anuais de votos/presença)
- **Estadual:** PE via API ALEPE (com fixture se a rede falhar); demais UFs usam fixture de cadastro até haver adapter live — ver [estaduais.md](./estaduais.md)
- **Senado:** lista atual + perfil enriquecido (filiações, mandatos, autorias); presença **não** é inferida — ver [senado.md](./senado.md)
- Presença federal: sessões deliberativas no Plenário, não canceladas  
- Autoria/status em votações federais podem ser completados sob demanda via API da Câmara  
- Favoritos ficam só no navegador atual e, por enquanto, só para federais  

Para rodar o projeto localmente e sincronizar dados, veja o [README](../README.md).

---

## Continuar navegando

- [Índice da documentação](./README.md)
- [Deputados estaduais por UF](./estaduais.md)
- [Senadores](./senado.md)
- [APIs externas da Câmara](./apis-v1.md)
- [API interna do produto](./backend-api.md)
