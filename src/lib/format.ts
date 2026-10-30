export function formatDateTime(value?: string | null): string {
  if (!value) return "Data indisponível";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

/** Texto de frescor relativo em pt-BR (ex.: "há 2 h", "há 3 dias"). */
export function formatRelativeTime(
  value?: string | Date | null,
  nowMs = Date.now(),
): string {
  if (!value) return "ainda não sincronizado";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "data inválida";
  const diffMs = nowMs - date.getTime();
  if (diffMs < 0) return "agora";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days} dia${days === 1 ? "" : "s"}`;
  const months = Math.floor(days / 30);
  return `há ${months} mês${months === 1 ? "" : "es"}`;
}

export function formatDate(value?: string | null): string {
  if (!value) return "Data indisponível";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(date);
}

export function propositionLabel(item: {
  siglaTipo?: string | null;
  numero?: number | null;
  ano?: number | null;
}): string {
  return [item.siglaTipo, item.numero, item.ano]
    .filter((v) => v != null && v !== "")
    .join(" ");
}

/** Ficha pública de tramitação na Câmara (leitura humana). */
export function camaraPropositionUrl(propositionId: number): string {
  return `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${propositionId}`;
}

export function voteApprovalLabel(
  aprovacao?: boolean | null,
): "Aprovado" | "Rejeitado" | "Resultado não informado" {
  if (aprovacao === true) return "Aprovado";
  if (aprovacao === false) return "Rejeitado";
  return "Resultado não informado";
}

export function socialLabel(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("twitter") || host.includes("x.com")) return "X (Twitter)";
    if (host.includes("facebook")) return "Facebook";
    if (host.includes("instagram")) return "Instagram";
    if (host.includes("youtube")) return "YouTube";
    return host;
  } catch {
    return "Rede social";
  }
}
