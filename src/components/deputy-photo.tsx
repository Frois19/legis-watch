"use client";

import { resolveDeputyPhotoUrl } from "@/lib/camara/photo";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";

type Size = "sm" | "md" | "lg";

const sizeClass: Record<Size, string> = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-20 w-20 sm:h-24 sm:w-24",
};

const sizePx: Record<Size, number> = {
  sm: 36,
  md: 44,
  lg: 96,
};

export function DeputyPhoto({
  id,
  name,
  urlFoto,
  size = "md",
  priority = false,
  className,
}: {
  id: number;
  name: string;
  urlFoto?: string | null;
  size?: Size;
  priority?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = resolveDeputyPhotoUrl(id, urlFoto);
  const initial = name.trim().slice(0, 1).toUpperCase() || "?";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full bg-muted",
        sizeClass[size],
        className,
      )}
    >
      {failed ? (
        <span
          className="flex h-full w-full items-center justify-center text-muted-foreground"
          aria-hidden="true"
          style={{ fontSize: size === "lg" ? "1.25rem" : "0.75rem" }}
        >
          {initial}
        </span>
      ) : (
        <Image
          src={src}
          alt={`Foto de ${name}`}
          fill
          className="object-cover"
          sizes={`${sizePx[size]}px`}
          priority={priority}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
