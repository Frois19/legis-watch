import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="animate-rise mx-auto max-w-md py-16 text-center">
      <h1 className="font-display text-3xl font-semibold text-primary">
        Página não encontrada
      </h1>
      <p className="mt-3 text-muted-foreground">
        O perfil ou a rota que você abriu não existe neste app.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Voltar à busca</Link>
      </Button>
    </div>
  );
}
