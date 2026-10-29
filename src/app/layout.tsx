import { SiteHeader } from "@/components/site-header";
import type { Metadata } from "next";
import { IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";

import "./globals.css";

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

const display = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: {
    default: "Legis Watch",
    template: "%s · Legis Watch",
  },
  description:
    "Acompanhe deputados federais: projetos, votações, presença e partido.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${sans.variable} ${display.variable} antialiased`}>
        <a href="#conteudo" className="skip-link">
          Ir para o conteúdo
        </a>
        <SiteHeader />
        <main
          id="conteudo"
          className="mx-auto min-h-[calc(100vh-4.5rem)] max-w-3xl px-4 py-8 sm:px-6"
        >
          {children}
        </main>
      </body>
    </html>
  );
}
