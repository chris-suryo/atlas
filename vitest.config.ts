import { configDefaults, defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Resolve the `@/…` path alias (tsconfig paths) for runtime value imports in tests.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // tests/e2e/** are Playwright specs (different test API) — keep them out
    // of Vitest's default **/*.spec.ts include.
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
  },
});
