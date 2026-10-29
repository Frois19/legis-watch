import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.camara.leg.br",
      },
      {
        protocol: "https",
        hostname: "camara.leg.br",
      },
      {
        protocol: "https",
        hostname: "www.senado.leg.br",
      },
      {
        protocol: "https",
        hostname: "www25.senado.leg.br",
      },
      {
        protocol: "https",
        hostname: "legis.senado.leg.br",
      },
      {
        protocol: "https",
        hostname: "dadosabertos.almg.gov.br",
      },
      {
        protocol: "https",
        hostname: "www.almg.gov.br",
      },
      // Fotos SAPL das Assembleias (AC/AL/AM/PB/PI/RO/TO)
      { protocol: "https", hostname: "sapl.al.ac.leg.br" },
      { protocol: "https", hostname: "sapl.al.al.leg.br" },
      { protocol: "https", hostname: "sapl.al.am.leg.br" },
      { protocol: "https", hostname: "sapl.al.pb.leg.br" },
      { protocol: "https", hostname: "sapl.al.pi.leg.br" },
      { protocol: "https", hostname: "sapl.al.ro.leg.br" },
      { protocol: "https", hostname: "sapl.al.to.leg.br" },
    ],
  },
};

export default nextConfig;
