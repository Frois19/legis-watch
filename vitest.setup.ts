process.env.LEGISLATURA_ATUAL ??= "57";
process.env.DATABASE_URL ??= "file:./dev.db";
// Evita que stubs de fetch nos testes poluam `.cache/parliament`.
process.env.HTTP_CACHE_DISK ??= "0";
// Retry deixa testes de falha de rede lentos; o caso de retry é coberto à parte.
process.env.HTTP_CACHE_MAX_RETRIES ??= "1";
process.env.HTTP_CACHE_RETRY_BASE_MS ??= "1";
