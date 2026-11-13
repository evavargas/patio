import { defineConfig } from "vitest/config";

// ESLint tarda en arrancar en frio; con el limite por defecto de 5 s fallaba bajo carga.
export default defineConfig({
  test: { testTimeout: 30_000, hookTimeout: 30_000 },
});
