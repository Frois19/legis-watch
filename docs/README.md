# Documentação — Legis Watch

Índice entre documentação de **produto** e **técnica**.

---

## Produto

| Documento | Conteúdo |
|---|---|
| [Guia do usuário](./GUIA-DO-PRODUTO.md) | Telas e funcionalidades — prints atualizados |
| [Deputados estaduais por UF](./estaduais.md) | 27 UFs (11 live: PE/MG/SP/PR + SAPL) |
| [Senadores](./senado.md) | Busca, perfil, votos e disclaimer de presença |
| [Roadmap](./PLANO-EXPANSAO.md) | O que falta, qualidade e ideias de features |

---

## Técnica

| Documento | Conteúdo |
|---|---|
| [APIs externas da Câmara (v1)](./apis-v1.md) | REST + arquivos anuais do sync federal |
| [API interna](./backend-api.md) | Endpoints `/api/...` |
| [Fontes / endpoints públicos](./fontes-endpoints.md) | Probes de APIs estaduais e cache HTTP |
| [Estudo de viabilidade](../ESTUDO-VIABILIDADE.md) | Escopo e riscos do v1 |

---

## Atalhos

- [← README do repositório](../README.md)
- App local: [http://localhost:3456](http://localhost:3456)
- Repo: [github.com/Frois19/legis-watch](https://github.com/Frois19/legis-watch)
- Regenerar prints: `npm run docs:screenshots`

```text
docs/
├── README.md
├── GUIA-DO-PRODUTO.md   + screenshots/
├── estaduais.md
├── senado.md
├── PLANO-EXPANSAO.md    ← roadmap (não reabre o já feito)
├── fontes-endpoints.md
├── apis-v1.md
└── backend-api.md
```
