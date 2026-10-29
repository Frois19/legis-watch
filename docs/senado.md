# Senadores — Senado Federal

> Navegação: [Índice](./README.md) · [Guia do produto](./GUIA-DO-PRODUTO.md) · [API interna](./backend-api.md) · [Plano de expansão](./PLANO-EXPANSAO.md)

O Legis Watch sincroniza a **lista atual de senadores em exercício** e, sob demanda, **filiações, mandatos e matérias de autoria** via Dados Abertos do Senado.

## Sync

```bash
# Lista em exercício (cadastro)
npm run sync -- senadores

# Perfil enriquecido de um senador (filiações + mandatos + autorias)
npm run sync -- senador-perfil --codigo=5672
```

Fontes live:

| Recurso | Endpoint |
|---|---|
| Lista atual | `/senador/lista/atual.json` |
| Filiações | `/senador/{codigo}/filiacoes.json` |
| Mandatos | `/senador/{codigo}/mandatos.json` |
| Autorias / matérias | `/senador/{codigo}/autorias.json` |

Fallbacks: `src/lib/senado/fixtures/senadores-atual.json` e `senador-perfil.json` se a API falhar.

O perfil também é enriquecido **ao abrir** `/parlamentares/senado/{codigo}` ou `GET /api/parlamentares/senado/{codigo}` (TTL `SENADO_PROFILE_TTL_MS`, padrão 24h). Autorias são limitadas por `SENADO_MATTER_LIMIT` (padrão 80).

## Busca e perfil

```http
GET /api/parlamentares?esfera=senador&nome=&siglaPartido=&siglaUf=
GET /api/parlamentares/senado/{codigo}
```

Resposta do perfil inclui `affiliations`, `mandates`, `matters`, `profileSyncedAt` e `attendanceDisclaimer`.

UI: esfera **Senadores** na home · perfil `/parlamentares/senado/{codigo}` com abas Matérias / Filiações / Mandatos / Cobertura.

## Cobertura

| Recurso | Status |
|---|---|
| Busca / perfil (nome, partido, UF, foto, e-mail) | Disponível |
| Página oficial no Senado | Link no perfil |
| Filiações partidárias | Disponível (sob demanda) |
| Mandatos / legislaturas | Disponível (sob demanda) |
| Matérias / proposições (autorias) | Disponível (sob demanda, limite configurável) |
| Votações nominais | Em breve |
| Presença / faltas | **Não** via API — disclaimer no perfil + link ao tutorial de assiduidade |

## Disclaimer de presença

O Senado **não publica** na API um registro de presença equivalente ao bulk/SOAP da Câmara. Não inferimos faltas. Consulte o [tutorial de assiduidade](https://www12.senado.leg.br/assessoria-de-imprensa/tutorial-de-verificacao-da-assiduidade-dos-senadores) e o Diário do Senado.

## Código

- Client: `src/lib/senado/client.ts`
- Sync: `src/lib/sync/senado.ts` (`syncSenadores`, `syncSenatorProfile`, `ensureSenatorProfile`)
- Models Prisma: `Senator`, `SenatorAffiliation`, `SenatorMandate`, `SenatorMatter`
- UI: `src/components/senator-profile.tsx`

---

## Continuar navegando

- [Índice](./README.md)
- [Estaduais](./estaduais.md)
- [Plano de expansão](./PLANO-EXPANSAO.md)
