import { type CanActivate, type ExecutionContext, Inject, Injectable, SetMetadata, createParamDecorator } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AccountRole } from "@patio/contracts";
import type { Request } from "express";
import { DomainException } from "../platform/domain.exception.ts";
import { type AuthenticatedAccount, AccountsService } from "./accounts.service.ts";

const ROLES = "panel:roles";
const ALLOW_PASSWORD_CHANGE = "panel:allow-password-change";

/** Restringe la ruta a estos roles (FORBIDDEN_ROLE). Sin esto basta con estar autenticado. */
export const PanelRoles = (...roles: AccountRole[]): MethodDecorator & ClassDecorator => SetMetadata(ROLES, roles);
/** Marca la unica ruta que se puede usar con `mustChangePassword`. */
export const AllowPasswordChange = (): MethodDecorator & ClassDecorator => SetMetadata(ALLOW_PASSWORD_CHANGE, true);

type PanelRequest = Request & { account?: AuthenticatedAccount };

/**
 * Guard de `/v1/panel`: `Authorization: Bearer <JWT>`. Lee la cuenta en cada pedido (1 lectura).
 * Orden de los errores: INVALID_TOKEN / ACCOUNT_INACTIVE -> PASSWORD_CHANGE_REQUIRED -> FORBIDDEN_ROLE.
 * Es solo autenticacion y rol: el servicio de alcance (grupos) llega despues.
 */
@Injectable()
export class PanelGuard implements CanActivate {
  constructor(
    @Inject(AccountsService) private readonly accounts: AccountsService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<PanelRequest>();
    const account = await this.accounts.authenticate(req.headers.authorization);
    const targets = [context.getHandler(), context.getClass()];
    if (account.mustChangePassword && this.reflector.getAllAndOverride<boolean | undefined>(ALLOW_PASSWORD_CHANGE, targets) !== true) {
      throw new DomainException("PASSWORD_CHANGE_REQUIRED", 403);
    }
    const roles = this.reflector.getAllAndOverride<AccountRole[] | undefined>(ROLES, targets);
    if (roles !== undefined && !roles.includes(account.role)) throw new DomainException("FORBIDDEN_ROLE", 403);
    req.account = account;
    return true;
  }
}

/** La cuenta autenticada por `PanelGuard`. */
export const CurrentAccount = createParamDecorator((_data: unknown, context: ExecutionContext): AuthenticatedAccount => {
  const account = context.switchToHttp().getRequest<PanelRequest>().account;
  if (account === undefined) throw new DomainException("INVALID_TOKEN", 401);
  return account;
});
