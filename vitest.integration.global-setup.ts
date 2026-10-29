import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export default async function globalSetup() {
  const testDbPath = path.resolve(__dirname, "prisma/test.db");
  const testDbJournal = `${testDbPath}-journal`;

  process.env.DATABASE_URL = `file:${testDbPath}`;
  process.env.LEGISLATURA_ATUAL = "57";
  process.env.NODE_ENV = "test";
  delete process.env.SYNC_SECRET;

  for (const file of [testDbPath, testDbJournal]) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }

  execSync("npx prisma db push --skip-generate", {
    cwd: __dirname,
    env: process.env,
    stdio: "inherit",
  });
}
