import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { AppModule, type AppOptions } from "./app.module.ts";
import { AllExceptionsFilter } from "./platform/all-exceptions.filter.ts";
import { type AppConfig, loadConfig } from "./platform/config.ts";
import { Clock } from "./platform/clock.ts";
import { JsonLogger } from "./platform/json-logger.ts";


const BODY_LIMIT = "16kb";

/** Middleware comun a la app real y a las pruebas. */
export function configureApp(app: NestExpressApplication, config: AppConfig): void {
  const logger = app.get(JsonLogger);
  const clock = app.get(Clock);
  app.disable("x-powered-by");
  // Sin proxies de confianza (0) req.ip es la direccion del socket y X-Forwarded-For se ignora.
  app.set("trust proxy", config.trustProxyHops);
  app.enableCors({
    origin: config.corsOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Authorization", "Content-Type"],
    maxAge: 600,
  });
  app.use((req: Request, res: Response, next: NextFunction) => {
    const startedAt = clock.monotonicMs();
    const requestId = randomUUID();
    res.setHeader("X-Request-Id", requestId);
    // Todo el panel lleva datos de personas o credenciales: ni proxies ni navegador lo guardan.
    if (req.originalUrl.startsWith("/v1/panel/")) res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
    res.on("finish", () => {
      logger.log({
        requestId,
        method: req.method,
        // patron de la ruta, nunca la URL real: puede traer IDs o codigos
        route: req.route ? `${req.baseUrl}${String(req.route.path)}` : "unmatched",
        status: res.statusCode,
        durationMs: Math.round(clock.monotonicMs() - startedAt),
      });
    });
    next();
  });
  app.useBodyParser("json", { limit: BODY_LIMIT });
  app.useGlobalFilters(new AllExceptionsFilter(logger));
}

/** Valida la configuracion ANTES de crear la app. */
export async function createApp(
  env: NodeJS.ProcessEnv,
  overrides: Omit<AppOptions, "config"> = {},
): Promise<{ app: NestExpressApplication; config: AppConfig }> {
  const config = loadConfig(env);
  const app = await NestFactory.create<NestExpressApplication>(AppModule.register({ config, ...overrides }), {
    logger: false,
  });
  configureApp(app, config);
  return { app, config };
}
