/**
 * Fotos oficiais dos deputados vêm da API da Câmara (`urlFoto`)
 * ou do CDN estável por id: /internet/deputado/bandep/{id}.jpg
 */
export function camaraBandepUrl(deputyId: number): string {
  return `https://www.camara.leg.br/internet/deputado/bandep/${deputyId}.jpg`;
}

export function resolveDeputyPhotoUrl(
  deputyId: number,
  urlFoto?: string | null,
): string {
  const trimmed = urlFoto?.trim();
  if (trimmed) return trimmed;
  return camaraBandepUrl(deputyId);
}
