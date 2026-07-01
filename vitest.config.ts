import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Resolve the `@/…` path alias (tsconfig paths) for runtime value imports in tests.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
