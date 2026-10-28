export type Party = {
  id: number;
  sigla: string;
  nome: string | null;
  uri?: string | null;
  legislaturaId?: number | null;
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
  syncedAt: string | null;
};

export type Paginated<T> = {
  page: number;
  pageSize: number;
  total: number;
  items: T[];
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
    siglaTipo: string | null;
    numero: number | null;
    ano: number | null;
    ementa: string | null;
  } | null;
};

export type AttendanceResponse = {
  year: number;
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
