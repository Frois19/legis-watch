export type VoteTypeFilter =
  | "todos"
  | "sim"
  | "nao"
  | "abstencao"
  | "outros";

export type VoteTypeMeta = {
  id: VoteTypeFilter;
  label: string;
  description: string;
};

export const VOTE_TYPE_FILTERS: VoteTypeMeta[] = [
  {
    id: "todos",
    label: "Todos os votos",
    description: "Lista completa das votações nominais sincronizadas.",
  },
  {
    id: "sim",
    label: "Votou Sim",
    description: "Projetos/matérias em que o deputado registrou voto Sim.",
  },
  {
    id: "nao",
    label: "Votou Não",
    description: "Projetos/matérias em que o deputado registrou voto Não.",
  },
  {
    id: "abstencao",
    label: "Absteve-se",
    description: "Casos de Abstenção no registro nominal.",
  },
  {
    id: "outros",
    label: "Outros (obstrução etc.)",
    description:
      "Obstrução, Artigo 17 e demais registros que não são Sim, Não ou Abstenção.",
  },
];

export function categorizeVoteType(tipoVoto: string): Exclude<
  VoteTypeFilter,
  "todos"
> {
  const t = tipoVoto.trim().toLowerCase();
  if (t.includes("sim")) return "sim";
  if (t.includes("não") || t.includes("nao")) return "nao";
  if (t.includes("absten")) return "abstencao";
  return "outros";
}

export function countVoteTypes(
  items: Array<{ tipoVoto: string }>,
): Record<Exclude<VoteTypeFilter, "todos">, number> {
  const counts = { sim: 0, nao: 0, abstencao: 0, outros: 0 };
  for (const item of items) {
    counts[categorizeVoteType(item.tipoVoto)] += 1;
  }
  return counts;
}
