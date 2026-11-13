import { defineConfig } from "vitest/config";

// Las pruebas de integracion comparten un Mongo local y las de argon2 consumen CPU: con el limite
// por defecto de 5 s y todos los nucleos en paralelo aparecian timeouts intermitentes.
export default defineConfig({
  test: { include: ["src/**/*.test.ts"], testTimeout: 30_000, hookTimeout: 30_000, maxWorkers: 4 },
});
