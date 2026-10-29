import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.{test,spec}.ts"],
    exclude: ["src/**/*.integration.test.ts", "node_modules"],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/lib/**/*.ts", "src/app/api/**/*.ts"],
      exclude: [
        "src/lib/**/*.test.ts",
        "src/lib/**/*.spec.ts",
        "src/app/api/**/*.test.ts",
        "src/lib/api/types.ts",
        "src/lib/camara/types.ts",
        "src/lib/api/client.ts",
        "src/lib/sync/index.ts",
        "src/lib/db/prisma.ts",
        // Camada de I/O HTTP/bulk: coberta por sync manual/integração, não por unitário.
        "src/lib/camara/client.ts",
        "src/lib/sync/votes.ts",
        "src/lib/sync/attendance.ts",
        "src/lib/sync/deputies.ts",
        "src/lib/sync/propositions.ts",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
