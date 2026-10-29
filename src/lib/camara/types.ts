export type CamaraListResponse<T> = {
  dados: T[];
  links?: Array<{ rel: string; href: string }>;
};

export type CamaraDeputyListItem = {
  id: number;
  uri?: string;
  nome: string;
  siglaPartido?: string;
  uriPartido?: string;
  siglaUf?: string;
  idLegislatura?: number;
  urlFoto?: string;
  email?: string;
};

export type CamaraDeputyDetail = {
  id: number;
  uri?: string;
  nomeCivil?: string;
  cpf?: string;
  sexo?: string;
  urlWebsite?: string;
  redeSocial?: string[];
  dataNascimento?: string;
  dataFalecimento?: string;
  ufNascimento?: string;
  municipioNascimento?: string;
  escolaridade?: string;
  ultimoStatus?: {
    id?: number;
    uri?: string;
    nome?: string;
    siglaPartido?: string;
    uriPartido?: string;
    siglaUf?: string;
    idLegislatura?: number;
    urlFoto?: string;
    email?: string;
    data?: string;
    nomeEleitoral?: string;
    situacao?: string;
    condicaoEleitoral?: string;
    gabinete?: Record<string, unknown>;
  };
};

export type CamaraParty = {
  id: number;
  uri?: string;
  sigla?: string;
  nome?: string;
  idLegislatura?: number;
};

export type CamaraLegislature = {
  id: number;
  uri?: string;
  dataInicio: string;
  dataFim: string;
};

export type CamaraDeputyHistorico = {
  id?: number;
  uri?: string;
  nome?: string;
  nomeEleitoral?: string;
  siglaPartido?: string;
  uriPartido?: string;
  siglaUf?: string;
  idLegislatura?: number;
  situacao?: string;
  condicaoEleitoral?: string;
  dataHora?: string;
  urlFoto?: string;
};

export type CamaraProposition = {
  id: number;
  uri?: string;
  siglaTipo?: string;
  numero?: number;
  ano?: number;
  ementa?: string;
  dataApresentacao?: string;
  statusProposicao?: {
    descricaoSituacao?: string;
    descricaoTramitacao?: string;
  };
};

export type CamaraPropositionAuthor = {
  uri?: string;
  nome?: string;
  codTipo?: number;
  tipo?: string;
  ordemAssinatura?: number;
  proponente?: number;
};

export type CamaraBulkVoteSession = {
  id: string | number;
  dataHoraRegistro?: string;
  descricao?: string;
  aprovacao?: number | boolean | null;
  siglaOrgao?: string;
  ultimaApresentacaoProposicao?: {
    idProposicao?: number | string;
    uriProposicao?: string;
    descricao?: string;
  };
};

export type CamaraBulkVote = {
  idVotacao?: string | number;
  idDeputado?: number | string;
  deputado_?: { id?: number | string };
  voto?: string;
  dataHoraVoto?: string;
  dataHoraRegistro?: string;
};

export type CamaraBulkVoteProposition = {
  idVotacao?: string | number;
  proposicao_?: {
    id?: number | string;
    uri?: string;
    titulo?: string;
    ementa?: string;
    siglaTipo?: string;
    numero?: number;
    ano?: number;
  };
};

export type CamaraBulkEvent = {
  id: number;
  dataHoraInicio?: string;
  dataHoraFim?: string;
  situacao?: string;
  descricaoTipo?: string;
  descricao?: string;
  localCamara?: { nome?: string } | string;
};

export type CamaraEventDetail = {
  id: number;
  dataHoraInicio?: string;
  dataHoraFim?: string;
  situacao?: string;
  descricaoTipo?: string;
  descricao?: string;
  localCamara?: { nome?: string } | string;
  urlRegistro?: string | null;
};

export type CamaraEventPautaItem = {
  ordem?: number;
  topico?: string | null;
  regime?: string | null;
  titulo?: string | null;
  situacaoItem?: string | null;
  uriVotacao?: string | null;
  proposicao_?: {
    id?: number;
    uri?: string;
    siglaTipo?: string;
    numero?: number;
    ano?: number;
    ementa?: string;
  } | null;
  proposicaoRelacionada_?: {
    id?: number;
    uri?: string;
    siglaTipo?: string;
    numero?: number;
    ano?: number;
    ementa?: string;
  } | null;
};

export type CamaraBulkAttendance = {
  idEvento?: number;
  idDeputado?: number;
  dataHoraInicio?: string;
};
