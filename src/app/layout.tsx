import { SiteHeader } from "@/components/site-header";
import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Legis Watch",
  description:
    "Pesquise, favoritize e acompanhe deputados federais: presença, projetos, votações e partido.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${manrope.variable} ${fraunces.variable} site-backdrop antialiased`}
      >
        <SiteHeader />
        <div className="mx-auto min-h-[calc(100vh-5rem)] max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
          {children}
        </div>
      </body>
    </html>
  );
}
