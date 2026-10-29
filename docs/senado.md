# Senadores — Senado Federal

> Navegação: [Índice](./README.md) · [Guia do produto](./GUIA-DO-PRODUTO.md) · [API interna](./backend-api.md) · [Plano de expansão](./PLANO-EXPANSAO.md)

O Legis Watch sincroniza a **lista atual de senadores em exercício** via Dados Abertos do Senado.

## Sync

```bash
npm run sync -- senadores
```

Fonte live: `https://legis.senado.leg.br/dadosabertos/senador/lista/atual.json`  
Fallback: `src/lib/senado/fixtures/senadores-atual.json` se a API falhar.

## Busca e perfil

```http
GET /api/parlamentares?esfera=senador&nome=&siglaPartido=&siglaUf=
GET /api/parlamentares/senado/{codigo}
```

UI: esfera **Senadores** na home · perfil `/parlamentares/senado/{codigo}`.

## Cobertura

| Recurso | Status |
|---|---|
| Busca / perfil (nome, partido, UF, foto, e-mail) | Disponível |
| Página oficial no Senado | Link no perfil |
| Matérias / proposições | Em breve |
| Votações nominais | Em breve |
| Presença / faltas | **Não** via API — disclaimer no perfil + link ao tutorial de assiduidade |

## Disclaimer de presença

O Senado **não publica** na API um registro de presença equivalente ao bulk/SOAP da Câmara. Não inferimos faltas. Consulte o [tutorial de assiduidade](https://www12.senado.leg.br/assessoria-de-imprensa/tutorial-de-verificacao-da-assiduidade-dos-senadores) e o Diário do Senado.

## Código

- Client: `src/lib/senado/client.ts`
- Sync: `src/lib/sync/senado.ts`
- Model Prisma: `Senator`

---

## Continuar navegando

- [Índice](./README.md)
- [Estaduais](./estaduais.md)
- [Plano de expansão](./PLANO-EXPANSAO.md)
