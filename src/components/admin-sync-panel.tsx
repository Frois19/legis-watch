"use client";

import { useState } from "react";

type SyncResult = {
  ok?: boolean;
  domain?: string;
  result?: unknown;
  error?: string;
  searchCacheCleared?: number;
};

export function AdminSyncPanel() {
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string | null>(null);

  async function run(domain: "cron" | "bootstrap" | "estadual" | "senadores") {
    setBusy(true);
    setLog(null);
    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
      };
      if (secret.trim()) headers["x-sync-secret"] = secret.trim();
      const res = await fetch("/api/sync", {
        method: "POST",
        headers,
        body: JSON.stringify(
          domain === "estadual"
            ? { domain, source: "all" }
            : { domain },
        ),
      });
      const body = (await res.json()) as SyncResult;
      if (!res.ok) {
        setLog(
          `Erro ${res.status}: ${body.error ?? JSON.stringify(body)}`,
        );
        return;
      }
      setLog(JSON.stringify(body, null, 2));
    } catch (error) {
      setLog(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card/80 p-4 sm:p-5">
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-foreground">SYNC_SECRET</span>
        <input
          type="password"
          autoComplete="off"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="obrigatório se a API exigir"
          className="w-full border border-border bg-background px-3 py-2"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["cron", "Rodar cron completo"],
            ["bootstrap", "Só federal (partidos + deputados)"],
            ["estadual", "Só listas estaduais"],
            ["senadores", "Só senadores"],
          ] as const
        ).map(([domain, label]) => (
          <button
            key={domain}
            type="button"
            disabled={busy}
            onClick={() => void run(domain)}
            className="border border-primary bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Sincronizando…" : label}
          </button>
        ))}
      </div>

      {log ? (
        <pre className="max-h-96 overflow-auto border border-border bg-background p-3 text-xs text-muted-foreground">
          {log}
        </pre>
      ) : null}
    </section>
  );
}
