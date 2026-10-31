import { AdminSyncPanel } from "@/components/admin-sync-panel";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin · Sync",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2 rounded-xl border border-border bg-card/70 px-5 py-6">
        <h1 className="font-display text-3xl font-semibold text-primary">
          Admin · sincronização
        </h1>
        <p className="text-sm text-muted-foreground">
          Dispara o mesmo fluxo do cron (`bootstrap` federal + listas
          estaduais + senadores). Em produção, defina{" "}
          <code className="text-foreground">SYNC_SECRET</code> e use o
          cabeçalho correspondente. Preferível via CLI:{" "}
          <code className="text-foreground">npm run sync -- cron</code>.
        </p>
      </header>
      <AdminSyncPanel />
    </div>
  );
}
