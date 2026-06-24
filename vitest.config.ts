import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // crypto.ts reads PII_SECRET at use-time; give the suite a stable key.
    env: { PII_SECRET: "test-pii-secret-value-do-not-use-in-prod" },
  },
  resolve: {
    alias: {
      // `server-only` is a runtime guard for RSC; stub it out under the test runner.
      "server-only": fileURLToPath(
        new URL("./src/test/server-only-stub.ts", import.meta.url),
      ),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
