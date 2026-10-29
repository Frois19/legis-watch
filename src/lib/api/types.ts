export type Party = {
  id: number;
  sigla: string;
  nome: string | null;
  uri?: string | null;
  legislaturaId?: number | null;
};

export type LegislatureItem = {
  id: number;
  dataInicio: string;
  dataFim: string;
  label: string;
};

export type MandateItem = {
  legislaturaId: number;
  siglaPartido: string | null;
  siglaUf: string | null;
  situacao: string | null;
  condicaoEleitoral: string | null;
  nomeEleitoral: string | null;
  dataInicio: string;
  dataFim: string;
  label: string;
};

export type DeputyListItem = {
  id: number;
  nome: string;
  nomeEleitoral: string | null;
  siglaPartido: string | null;
  siglaUf: string | null;
  legislaturaId: number | null;
  urlFoto: string | null;
  email: string | null;
  situacao: string | null;
  redesSociais: string[];
  party: Party | null;
};

export type DeputyDetail = DeputyListItem & {
  nomeCivil: string | null;
  condicaoEleitoral: string | null;
  dataNascimento: string | null;
  municipioNascimento: string | null;
  escolaridade: string | null;
  gabinete: Record<string, unknown> | null;
  partyMembers: Array<{
    id: number;
    nome: string;
    siglaUf: string | null;
    urlFoto: string | null;
  }>;
  mandates: MandateItem[];
  selectedLegislaturaId: number | null;
  syncedAt: string | null;
};

export type Paginated<T> = {
  page: number;
  pageSize: number;
  total: number;
  items: T[];
};

export type PropositionStats = {
  apresentados: number;
  aprovados: number;
};

export type PropositionItem = {
  id: number;
  uri: string | null;
  siglaTipo: string | null;
  numero: number | null;
  ano: number | null;
  ementa: string | null;
  dataApresentacao: string | null;
  statusResumo: string | null;
  proponente: boolean;
  urlCamara: string;
};

export type VotePropositionAuthor = {
  id: number;
  nome: string;
  siglaPartido: string | null;
  siglaUf: string | null;
  proponente: boolean;
};

export type EnrichedProposition = {
  id: number;
  ementa: string | null;
  dataApresentacao: string | null;
  statusResumo: string | null;
  siglaTipo: string | null;
  numero: number | null;
  ano: number | null;
  authorsResumo: string | null;
  authors: VotePropositionAuthor[];
};

export type VoteItem = {
  id: number;
  tipoVoto: string;
  dataRegistro: string | null;
  year: number | null;
  votacao: {
    id: string;
    descricao: string | null;
    dataHoraRegistro: string | null;
    aprovacao: boolean | null;
    siglaOrgao: string | null;
  };
  proposicao: {
    id: number;
    uri: string | null;
    siglaTipo: string | null;
    numero: number | null;
    ano: number | null;
    ementa: string | null;
    dataApresentacao: string | null;
    statusResumo: string | null;
    authorsResumo: string | null;
    urlCamara: string;
    authors: VotePropositionAuthor[];
  } | null;
};

export type AttendanceResponse = {
  year: number | null;
  years: number[];
  page: number;
  pageSize: number;
  total: number;
  summary: {
    eventosConsiderados: number;
    presentes: number;
    faltas: number;
    metodologia: string;
  };
  items: Array<{
    eventId: number;
    dataHoraInicio: string | null;
    dataHoraFim: string | null;
    descricaoTipo: string | null;
    descricao: string | null;
    localCamara: string | null;
    situacao: string | null;
    presente: boolean;
    status: string;
  }>;
};

export type EventAtaPautaItem = {
  ordem: number | null;
  titulo: string | null;
  topico: string | null;
  regime: string | null;
  situacaoItem: string | null;
  ementa: string | null;
  proposicaoId: number | null;
  urlCamara: string | null;
  uriVotacao: string | null;
};

export type EventAtaVotacao = {
  id: string;
  descricao: string | null;
  dataHoraRegistro: string | null;
  aprovacao: boolean | null;
  proposicaoId: number | null;
  proposicaoLabel: string | null;
  urlCamara: string | null;
};

export type EventAta = {
  eventId: number;
  descricao: string | null;
  dataHoraInicio: string | null;
  situacao: string | null;
  urlEvento: string;
  urlRegistro: string | null;
  pauta: EventAtaPautaItem[];
  votacoes: EventAtaVotacao[];
};
