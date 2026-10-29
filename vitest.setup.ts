process.env.LEGISLATURA_ATUAL ??= "57";
process.env.DATABASE_URL ??= "file:./dev.db";
// Evita que stubs de fetch nos testes poluam `.cache/parliament`.
process.env.HTTP_CACHE_DISK ??= "0";
