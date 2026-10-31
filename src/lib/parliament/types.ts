/** Esfera institucional do parlamentar no Legis Watch. */
export type ParliamentSphere =
  | "federal_deputado"
  | "estadual_deputado"
  | "senador";

/** Origem dos dados (adapter / casa). */
export type ParliamentSource =
  | "camara"
  | "alepe"
  | "almg"
  | "alep"
  | "senado"
  | string;

export type AssemblyDataMode = "live" | "fixture";

export type AssemblyInfo = {
  source: ParliamentSource;
  uf: string;
  name: string;
  sphere: ParliamentSphere;
  /** live = adapter consulta API oficial; fixture = cadastro de demonstração. */
  dataMode: AssemblyDataMode;
  coverage: {
    search: boolean;
    profile: boolean;
    propositions: boolean;
    votes: boolean;
    attendance: boolean;
  };
  docsUrl?: string;
};

export type AdapterParliamentarian = {
  externalId: string;
  nome: string;
  nomeEleitoral?: string | null;
  siglaPartido?: string | null;
  email?: string | null;
  urlFoto?: string | null;
  situacao?: string | null;
  raw?: unknown;
};

export type AdapterProposition = {
  externalId: string;
  siglaTipo?: string | null;
  numero?: number | null;
  ano?: number | null;
  ementa?: string | null;
  dataApresentacao?: string | null;
  statusResumo?: string | null;
  urlPublica?: string | null;
  authorExternalId?: string | null;
};

export type AdapterAffiliation = {
  codigoPartido: string | null;
  siglaPartido: string | null;
  nomePartido: string | null;
  dataFiliacao: string | null;
  dataDesfiliacao: string | null;
};

export type AdapterMandate = {
  codigoMandato: string | null;
  siglaUf: string | null;
  participacao: string | null;
  legislaturaInicio: number | null;
  legislaturaFim: number | null;
  dataInicio: string | null;
  dataFim: string | null;
};

/** status: presente | justificado | ausente */
export type AdapterAttendance = {
  dataSessao: string;
  year: number | null;
  status: "presente" | "justificado" | "ausente";
  observacao?: string | null;
};

export type AdapterVote = {
  externalId: string;
  tipoVoto: string;
  descricaoVotacao?: string | null;
  descricaoResultado?: string | null;
  dataSessao?: string | null;
  materiaExternalId?: string | null;
  materiaIdentificacao?: string | null;
  materiaEmenta?: string | null;
  urlPublica?: string | null;
};

export type AdapterProfileBundle = {
  affiliations: AdapterAffiliation[];
  mandates: AdapterMandate[];
  propositions: AdapterProposition[];
  attendance?: AdapterAttendance[];
  votes?: AdapterVote[];
};

export interface StateAssemblyAdapter {
  readonly info: AssemblyInfo;
  listParliamentarians(): Promise<AdapterParliamentarian[]>;
  getParliamentarian?(
    externalId: string,
  ): Promise<AdapterParliamentarian | null>;
  listPropositions?(
    authorExternalId: string,
  ): Promise<AdapterProposition[]>;
  /** Filiações + mandatos + matérias sob demanda (quando a casa publica). */
  fetchProfileBundle?(
    externalId: string,
  ): Promise<AdapterProfileBundle>;
}

export function parliamentarianId(
  source: ParliamentSource,
  externalId: string,
): string {
  return `${source}:${externalId}`;
}

export function parseParliamentarianId(
  id: string,
): { source: string; externalId: string } | null {
  const idx = id.indexOf(":");
  if (idx <= 0 || idx === id.length - 1) return null;
  return {
    source: id.slice(0, idx),
    externalId: id.slice(idx + 1),
  };
}
