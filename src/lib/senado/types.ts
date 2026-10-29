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

export type SenadoAffiliation = {
  codigoPartido: string | null;
  siglaPartido: string | null;
  nomePartido: string | null;
  dataFiliacao: string | null;
  dataDesfiliacao: string | null;
};

export type SenadoMandate = {
  codigoMandato: string | null;
  siglaUf: string | null;
  participacao: string | null;
  legislaturaInicio: number | null;
  legislaturaFim: number | null;
  dataInicio: string | null;
  dataFim: string | null;
};

export type SenadoMatter = {
  externalId: string;
  siglaTipo: string | null;
  numero: number | null;
  ano: number | null;
  ementa: string | null;
  dataApresentacao: string | null;
  identificacao: string | null;
  autorPrincipal: boolean;
  urlPublica: string | null;
};

export type SenadoProfileBundle = {
  affiliations: SenadoAffiliation[];
  mandates: SenadoMandate[];
  matters: SenadoMatter[];
};

export const SENADO_COVERAGE = {
  search: true,
  profile: true,
  propositions: true,
  votes: false,
  attendance: false,
} as const;

export const SENADO_ATTENDANCE_DISCLAIMER =
  "O Senado não publica na API um registro de presença equivalente ao da Câmara. Assiduidade oficial deve ser conferida no Diário do Senado; não inferimos faltas aqui.";

export const SENADO_MATTER_URL =
  "https://www25.senado.leg.br/web/atividade/materias/-/materia/";
