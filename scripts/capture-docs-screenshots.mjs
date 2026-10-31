/**
 * Captura prints claro + escuro para docs/GUIA-DO-PRODUTO.md
 * Uso: node scripts/capture-docs-screenshots.mjs
 * Requer: npm run dev (porta 3456)
 */
import { chromium } from "playwright";
import path from "node:path";
import { mkdir } from "node:fs/promises";

const BASE = process.env.DOCS_SHOT_BASE ?? "http://localhost:3456";
const OUT = path.resolve("docs/screenshots");

const HIDE_NEXT = `
  nextjs-portal, [data-nextjs-toast], #__next-build-watcher,
  button[aria-label="Open Next.js Dev Tools"],
  button[aria-label*="Next.js"] { display: none !important; }
`;

async function hideChrome(page) {
  await page.addStyleTag({ content: HIDE_NEXT }).catch(() => {});
}

async function waitReady(page) {
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(400);
}

async function applyTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem("legis-watch:theme", t);
    document.documentElement.classList.toggle("dark", t === "dark");
    document.documentElement.style.colorScheme = t;
  }, theme);
  await page.waitForTimeout(180);
}

async function shotBoth(page, baseName) {
  await hideChrome(page);
  await applyTheme(page, "light");
  await page.screenshot({
    path: path.join(OUT, `${baseName}-light.png`),
    fullPage: false,
  });
  console.log("saved", `${baseName}-light.png`);
  await applyTheme(page, "dark");
  await page.screenshot({
    path: path.join(OUT, `${baseName}-dark.png`),
    fullPage: false,
  });
  console.log("saved", `${baseName}-dark.png`);
  await applyTheme(page, "light");
}

