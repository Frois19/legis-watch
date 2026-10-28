import Link from "next/link";

export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 720 }}>
      <h1>Legis Watch</h1>
      <p>
        Backend v1 ativo. Consulte a API em <code>/api/health</code> e a
        documentação em <code>docs/backend-api.md</code>.
      </p>
      <ul>
        <li>
          <Link href="/api/health">/api/health</Link>
        </li>
        <li>
          <Link href="/api/deputados?pageSize=5">/api/deputados</Link>
        </li>
      </ul>
    </main>
  );
}
