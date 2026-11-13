import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException } from "@nestjs/common";
import type { ErrorBody, ErrorCode } from "@patio/contracts";
import type { Request, Response } from "express";
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
  INVALID_TOKEN: "Tu sesion no es valida. Ingresa tu codigo de recuperacion.",
  RECOVERY_CODE_INVALID: "No encontramos ese codigo. Revisalo e intenta de nuevo.",
  DAY_ACCESS_NOT_FOUND: "Primero hay que entrar al patio del dia.",
  DAY_SET_NOT_FOUND: "Ese dia ya no tiene desafios disponibles.",
  CHALLENGE_NOT_IN_SET: "Ese desafio no es parte de este dia.",
  RESULT_DATE_NOT_ALLOWED: "Ese dia ya termino. Podes seguir con el de hoy.",
  RATE_LIMITED: "Hubo demasiados intentos. Proba de nuevo mas tarde.",
};

// El panel habla con adultos y otra pantalla: INVALID_TOKEN no menciona el codigo de recuperacion del player.
const PANEL_MESSAGES: Partial<Record<ErrorCode, string>> = {
  INVALID_TOKEN: "Tu sesion no es valida. Ingresa de nuevo.",
  INVALID_CREDENTIALS: "Correo o contrasena incorrectos.",
  INVALID_REFRESH_TOKEN: "Tu sesion vencio. Ingresa de nuevo.",
  PASSWORD_CHANGE_REQUIRED: "Tenes que cambiar tu contrasena antes de seguir.",
  ACCOUNT_INACTIVE: "Tu cuenta esta desactivada.",
  FORBIDDEN_ROLE: "No tenes permiso para hacer esto.",
  FORBIDDEN_SCOPE: "Eso no pertenece a tus grupos.",
  GROUP_NOT_FOUND: "No encontramos ese grupo.",
  GROUP_FULL: "El grupo no tiene lugar para tantos jugadores.",
  PLAYER_NOT_FOUND: "No encontramos a ese jugador.",
  CHALLENGE_NOT_FOUND: "No encontramos ese desafio, o esta archivado.",
  DAY_SET_NOT_FOUND: "No encontramos ese set del dia.",
  SET_LOCKED: "Ese set ya lo abrieron jugadores y no se puede cambiar.",
  ACCOUNT_NOT_FOUND: "No encontramos esa cuenta.",
  ACCOUNT_EMAIL_TAKEN: "Ya existe una cuenta con ese correo.",
  CANNOT_DELETE_OWN_ACCOUNT: "No podes eliminar ni desactivar tu propia cuenta.",
  CANNOT_DELETE_LAST_ADMINISTRATOR: "No se puede quitar al ultimo administrador activo.",
  CONFIRMATION_REQUIRED: "Falta confirmar la eliminacion (confirm=true).",
  INVITATION_INVALID: "La invitacion no existe, vencio o ya se uso.",
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
    const isPanel = http.getRequest<Request>().originalUrl.startsWith("/v1/panel/");
    const message = (isPanel ? PANEL_MESSAGES[code] : undefined) ?? MESSAGES[code] ?? MESSAGES.INTERNAL_ERROR ?? "";
    const body: ErrorBody = { code, message };
    res.status(status).json(body);
  }
}
