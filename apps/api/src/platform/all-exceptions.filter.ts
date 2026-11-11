import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from "@nestjs/common";
import type { ErrorBody, ErrorCode } from "@patio/contracts";
import type { Response } from "express";
import { DomainException } from "./domain.exception.ts";
import { JsonLogger } from "./json-logger.ts";

// Mensajes fijos: nunca se copia el mensaje de la excepcion (puede traer datos).
const MESSAGES: Partial<Record<ErrorCode, string>> = {
  ROUTE_NOT_FOUND: "La ruta no existe.",
  VALIDATION_FAILED: "El pedido no es valido.",
  INTERNAL_ERROR: "Ocurrio un error inesperado.",
  NICKNAME_NOT_ALLOWED: "Ese apodo no se puede usar. Proba con otro.",
  GROUP_NOT_FOUND: "No encontramos ese grupo. Revisa el codigo.",
  GROUP_INACTIVE: "Ese grupo no esta disponible por ahora.",
  GROUP_FULL: "Ese grupo ya esta completo.",
  RATE_LIMITED: "Hubo demasiados intentos. Proba de nuevo mas tarde.",
};

function statusOf(exception: unknown): number {
  if (exception instanceof HttpException) return exception.getStatus();
  // errores del body parser (JSON malformado, cuerpo grande) traen status 4xx
  const status = typeof exception === "object" && exception !== null && "status" in exception ? exception.status : undefined;
  return typeof status === "number" && status >= 400 && status < 500 ? status : 500;
}

function codeOf(status: number): ErrorCode {
  if (status === 404) return "ROUTE_NOT_FOUND";
  return status < 500 ? "VALIDATION_FAILED" : "INTERNAL_ERROR";
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: JsonLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const status = statusOf(exception);
    const code = exception instanceof DomainException ? exception.code : codeOf(status);
    if (status >= 500) {
      this.logger.log({
        requestId: String(res.getHeader("X-Request-Id")),
        event: "unhandled_exception",
        errorName: exception instanceof Error ? exception.name : "unknown",
      });
    }
    const body: ErrorBody = { code, message: MESSAGES[code] ?? MESSAGES.INTERNAL_ERROR ?? "" };
    res.status(status).json(body);
  }
}
