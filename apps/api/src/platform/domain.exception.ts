import { HttpException } from "@nestjs/common";
import type { ErrorCode } from "@patio/contracts";

/** Error de dominio con codigo estable. El mensaje que ve el cliente sale de una tabla fija, nunca de aca. */
export class DomainException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    status: number,
  ) {
    super(code, status);
  }
}
