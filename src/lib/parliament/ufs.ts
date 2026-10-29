/** Unidades federativas do Brasil (26 estados + DF). */
export const BRAZIL_UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

export type BrazilUf = (typeof BRAZIL_UFS)[number];

export type AssemblyCatalogEntry = {
  source: string;
  uf: BrazilUf;
  name: string;
  docsUrl?: string;
};

/** Catálogo canônico de casas estaduais / Câmara Legislativa do DF. */
export const ASSEMBLY_CATALOG: AssemblyCatalogEntry[] = [
  {
    source: "aleac",
    uf: "AC",
    name: "Assembleia Legislativa do Acre",
    docsUrl: "https://www.al.ac.leg.br/",
  },
  {
    source: "aleal",
    uf: "AL",
    name: "Assembleia Legislativa de Alagoas",
    docsUrl: "https://www.al.al.leg.br/",
  },
  {
    source: "aleap",
    uf: "AP",
    name: "Assembleia Legislativa do Amapá",
    docsUrl: "https://www.al.ap.gov.br/",
  },
  {
    source: "aleam",
    uf: "AM",
    name: "Assembleia Legislativa do Amazonas",
    docsUrl: "https://www.aleam.gov.br/",
  },
  {
    source: "alba",
    uf: "BA",
    name: "Assembleia Legislativa da Bahia",
    docsUrl: "https://www.al.ba.gov.br/",
  },
  {
    source: "alce",
    uf: "CE",
    name: "Assembleia Legislativa do Ceará",
    docsUrl: "https://www.al.ce.gov.br/",
  },
  {
    source: "cldf",
    uf: "DF",
    name: "Câmara Legislativa do Distrito Federal",
    docsUrl: "https://www.cl.df.gov.br/",
  },
  {
    source: "ales",
    uf: "ES",
    name: "Assembleia Legislativa do Espírito Santo",
    docsUrl: "https://www.al.es.gov.br/",
  },
  {
    source: "alego",
    uf: "GO",
    name: "Assembleia Legislativa de Goiás",
    docsUrl: "https://portal.al.go.leg.br/",
  },
  {
    source: "alema",
    uf: "MA",
    name: "Assembleia Legislativa do Maranhão",
    docsUrl: "https://www.al.ma.leg.br/",
  },
  {
    source: "almt",
    uf: "MT",
    name: "Assembleia Legislativa de Mato Grosso",
    docsUrl: "https://www.al.mt.gov.br/",
  },
  {
    source: "alems",
    uf: "MS",
    name: "Assembleia Legislativa de Mato Grosso do Sul",
    docsUrl: "https://www.al.ms.gov.br/",
  },
  {
    source: "almg",
    uf: "MG",
    name: "Assembleia Legislativa de Minas Gerais",
    docsUrl: "https://dadosabertos.almg.gov.br/",
  },
  {
    source: "alepa",
    uf: "PA",
    name: "Assembleia Legislativa do Pará",
    docsUrl: "https://www.alepa.pa.gov.br/",
  },
  {
    source: "alepb",
    uf: "PB",
    name: "Assembleia Legislativa da Paraíba",
    docsUrl: "https://www.al.pb.leg.br/",
  },
  {
    source: "alep",
    uf: "PR",
    name: "Assembleia Legislativa do Paraná",
    docsUrl: "http://webservices.assembleia.pr.leg.br/",
  },
  {
    source: "alepe",
    uf: "PE",
    name: "Assembleia Legislativa de Pernambuco",
    docsUrl: "https://dadosabertos.alepe.pe.gov.br/?documentacao=parlamentares",
  },
  {
    source: "alepi",
    uf: "PI",
    name: "Assembleia Legislativa do Piauí",
    docsUrl: "https://www.alepi.pi.gov.br/",
  },
  {
    source: "alerj",
    uf: "RJ",
    name: "Assembleia Legislativa do Rio de Janeiro",
    docsUrl: "https://www.alerj.rj.gov.br/",
  },
  {
    source: "alern",
    uf: "RN",
    name: "Assembleia Legislativa do Rio Grande do Norte",
    docsUrl: "https://www.al.rn.gov.br/",
  },
  {
    source: "alers",
    uf: "RS",
    name: "Assembleia Legislativa do Rio Grande do Sul",
    docsUrl: "https://www.al.rs.gov.br/",
  },
  {
    source: "alero",
    uf: "RO",
    name: "Assembleia Legislativa de Rondônia",
    docsUrl: "https://www.al.ro.leg.br/",
  },
  {
    source: "alerr",
    uf: "RR",
    name: "Assembleia Legislativa de Roraima",
    docsUrl: "https://www.al.rr.leg.br/",
  },
  {
    source: "alesc",
    uf: "SC",
    name: "Assembleia Legislativa de Santa Catarina",
    docsUrl: "https://www.alesc.sc.gov.br/",
  },
  {
    source: "alesp",
    uf: "SP",
    name: "Assembleia Legislativa de São Paulo",
    docsUrl: "https://www.al.sp.gov.br/",
  },
  {
    source: "alese",
    uf: "SE",
    name: "Assembleia Legislativa de Sergipe",
    docsUrl: "https://www.al.se.leg.br/",
  },
  {
    source: "aleto",
    uf: "TO",
    name: "Assembleia Legislativa do Tocantins",
    docsUrl: "https://www.al.to.leg.br/",
  },
];

export function getCatalogEntry(source: string): AssemblyCatalogEntry | undefined {
  return ASSEMBLY_CATALOG.find((a) => a.source === source);
}

export function getCatalogEntryByUf(uf: string): AssemblyCatalogEntry | undefined {
  return ASSEMBLY_CATALOG.find((a) => a.uf === uf.toUpperCase());
}
