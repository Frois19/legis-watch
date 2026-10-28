"use client";

import { useFavorites } from "@/hooks/use-favorites";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const { favorites, hydrated } = useFavorites();

  const links = [
    { href: "/", label: "Buscar" },
    {
      href: "/favoritos",
      label: hydrated ? `Favoritos (${favorites.length})` : "Favoritos",
    },
  ];

  return (
    <header className="border-b border-border/70 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link href="/" className="group">
          <p className="font-display text-2xl font-semibold tracking-tight text-primary transition-colors group-hover:text-accent">
            Legis Watch
          </p>
          <p className="text-xs text-muted-foreground">
            Acompanhe seus deputados
          </p>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
