/**
 * Heurística a partir do status textual da Câmara.
 * "Aprovado" aqui = virou norma / foi aprovado / aguarda ou recebeu sanção.
 * Não inclui arquivadas nem rejeitadas.
 */
export function isApprovedPropositionStatus(
  statusResumo?: string | null,
): boolean {
  if (!statusResumo) return false;
  const s = statusResumo
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

  if (s.includes("rejeitad") || s.includes("arquivad")) return false;

  return (
    s.includes("transformado em norma") ||
    s.includes("norma juridica") ||
    s.includes("sancionad") ||
    s.includes("aprovad") ||
    s.includes("promulgad")
  );
}
