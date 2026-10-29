# Legis Watch — Guia do produto

Documento para entender **o que o produto faz**, com prints das telas principais.

**Legis Watch** é um app web para acompanhar deputados federais brasileiros com dados públicos da [Câmara dos Deputados](https://dadosabertos.camara.leg.br/). Você busca um parlamentar, escolhe o mandato e vê projetos, votações, presença no plenário e colegas de partido — sem precisar criar conta.

Repositório: [github.com/Frois19/legis-watch](https://github.com/Frois19/legis-watch)

---

## O que você consegue fazer

| Funcionalidade | O que resolve |
|---|---|
| Busca por mandato | Encontrar deputados por nome, partido e UF em qualquer legislatura |
| Favoritos locais | Guardar parlamentares neste navegador (sem login) |
| Projetos propostos | Ver o que o deputado apresentou, status e link para a ficha na Câmara |
| Histórico de votações | Ver se votou **Sim / Não / Abstenção**, o projeto e se a matéria foi aprovada |
| Presença e faltas | Filtrar dias de falta e abrir a **ata do dia** (pauta + votações) |
| Partido | Ver outros deputados do mesmo partido no mandato selecionado |

---

## 1. Busca

Tela inicial: escolha o **mandato** (ex.: 57ª legislatura), filtre por nome, UF e partido e busque.

![Tela de busca do Legis Watch](./screenshots/01-busca.png)

**Na prática**

- Botões das legislaturas recentes (52ª–57ª)
- Resultados com foto, partido e UF
- Atalho para favoritar direto na lista
- Entrada no perfil completo do deputado

---

## 2. Perfil e projetos propostos

No perfil aparecem resumo do mandato, contadores (projetos, votos, presença) e abas.

Na aba **Projetos**:

- Filtro por **status** (com explicação de cada categoria)
- Título do projeto como **link** para a ficha na Câmara
- Ementa (“do que se trata”), data de apresentação e status

![Perfil com lista de projetos](./screenshots/02-perfil-projetos.png)

---

## 3. Votações (Sim / Não / Abstenção)

Aba **Votações** mostra o histórico nominal.

- Cards rápidos: quantos **Sim**, **Não**, **Abstenção** e **Outros**
- Filtro “Filtrar por voto do deputado” para isolar cada tipo
- Em cada item: voto do deputado, resultado da sessão (aprovado/rejeitado), ementa, autoria/partido e link do projeto

![Filtro de votações por Não](./screenshots/03-votacoes-filtro.png)

Útil para responder rápido: *“em quais matérias ele votou não?”*

---

## 4. Presença, faltas e ata do dia

Aba **Presença** cruza sessões deliberativas do plenário com o registro oficial de presença.

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

Aba **Partido** lista outros deputados do mesmo partido no mandato selecionado, com link para o perfil de cada um.

![Aba partido no perfil](./screenshots/05-partido.png)

---

## 6. Favoritos

Parlamentares salvos neste dispositivo (localStorage). Não exige conta.

![Lista de favoritos](./screenshots/06-favoritos.png)

---

## Fluxo típico de uso

1. Abrir a busca e escolher o mandato  
2. Encontrar o deputado e (opcional) favoritar  
3. No perfil, trocar o mandato se quiser comparar legislaturas  
4. Em **Projetos**, filtrar por status e abrir a ficha na Câmara  
5. Em **Votações**, filtrar por Sim/Não/Abstenção  
6. Em **Presença**, filtrar faltas e abrir a ata dos dias ausentes  

---

## Dados e limitações (transparência)

- Fonte: Dados Abertos da Câmara (API + arquivos anuais de votos/presença)
- Presença considerada: sessões deliberativas no Plenário, não canceladas  
- Autoria/status em votações podem ser completados sob demanda via API da Câmara  
- Favoritos ficam só no navegador atual  

Para rodar o projeto localmente e sincronizar dados, veja o [README](../README.md).
