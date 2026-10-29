import { isApprovedPropositionStatus } from "./status";

export type PropositionStatusCategory =
  | "todos"
  | "aprovado"
  | "em_tramitacao"
  | "aguardando"
  | "pronta_para_pauta"
  | "no_senado"
  | "arquivado"
  | "devolvido"
  | "finalizado"
  | "sem_status"
  | "outros";

export type StatusCategoryMeta = {
  id: PropositionStatusCategory;
  label: string;
  description: string;
};

function normalize(status?: string | null): string {
  if (!status) return "";
  return status
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();
}

export const STATUS_CATEGORIES: StatusCategoryMeta[] = [
  {
    id: "todos",
    label: "Todos",
    description:
      "Mostra todas as proposições sincronizadas deste mandato, independentemente da situação na Câmara.",
  },
  {
    id: "aprovado",
    label: "Aprovado / norma",
    description:
      "A proposição foi aprovada e virou norma jurídica (lei, emenda etc.) ou recebeu sanção/promulgação.",
  },
  {
    id: "em_tramitacao",
    label: "Em tramitação",
    description:
      "O projeto está em andamento: distribuição, análise de parecer, tramitação conjunta ou etapas semelhantes na Câmara.",
  },
  {
    id: "aguardando",
    label: "Aguardando",
    description:
      "Há uma etapa pendente — despacho, parecer, relator, encaminhamento ou outra providência interna.",
  },
  {
    id: "pronta_para_pauta",
    label: "Pronta para pauta",
    description:
      "A matéria já está apta a entrar na pauta de votação do plenário ou da comissão.",
  },
  {
    id: "no_senado",
    label: "No Senado",
    description:
      "A proposição segue para apreciação do Senado Federal após passagem pela Câmara.",
  },
  {
    id: "arquivado",
    label: "Arquivado",
    description:
      "O projeto foi arquivado ou está em remessa ao arquivo — em geral não segue adiante neste rito.",
  },
  {
    id: "devolvido",
    label: "Devolvido ao autor",
    description:
      "A proposição foi devolvida ao autor, normalmente por vícios formais ou pedido de correção.",
  },
  {
    id: "finalizado",
    label: "Tramitação finalizada",
    description:
      "A tramitação na Câmara foi encerrada sem enquadrar como norma aprovada nesta classificação.",
  },
  {
    id: "sem_status",
    label: "Sem status",
    description:
      "Ainda não há situação/tramitação sincronizada da Câmara para esta proposição.",
  },
  {
    id: "outros",
    label: "Outros",
    description:
      "Situações pontuais que não se encaixam nas categorias acima (publicações, notificações etc.).",
  },
];

const CATEGORY_BY_ID = Object.fromEntries(
  STATUS_CATEGORIES.map((c) => [c.id, c]),
) as Record<PropositionStatusCategory, StatusCategoryMeta>;

export function getStatusCategoryMeta(
  id: PropositionStatusCategory,
): StatusCategoryMeta {
  return CATEGORY_BY_ID[id] ?? CATEGORY_BY_ID.outros;
}

/** Classifica o status textual da Câmara em uma categoria de filtro. */
export function categorizePropositionStatus(
  statusResumo?: string | null,
): Exclude<PropositionStatusCategory, "todos"> {
  if (!statusResumo?.trim()) return "sem_status";

  const s = normalize(statusResumo);

  if (s.includes("rejeitad")) return "finalizado";
  if (s.includes("arquivad") || s.includes("remessa ao arquivo")) {
    return "arquivado";
  }
  if (isApprovedPropositionStatus(statusResumo)) return "aprovado";
  if (s.includes("devolvid")) return "devolvido";
  if (s.includes("senado")) return "no_senado";
  if (s.includes("pronta para pauta")) return "pronta_para_pauta";
  if (s.includes("tramitacao finalizada")) return "finalizado";
  if (s.startsWith("aguardando") || s.includes("aguardando ")) {
    return "aguardando";
  }
  if (
    s.includes("tramitando") ||
    s.includes("analise parecer") ||
    s.includes("distribuicao") ||
    s.includes("apresentacao de proposicao") ||
    s.includes("publicacao") ||
    s.includes("recebimento")
  ) {
    return "em_tramitacao";
  }

  return "outros";
}

export function explainPropositionStatus(
  statusResumo?: string | null,
): string {
  const category = categorizePropositionStatus(statusResumo);
  return getStatusCategoryMeta(category).description;
}

export function categoriesPresentIn(
  statuses: Array<string | null | undefined>,
): StatusCategoryMeta[] {
  const present = new Set(
    statuses.map((s) => categorizePropositionStatus(s)),
  );
  return STATUS_CATEGORIES.filter(
    (c) => c.id === "todos" || present.has(c.id as Exclude<PropositionStatusCategory, "todos">),
  );
}
