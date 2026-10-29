# Deputados estaduais — cobertura por UF

> Navegação: [Índice](./README.md) · [Guia do produto](./GUIA-DO-PRODUTO.md) · [API interna](./backend-api.md) · [Plano de expansão](./PLANO-EXPANSAO.md)

O Legis Watch busca e exibe **deputados estaduais** (e do DF) em todas as **27 UFs**. A qualidade dos dados depende da casa:

| Origem | O que significa |
|---|---|
| **Live** | Adapter consulta a API oficial da Assembleia (com fallback para fixture se a rede falhar) |
| **Fixture** | Cadastro de demonstração local — busca e perfil mínimos até haver adapter live |

## Sync

```bash
# Todas as 27 UFs
npm run sync -- estadual --source=all

# Só uma casa (ex.: PE)
npm run sync -- estadual --source=alepe
```

Catálogo em runtime: `GET /api/assembleias` (inclui `syncedCount` e flags de cobertura).

## Catálogo de casas

| UF | `source` | Casa | Dados hoje |
|---|---|---|---|
| AC | `aleac` | Assembleia Legislativa do Acre | Fixture |
| AL | `aleal` | Assembleia Legislativa de Alagoas | Fixture |
| AP | `aleap` | Assembleia Legislativa do Amapá | Fixture |
| AM | `aleam` | Assembleia Legislativa do Amazonas | Fixture |
| BA | `alba` | Assembleia Legislativa da Bahia | Fixture |
| CE | `alce` | Assembleia Legislativa do Ceará | Fixture |
| DF | `cldf` | Câmara Legislativa do Distrito Federal | Fixture |
| ES | `ales` | Assembleia Legislativa do Espírito Santo | Fixture |
| GO | `alego` | Assembleia Legislativa de Goiás | Fixture |
| MA | `alema` | Assembleia Legislativa do Maranhão | Fixture |
| MT | `almt` | Assembleia Legislativa de Mato Grosso | Fixture |
| MS | `alems` | Assembleia Legislativa de Mato Grosso do Sul | Fixture |
| MG | `almg` | Assembleia Legislativa de Minas Gerais | Fixture (API live planejada) |
| PA | `alepa` | Assembleia Legislativa do Pará | Fixture |
| PB | `alepb` | Assembleia Legislativa da Paraíba | Fixture |
| PR | `alep` | Assembleia Legislativa do Paraná | Fixture (API live planejada) |
| PE | `alepe` | Assembleia Legislativa de Pernambuco | **Live** (ALEPE) + fixture fallback |
| PI | `alepi` | Assembleia Legislativa do Piauí | Fixture |
| RJ | `alerj` | Assembleia Legislativa do Rio de Janeiro | Fixture |
| RN | `alern` | Assembleia Legislativa do Rio Grande do Norte | Fixture |
| RS | `alers` | Assembleia Legislativa do Rio Grande do Sul | Fixture |
| RO | `alero` | Assembleia Legislativa de Rondônia | Fixture |
| RR | `alerr` | Assembleia Legislativa de Roraima | Fixture |
| SC | `alesc` | Assembleia Legislativa de Santa Catarina | Fixture |
| SP | `alesp` | Assembleia Legislativa de São Paulo | Fixture |
| SE | `alese` | Assembleia Legislativa de Sergipe | Fixture |
| TO | `aleto` | Assembleia Legislativa do Tocantins | Fixture |

Código de referência:

- Catálogo: `src/lib/parliament/ufs.ts`
- Adapters: `src/lib/parliament/adapters/`
- Fixtures: `src/lib/parliament/fixtures/estaduais-por-uf.json`
- Sync: `src/lib/sync/estadual.ts`

## O que cada perfil estadual mostra hoje

Disponível em todas as UFs (após sync):

- Nome, partido, UF, e-mail (quando houver)
- Badge da casa + link para dados abertos / portal
- Tabela de cobertura (busca/perfil vs proposições/votos/presença)

Ainda **não** disponível no estadual (aguardam adapter live da casa):

- Proposições / projetos
- Votações nominais
- Presença / faltas
- Favoritos (hoje só federais)

URL do perfil: `/parlamentares/{source}/{externalId}`  
Ex.: `/parlamentares/alepe/joao-paulo`, `/parlamentares/alesp/gabriela-sao-paulo`

## Testes

```bash
npm test                   # inclui matriz unitária por UF
npm run test:integration   # sync all + busca/perfil nas 27 UFs
```

Arquivos principais:

- `src/app/api/parlamentares/ufs-matrix.test.ts`
- `src/test/integration/estadual-ufs.integration.test.ts`
- `src/lib/parliament/ufs.test.ts`

## Próximos adapters live (plano)

Ordem sugerida no [plano de expansão](./PLANO-EXPANSAO.md): **ALMG (MG)** → **ALEP (PR)** → SAPL multi-UF → demais casas.

---

## Continuar navegando

- [Índice da documentação](./README.md)
- [API interna](./backend-api.md)
- [Plano de expansão + cache](./PLANO-EXPANSAO.md)
