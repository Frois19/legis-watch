# Documentação — Legis Watch

Índice para navegar entre a documentação de **produto** e a **técnica**.

---

## Produto

Para entender o que o app faz, com prints das telas.

| Documento | Conteúdo |
|---|---|
| [Guia do produto](./GUIA-DO-PRODUTO.md) | Busca, favoritos, projetos, votações, presença/ata, partido |

---

## Técnica

Para rodar, sincronizar dados e integrar com as APIs.

| Documento | Conteúdo |
|---|---|
| [APIs externas da Câmara (v1)](./apis-v1.md) | Fontes oficiais (REST + arquivos anuais) usadas no sync |
| [API interna do produto](./backend-api.md) | Endpoints locais (`/api/...`) que o frontend consome |
| [Estudo de viabilidade](../ESTUDO-VIABILIDADE.md) | Escopo, riscos e decisões do v1 |
| [Plano de expansão + cache](./PLANO-EXPANSAO.md) | Deputados estaduais → senadores (endpoints) e cache nas buscas |

---

## Atalhos

- [← Voltar ao README do repositório](../README.md)
- App local: [http://localhost:3456](http://localhost:3456)
- Repo: [github.com/Frois19/legis-watch](https://github.com/Frois19/legis-watch)

```text
docs/
├── README.md                 ← você está aqui (índice)
├── GUIA-DO-PRODUTO.md        ← produto + screenshots/
├── apis-v1.md                ← técnica: Câmara
├── backend-api.md            ← técnica: API interna
└── screenshots/
```
