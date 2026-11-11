import "reflect-metadata";
import { createApp } from "./app.ts";

try {
  const { app, config } = await createApp(process.env);
  app.enableShutdownHooks(); // SIGTERM de Cloud Run y Ctrl+C: cierra el pool de Mongo
  await app.listen(config.port, "0.0.0.0");
} catch (error) {
  // solo el nombre y el mensaje de configuracion (nombra variables, no valores)
  process.stderr.write(`${JSON.stringify({ event: "startup_failed", error: error instanceof Error ? error.message : "unknown" })}\n`);
  process.exit(1);
}
