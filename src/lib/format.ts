export function formatDateTime(value?: string | null): string {
  if (!value) return "Data indisponível";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
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
