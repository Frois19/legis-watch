# Deputados estaduais — cobertura por UF

> Navegação: [Índice](./README.md) · [Guia do usuário](./GUIA-DO-PRODUTO.md) · [API interna](./backend-api.md) · [Plano de expansão](./PLANO-EXPANSAO.md)

O Legis Watch busca e exibe **deputados estaduais** (e do DF) em todas as **27 UFs**. A qualidade dos dados depende da casa:

| Origem | O que significa |
|---|---|
| **Live** | Adapter consulta a API oficial da Assembleia (com fallback para fixture se a rede falhar) |
| **Fixture** | Cadastro de demonstração local — busca e perfil mínimos até haver adapter live |

## Sync

```bash
# Todas as 27 UFs
npm run sync -- estadual --source=all

# Só uma casa (ex.: PE, MG, AC)
npm run sync -- estadual --source=alepe
npm run sync -- estadual --source=almg
npm run sync -- estadual --source=aleac

# Perfil enriquecido (filiações / mandatos / proposições) de um parlamentar
npm run sync -- estadual-perfil --source=aleac --codigo=248
```

O perfil também é enriquecido **ao abrir** `/parlamentares/{source}/{id}` quando a casa expõe `fetchProfileBundle` (TTL `ESTADUAL_PROFILE_TTL_MS`).

Catálogo em runtime: `GET /api/assembleias` (inclui `syncedCount` e flags de cobertura).

## Catálogo de casas

| UF | `source` | Casa | Dados hoje |
|---|---|---|---|
| AC | `aleac` | Assembleia Legislativa do Acre | **Live SAPL** — cadastro + filiações + mandatos + matérias |
| AL | `aleal` | Assembleia Legislativa de Alagoas | **Live SAPL** — cadastro + filiações + mandatos + matérias |
| AP | `aleap` | Assembleia Legislativa do Amapá | Fixture |
| AM | `aleam` | Assembleia Legislativa do Amazonas | **Live SAPL** — cadastro + filiações + mandatos + matérias |
| BA | `alba` | Assembleia Legislativa da Bahia | Fixture |
| CE | `alce` | Assembleia Legislativa do Ceará | Fixture |
| DF | `cldf` | Câmara Legislativa do Distrito Federal | Fixture |
| ES | `ales` | Assembleia Legislativa do Espírito Santo | Fixture |
| GO | `alego` | Assembleia Legislativa de Goiás | Fixture |
| MA | `alema` | Assembleia Legislativa do Maranhão | Fixture |
| MT | `almt` | Assembleia Legislativa de Mato Grosso | Fixture |
| MS | `alems` | Assembleia Legislativa de Mato Grosso do Sul | Fixture |
| MG | `almg` | Assembleia Legislativa de Minas Gerais | **Live ALMG** — cadastro + filiações + mandatos + proposições (CSV anual; REST 403) |
| PA | `alepa` | Assembleia Legislativa do Pará | Fixture |
| PB | `alepb` | Assembleia Legislativa da Paraíba | **Live SAPL** — cadastro + filiações + mandatos + matérias |
| PR | `alep` | Assembleia Legislativa do Paraná | **Live ALEP** — cadastro + proposições + **presença** (portal transparência; cache HTTP) |
| PE | `alepe` | Assembleia Legislativa de Pernambuco | **Live ALEPE** — cadastro + proposições (XML anual; fixture se a API falhar) |
| PI | `alepi` | Assembleia Legislativa do Piauí | **Live SAPL** — cadastro + filiações + mandatos + matérias |
| RJ | `alerj` | Assembleia Legislativa do Rio de Janeiro | Fixture |
| RN | `alern` | Assembleia Legislativa do Rio Grande do Norte | Fixture |
| RS | `alers` | Assembleia Legislativa do Rio Grande do Sul | Fixture |
| RO | `alero` | Assembleia Legislativa de Rondônia | **Live SAPL** — cadastro + filiações + mandatos + matérias |
| RR | `alerr` | Assembleia Legislativa de Roraima | Fixture |
| SC | `alesc` | Assembleia Legislativa de Santa Catarina | Fixture |
| SP | `alesp` | Assembleia Legislativa de São Paulo | **Live ALESP** — cadastro + proposições (`deputados.xml` + ZIPs; cache em disco) |
| SE | `alese` | Assembleia Legislativa de Sergipe | Fixture |
| TO | `aleto` | Assembleia Legislativa do Tocantins | **Live SAPL** — cadastro + filiações + mandatos + matérias |

**Resumo:** 11 casas live (PE + MG + SP + PR + 7 SAPL). Demais 16 UFs em fixture de cadastro.

Pesquisa de endpoints para os gaps restantes: [fontes-endpoints.md](./fontes-endpoints.md).

Código de referência:

- Catálogo: `src/lib/parliament/ufs.ts`
- Adapters: `src/lib/parliament/adapters/` (`alepe`, `almg`, `alesp`, `alep`, `sapl`, `fixture-assembly`)
- Cache HTTP: `src/lib/cache/http-cache.ts` (memória + `.cache/parliament`)
- Fixtures: `src/lib/parliament/fixtures/`
- Sync: `src/lib/sync/estadual.ts`

## O que cada perfil estadual mostra

Disponível em todas as UFs (após sync de cadastro):

- Nome, partido, UF, e-mail (quando houver)
- Badge da casa + link para dados abertos / portal
- Tabela de cobertura

Nas casas **SAPL** e **ALMG**, o perfil ganha abas:

| Aba | Conteúdo |
|---|---|
| **Proposições** | Autorias / matérias (SAPL + ALMG CSV; limite `ESTADUAL_MATTER_LIMIT`) |
| **Filiações** | Histórico partidário |
| **Mandatos** | Legislaturas / período |
| **Cobertura** | Flags da casa |

**ALESP (SP):** cadastro + proposições no perfil (primeira carga indexa os ZIPs; depois usa cache).  
**ALEP (PR):** cadastro via folha de remuneração + proposições + presença plenária + **votos nominais** (ZIP/XLSX por sessão, cache HTTP).  
**ALEPE (PE):** proposições quando a API responde; senão fixture de demonstração no enriquecimento.

Ainda **não** disponível no estadual (APIs sem endpoint útil por parlamentar ou portal HTML):

- Votações nominais fora do Paraná  
- Presença / faltas fora do Paraná

Favoritos locais cobrem federal, estadual e senador (mesmo navegador).

Lista dedicada de proposições sincronizadas:

```http
GET /api/parlamentares/{source}/{id}/proposicoes?page=1&pageSize=50
```

Prints no [guia](./GUIA-DO-PRODUTO.md#7-perfil-estadual): PE, SP, PR (proposições + presença + votos), MG, AC — cada um em **claro e escuro**.

URL do perfil: `/parlamentares/{source}/{externalId}`  
Ex.: `/parlamentares/aleac/248`, `/parlamentares/almg/12193`, `/parlamentares/alep/7000394`

## Testes

```bash
npm test                   # matriz por UF + adapters + sync de perfil
npm run test:integration   # sync + busca/perfil nas 27 UFs
npm run docs:screenshots   # regenera prints do guia (dev em :3456)
```

## Próximos passos (dados)

1. CLDF quando o egress responder  
2. Mais SAPL / CKAN onde o probe passar  
3. Presença em outras UFs se surgir API estável  

Detalhes: [fontes-endpoints.md](./fontes-endpoints.md) · [roadmap](./PLANO-EXPANSAO.md).

---

## Continuar

- [Índice](./README.md) · [API interna](./backend-api.md) · [Roadmap](./PLANO-EXPANSAO.md)
