# Documentação — Legis Watch

Índice para navegar entre a documentação de **produto** e a **técnica**.

---

## Produto

Para entender o que o app faz, com prints das telas.

| Documento | Conteúdo |
|---|---|
| [Guia do produto](./GUIA-DO-PRODUTO.md) | Busca (federal + estadual + senadores), favoritos, projetos, votações, presença/ata, partido, perfil do Senado — prints atualizados |
| [Deputados estaduais por UF](./estaduais.md) | Catálogo das 27 UFs (9 live: PE/MG/SAPL), sync e limitações |
| [Senadores](./senado.md) | Lista atual, perfil (filiações/mandatos/matérias) e disclaimer de presença |

---

## Técnica

Para rodar, sincronizar dados e integrar com as APIs.

| Documento | Conteúdo |
|---|---|
| [APIs externas da Câmara (v1)](./apis-v1.md) | Fontes oficiais (REST + arquivos anuais) usadas no sync federal |
| [API interna do produto](./backend-api.md) | Endpoints locais (`/api/...`) que o frontend consome |
| [Plano de expansão + cache](./PLANO-EXPANSAO.md) | Estaduais → senadores, status E0/E1 e cache de busca |
| [Estudo de viabilidade](../ESTUDO-VIABILIDADE.md) | Escopo, riscos e decisões do v1 |

---

## Atalhos

- [← Voltar ao README do repositório](../README.md)
- App local: [http://localhost:3456](http://localhost:3456)
- Repo: [github.com/Frois19/legis-watch](https://github.com/Frois19/legis-watch)

```text
docs/
├── README.md                 ← você está aqui (índice)
├── GUIA-DO-PRODUTO.md        ← produto + screenshots/
├── estaduais.md              ← cobertura estadual (27 UFs)
├── senado.md                 ← senadores (busca/perfil/matérias)
├── PLANO-EXPANSAO.md         ← roadmap estadual/Senado + cache
├── apis-v1.md                ← técnica: Câmara
├── backend-api.md            ← técnica: API interna
└── screenshots/
```