async function gotoProfile(page, profilePath) {
  await page.goto(`${BASE}${profilePath}`, {
    waitUntil: "domcontentloaded",
    timeout: 120_000,
  });
  await waitReady(page);
  await hideChrome(page);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: "light",
  });

  await context.addInitScript(() => {
    // Tema padrão dos prints; shotBoth sobrescreve por captura.
    localStorage.setItem("legis-watch:theme", "light");
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

  const page = await context.newPage();
  page.on("load", () => {
    void hideChrome(page);
  });

  // 01 — busca federal
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await waitReady(page);
  await page.getByRole("button", { name: "Deputados federais", exact: true }).click();
  await page.getByRole("button", { name: /56ª/ }).click();
  await page.getByLabel("Nome").fill("Janones");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page.getByText(/resultado/i).waitFor({ timeout: 15000 });
  await page.waitForTimeout(800);
  await shotBoth(page, "01-busca");

  // 07 — home / esfera
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await waitReady(page);
  await shotBoth(page, "07-busca-esfera");

  // 07b — PE
  await page.getByRole("button", { name: "Deputados estaduais", exact: true }).click();
  await page.locator("form select").selectOption("PE");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page.getByText(/resultado/i).waitFor({ timeout: 15000 });
  await page.waitForTimeout(800);
  await shotBoth(page, "07b-busca-estadual-pe");

  // 02 — perfil projetos
  await page.goto(`${BASE}/deputados/204515?legislaturaId=56`, {
    waitUntil: "domcontentloaded",
  });
  await waitReady(page);
  await page.getByRole("tab", { name: /Projetos/ }).click();
  await page.waitForTimeout(1000);
  await shotBoth(page, "02-perfil-projetos");

  // 03 — votações Não
  await page.getByRole("tab", { name: /Votações/ }).click();
  await page.waitForTimeout(1200);
  await page.getByLabel(/Filtrar por voto/i).selectOption("nao");
  await page.waitForTimeout(600);
  await shotBoth(page, "03-votacoes-filtro");

  // 04 — presença + ata
  await page.getByRole("tab", { name: /Presença/ }).click();
  await page.waitForTimeout(1200);
  await page.getByLabel(/Filtrar presença/i).selectOption("faltas");
  await page.waitForTimeout(600);
  const ataBtn = page.getByRole("button", { name: /Ver ata do dia/i }).first();
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
  await shotBoth(page, "04-presenca-faltas-ata");

  // 04b — ata rica (57)
  await page.getByLabel("Mandato").selectOption("57");
  await page.waitForTimeout(2000);
  await page.getByRole("tab", { name: /Presença/ }).click();
  await page.waitForTimeout(1500);
  await page.getByLabel(/Filtrar presença/i).selectOption("todos");
  await page.waitForTimeout(400);
  const ataBtn57 = page.getByRole("button", { name: /Ver ata do dia/i }).first();
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
  await shotBoth(page, "04b-presenca-ata-pauta");

  // 05 — partido
  await page.getByRole("tab", { name: /Partido/ }).click();
  await page.waitForTimeout(1200);
  await shotBoth(page, "05-partido");

  // 06 — favoritos
  await page.goto(`${BASE}/favoritos`, { waitUntil: "domcontentloaded" });
  await waitReady(page);
  await page.waitForTimeout(600);
  await shotBoth(page, "06-favoritos");

  // 08 — PE
  await gotoProfile(page, "/parlamentares/alepe/joao-paulo");
  await page.getByRole("tab", { name: /Proposições/ }).waitFor({ timeout: 30000 }).catch(() => {});
  await page.getByRole("tab", { name: /Proposições/ }).click().catch(() => {});
  await page.waitForTimeout(800);
  await shotBoth(page, "08-perfil-estadual-pe");

  // 09 — SP
  let alespId = "1139";
  try {
    const spRes = await page.request.get(
      `${BASE}/api/parlamentares?esfera=estadual_deputado&siglaUf=SP&pageSize=1`,
    );
    const spJson = await spRes.json();
    const href = spJson?.items?.[0]?.href;
    if (typeof href === "string" && href.includes("/")) {
      alespId = href.split("/").pop();
    }
  } catch {
    /* fallback */
  }
  await gotoProfile(page, `/parlamentares/alesp/${alespId}`);
  await page.getByRole("tab", { name: /Proposições/ }).waitFor({ timeout: 120000 }).catch(() => {});
  await page.getByRole("tab", { name: /Proposições/ }).click().catch(() => {});
  await page.waitForTimeout(1000);
  await shotBoth(page, "09-perfil-estadual-sp");

  // 10 — MG
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
    /* fallback */
  }
  await gotoProfile(page, `/parlamentares/almg/${almgId}`);
  await page.getByRole("tab", { name: /Proposições/ }).waitFor({ timeout: 60000 }).catch(() => {});
  await page.getByRole("tab", { name: /Proposições/ }).click().catch(() => {});
  await page.waitForTimeout(1000);
  await shotBoth(page, "10-perfil-estadual-mg");

  // 15/16 — AC
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
    /* fallback */
  }
  await gotoProfile(page, `/parlamentares/aleac/${acId}`);
  await page.getByRole("tab", { name: /Proposições/ }).waitFor({ timeout: 30000 }).catch(() => {});
  await page.getByRole("tab", { name: /Proposições/ }).click().catch(() => {});
  await page.waitForTimeout(1000);
  await shotBoth(page, "15-perfil-estadual-ac-proposicoes");

  await page.getByRole("tab", { name: /Filiações/ }).click().catch(() => {});
  await page.waitForTimeout(600);
  await shotBoth(page, "16-perfil-estadual-ac-filiacoes");

  // 17/18/17b — PR proposições, presença, votos
  let alepId = "7000394";
  try {
    const prRes = await page.request.get(
      `${BASE}/api/parlamentares?esfera=estadual_deputado&siglaUf=PR&nome=ADEMAR&pageSize=5`,
    );
    const prJson = await prRes.json();
    const preferred =
      prJson?.items?.find((i) => String(i.href || "").includes("7000394")) ??
      prJson?.items?.[0];
    const href = preferred?.href;
    if (typeof href === "string" && href.includes("/")) {
      alepId = href.split("/").pop();
    }
  } catch {
    /* fallback */
  }
  await gotoProfile(page, `/parlamentares/alep/${alepId}`);
  await page.getByRole("tab", { name: /Proposições/ }).waitFor({ timeout: 90000 }).catch(() => {});
  await page.getByRole("tab", { name: /Proposições/ }).click().catch(() => {});
  await page.waitForTimeout(1000);
  await shotBoth(page, "17-perfil-estadual-pr");

  await page.getByRole("tab", { name: /Presença/ }).click().catch(() => {});
  await page.waitForTimeout(800);
  await page.getByText(/Sessões/i).first().waitFor({ timeout: 15000 }).catch(() => {});
  await shotBoth(page, "18-perfil-estadual-pr-presenca");

  await page.getByRole("tab", { name: /Vota/i }).click().catch(() => {});
  await page.waitForTimeout(800);
  await shotBoth(page, "17b-perfil-estadual-pr-votacoes");

  // 07c — busca PR
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await waitReady(page);
  await page.getByRole("button", { name: "Deputados estaduais", exact: true }).click();
  await page.locator("form select").selectOption("PR");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page.getByText(/resultado/i).waitFor({ timeout: 15000 });
  await page.waitForTimeout(800);
  await shotBoth(page, "07c-busca-estadual-pr");

  // 19 — fixture banner (RJ)
  let fixtureId = "1";
  try {
    const rjRes = await page.request.get(
      `${BASE}/api/parlamentares?esfera=estadual_deputado&siglaUf=RJ&pageSize=1`,
    );
    const rjJson = await rjRes.json();
    const href = rjJson?.items?.[0]?.href;
    if (typeof href === "string" && href.includes("/")) {
      fixtureId = href.split("/").pop();
      const source = href.split("/")[2] || "alerj";
      await gotoProfile(page, `/parlamentares/${source}/${fixtureId}`);
    } else {
      await gotoProfile(page, "/parlamentares/alerj/1");
    }
  } catch {
    await gotoProfile(page, "/parlamentares/alerj/1");
  }
  await page.getByText(/demonstração|Fixture/i).first().waitFor({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(600);
  await shotBoth(page, "19-perfil-fixture-banner");

  // 11 — senadores AC
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await waitReady(page);
  await page.getByRole("button", { name: "Senadores", exact: true }).click();
  await page.locator("form select").selectOption("AC");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await page.getByText(/resultado/i).waitFor({ timeout: 15000 });
  await page.waitForTimeout(800);
  await shotBoth(page, "11-busca-senadores");

  // 12–14 — senador
  await gotoProfile(page, "/parlamentares/senado/5672");
  await page.getByRole("tab", { name: /Matérias/ }).waitFor({ timeout: 20000 });
  await page.waitForTimeout(800);
  await shotBoth(page, "12-perfil-senador");

  await page.getByRole("tab", { name: /Votações/ }).click();
  await page.waitForTimeout(800);
  await shotBoth(page, "12b-perfil-senador-votacoes");

  await page.getByRole("tab", { name: /Filiações/ }).click();
  await page.waitForTimeout(600);
  await shotBoth(page, "13-perfil-senador-filiacoes");

  await page.getByRole("tab", { name: /Cobertura/ }).click();
  await page.waitForTimeout(600);
  await shotBoth(page, "14-perfil-senador-cobertura");

  await browser.close();
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
