import { SiteHeader } from "@/components/site-header";
import { themeInitScript } from "@/lib/theme";
import type { Metadata } from "next";
import { Manrope, Source_Serif_4 } from "next/font/google";

import "./globals.css";

const sans = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
    "Acompanhe deputados federais, estaduais e senadores: projetos, votações e presença.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${sans.variable} ${display.variable} antialiased`}>
        <a href="#conteudo" className="skip-link">
          Ir para o conteúdo
        </a>
        <SiteHeader />
        <main
          id="conteudo"
          className="page-enter mx-auto min-h-[calc(100vh-4.5rem)] max-w-4xl px-4 py-8 sm:px-6"
        >
          {children}
        </main>
      </body>
    </html>
  );
}
