import path from "node:path";

const testDbPath = path.resolve(__dirname, "prisma/test.db");
process.env.DATABASE_URL = `file:${testDbPath}`;
process.env.LEGISLATURA_ATUAL ??= "57";
process.env.NODE_ENV = "test";
delete process.env.SYNC_SECRET;
