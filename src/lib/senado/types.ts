export type SenadoListRow = {
  CodigoParlamentar: string;
  NomeParlamentar: string;
  NomeCompletoParlamentar?: string;
  SiglaPartidoParlamentar?: string;
  UfParlamentar?: string;
  EmailParlamentar?: string;
  UrlFotoParlamentar?: string;
  UrlPaginaParlamentar?: string;
  DescricaoParticipacao?: string;
};

export type SenadoParliamentarian = {
  externalId: string;
  nome: string;
  nomeCivil: string | null;
  nomeEleitoral: string | null;
  siglaPartido: string | null;
  siglaUf: string | null;
  email: string | null;
  urlFoto: string | null;
  urlPagina: string | null;
  situacao: string | null;
  participacao: string | null;
  raw?: unknown;
};

export const SENADO_COVERAGE = {
  search: true,
  profile: true,
  propositions: false,
  votes: false,
  attendance: false,
} as const;

export const SENADO_ATTENDANCE_DISCLAIMER =
  "O Senado não publica na API um registro de presença equivalente ao da Câmara. Assiduidade oficial deve ser conferida no Diário do Senado; não inferimos faltas aqui.";
