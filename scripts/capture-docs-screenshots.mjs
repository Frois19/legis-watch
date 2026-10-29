/**
 * Captura prints atualizados para docs/GUIA-DO-PRODUTO.md
 * Uso: node scripts/capture-docs-screenshots.mjs
 */
import { chromium } from "playwright";
import path from "node:path";
import { mkdir } from "node:fs/promises";

const BASE = process.env.DOCS_SHOT_BASE ?? "http://localhost:3456";
const OUT = path.resolve("docs/screenshots");

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log("saved", file);
}

async function waitReady(page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(500);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  // Esconde o badge flutuante do Next.js Dev Tools nos prints
  await page.addStyleTag({
    content: `
      nextjs-portal, [data-nextjs-toast], #__next-build-watcher,
      button[aria-label="Open Next.js Dev Tools"],
      button[aria-label*="Next.js"] { display: none !important; }
    `,
  });
  page.on("load", async () => {
    await page
      .addStyleTag({
        content: `
      nextjs-portal, [data-nextjs-toast], #__next-build-watcher,
      button[aria-label="Open Next.js Dev Tools"],
      button[aria-label*="Next.js"] { display: none !important; }
    `,
      })
      .catch(() => {});
  });

  // Seed favoritos multi-esfera (v2) antes de qualquer navegação
  await context.addInitScript(() => {
    localStorage.setItem(
      "legis-watch:favorites:v2",
      JSON.stringify([
        {
          key: "camara:204515",
          sphere: "federal_deputado",
          source: "camara",
          externalId: "204515",
          nome: "André Janones",
          siglaPartido: "AVANTE",
          siglaUf: "MG",
          urlFoto:
            "https://www.camara.leg.br/internet/deputado/bandep/204515.jpg",
          href: "/deputados/204515",
        },
        {
          key: "aleac:248",
          sphere: "estadual_deputado",
          source: "aleac",
          externalId: "248",
          nome: "Adailton José",
          siglaPartido: "PSB",
          siglaUf: "AC",
          urlFoto: null,
          href: "/parlamentares/aleac/248",
        },
        {
          key: "senado:5672",
          sphere: "senador",
          source: "senado",
          externalId: "5672",
          nome: "Alan Rick",
          siglaPartido: "REPUBLICANOS",
          siglaUf: "AC",
          urlFoto: null,
          href: "/parlamentares/senado/5672",
        },
      ]),
    );
  });

  // 01 — busca federal com resultados (Janones / legislatura 56)
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await waitReady(page);
  await page.getByRole("button", { name: "Deputados federais", exact: true }).click();
  await page.getByRole("button", { name: /56ª/ }).click();
  await page.getByLabel("Nome").fill("Janones");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page.getByText(/resultado/i).waitFor({ timeout: 15000 });
  await page.waitForTimeout(800);
  await shot(page, "01-busca.png");

  // 07 — busca com esfera visível (home limpa + destaque estadual)
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await waitReady(page);
  await shot(page, "07-busca-esfera.png");

  // resultados estaduais PE (para possível uso / contexto)
  await page
    .getByRole("button", { name: "Deputados estaduais", exact: true })
    .click();
  await page.getByLabel("UF").selectOption("PE");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page.getByText(/resultado/i).waitFor({ timeout: 15000 });
  await page.waitForTimeout(800);
  await shot(page, "07b-busca-estadual-pe.png");

  // 02 — perfil projetos
  await page.goto(`${BASE}/deputados/204515?legislaturaId=56`, {
    waitUntil: "domcontentloaded",
  });
  await waitReady(page);
  await page.getByRole("tab", { name: /Projetos/ }).click();
  await page.waitForTimeout(1000);
  await shot(page, "02-perfil-projetos.png");

  // 03 — votações filtro Não
  await page.getByRole("tab", { name: /Votações/ }).click();
  await page.waitForTimeout(1200);
  const voteFilter = page.getByLabel(/Filtrar por voto/i);
  await voteFilter.selectOption("nao");
  await page.waitForTimeout(600);
  await shot(page, "03-votacoes-filtro.png");

  // 04 — presença faltas + ata (mandato 56)
  await page.getByRole("tab", { name: /Presença/ }).click();
  await page.waitForTimeout(1200);
  await page.getByLabel(/Filtrar presença/i).selectOption("faltas");
  await page.waitForTimeout(600);
  const ataBtn = page
    .getByRole("button", { name: /Ver ata do dia/i })
    .first();
  if (await ataBtn.count()) {
    await ataBtn.click();
    await page
      .getByText(/Carregando pauta/i)
      .waitFor({ state: "hidden", timeout: 60000 })
      .catch(() => {});
    await page
      .getByText(/Votações nominais do dia|Pauta|Não há pauta|sem itens/i)
      .first()
      .waitFor({ timeout: 15000 })
      .catch(() => {});
    await page.waitForTimeout(600);
  }
  await shot(page, "04-presenca-faltas-ata.png");

  // 04b — ata com pauta rica (mandato atual 57 + sessão recente)
  await page.getByLabel("Mandato").selectOption("57");
  await page.waitForTimeout(2000);
  await page.getByRole("tab", { name: /Presença/ }).click();
  await page.waitForTimeout(1500);
  await page.getByLabel(/Filtrar presença/i).selectOption("todos");
  await page.waitForTimeout(400);
  const ataBtn57 = page
    .getByRole("button", { name: /Ver ata do dia/i })
    .first();
  if (await ataBtn57.count()) {
    await ataBtn57.click();
    await page
      .getByText(/Carregando pauta/i)
      .waitFor({ state: "hidden", timeout: 60000 })
      .catch(() => {});
    await page
      .getByText(/REQ |PL |PEC |Pauta|Votações nominais/i)
      .first()
      .waitFor({ timeout: 20000 })
      .catch(() => {});
    await page.waitForTimeout(800);
  }
  const richAta = page.getByText(/Votações nominais do dia|REQ |PL /i).first();
  if (await richAta.count()) {
    await richAta.scrollIntoViewIfNeeded().catch(() => {});
  }
  await shot(page, "04b-presenca-ata-pauta.png");

  // 05 — partido
  await page.getByRole("tab", { name: /Partido/ }).click();
  await page.waitForTimeout(1200);
  await shot(page, "05-partido.png");

  // 06 — favoritos
  await page.goto(`${BASE}/favoritos`, { waitUntil: "domcontentloaded" });
  await waitReady(page);
  await page.waitForTimeout(600);
  await shot(page, "06-favoritos.png");

  // 08/09/10 — perfis estaduais
  await page.goto(`${BASE}/parlamentares/alepe/joao-paulo`, {
    waitUntil: "domcontentloaded",
  });
  await waitReady(page);
  await shot(page, "08-perfil-estadual-pe.png");

  await page.goto(`${BASE}/parlamentares/alesp/gabriela-sao-paulo`, {
    waitUntil: "domcontentloaded",
  });
  await waitReady(page);
  await shot(page, "09-perfil-estadual-sp.png");

  // MG live (ALMG) — pega o primeiro id sincronizado via API
  let almgId = "12193";
  try {
    const almgRes = await page.request.get(
      `${BASE}/api/parlamentares?esfera=estadual_deputado&siglaUf=MG&pageSize=1`,
    );
    const almgJson = await almgRes.json();
    const href = almgJson?.items?.[0]?.href;
    if (typeof href === "string" && href.includes("/")) {
      almgId = href.split("/").pop();
    }
  } catch {
    /* usa fallback */
  }
  await page.goto(`${BASE}/parlamentares/almg/${almgId}`, {
    waitUntil: "domcontentloaded",
  });
  await waitReady(page);
  await page
    .getByRole("tab", { name: /Filiações/ })
    .waitFor({ timeout: 30000 })
    .catch(() => {});
  await page.getByRole("tab", { name: /Filiações/ }).click().catch(() => {});
  await page.waitForTimeout(800);
  await shot(page, "10-perfil-estadual-mg.png");

  // AC live (SAPL) — proposições + filiações
  let acId = "248";
  try {
    const acRes = await page.request.get(
      `${BASE}/api/parlamentares?esfera=estadual_deputado&siglaUf=AC&nome=ADAILTON&pageSize=5`,
    );
    const acJson = await acRes.json();
    const preferred =
      acJson?.items?.find((i) => String(i.href || "").endsWith("/248")) ??
      acJson?.items?.[0];
    const href = preferred?.href;
    if (typeof href === "string" && href.includes("/")) {
      acId = href.split("/").pop();
    }
  } catch {
    /* usa fallback */
  }
  await page.goto(`${BASE}/parlamentares/aleac/${acId}`, {
    waitUntil: "domcontentloaded",
  });
  await waitReady(page);
  await page
    .getByRole("tab", { name: /Proposições/ })
    .waitFor({ timeout: 30000 })
    .catch(() => {});
  await page.getByRole("tab", { name: /Proposições/ }).click().catch(() => {});
  await page.waitForTimeout(1000);
  await shot(page, "15-perfil-estadual-ac-proposicoes.png");

  await page.getByRole("tab", { name: /Filiações/ }).click().catch(() => {});
  await page.waitForTimeout(600);
  await shot(page, "16-perfil-estadual-ac-filiacoes.png");

  // 11 — busca senadores
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await waitReady(page);
  await page.getByRole("button", { name: "Senadores", exact: true }).click();
  await page.getByLabel("UF").selectOption("AC");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page.getByText(/resultado/i).waitFor({ timeout: 15000 });
  await page.waitForTimeout(800);
  await shot(page, "11-busca-senadores.png");

  // 12 — perfil senador (matérias)
  await page.goto(`${BASE}/parlamentares/senado/5672`, {
    waitUntil: "domcontentloaded",
  });
  await waitReady(page);
  await page.getByRole("tab", { name: /Matérias/ }).waitFor({ timeout: 20000 });
  await page.waitForTimeout(800);
  await shot(page, "12-perfil-senador.png");

  // 12b — votações nominais do senador
  await page.getByRole("tab", { name: /Votações/ }).click();
  await page.waitForTimeout(800);
  await shot(page, "12b-perfil-senador-votacoes.png");

  // 13 — filiações do senador
  await page.getByRole("tab", { name: /Filiações/ }).click();
  await page.waitForTimeout(600);
  await shot(page, "13-perfil-senador-filiacoes.png");

  // 14 — cobertura + disclaimer de presença
  await page.getByRole("tab", { name: /Cobertura/ }).click();
  await page.waitForTimeout(600);
  await shot(page, "14-perfil-senador-cobertura.png");

  await browser.close();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
