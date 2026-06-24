import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // crypto.ts / otp.ts read these at use-time; give the suite stable values.
    env: {
      PII_SECRET: "test-pii-secret-value-do-not-use-in-prod",
      AUTH_SECRET: "test-auth-secret-value-at-least-32-chars-long",
    },
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
