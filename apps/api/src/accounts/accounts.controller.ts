import { Body, Controller, Get, Header, HttpCode, Inject, Post, Req, UseGuards } from "@nestjs/common";
import type { PanelAccount, PanelSession } from "@patio/contracts";
import type { Request } from "express";
import { AccountsAdminService } from "./accounts-admin.service.ts";
import { type AuthenticatedAccount, AccountsService } from "./accounts.service.ts";
import { AllowPasswordChange, CurrentAccount, PanelGuard } from "./panel.guard.ts";

// Todas llevan tokens o datos de la cuenta: ni proxies ni navegador las guardan.
const NO_STORE = "private, no-store";

/** Superficie `/v1/panel/auth`. Formas propias del panel (account.schema.json), nunca las de `/v1`. */
@Controller("v1/panel/auth")
export class AccountsController {
  constructor(
    @Inject(AccountsService) private readonly service: AccountsService,
    @Inject(AccountsAdminService) private readonly admin: AccountsAdminService,
  ) {}

  /** Publico, con limite por IP y correo. */
  @Post("login")
  @HttpCode(200)
  @Header("Cache-Control", NO_STORE)
  login(@Body() body: unknown, @Req() req: Request): Promise<PanelSession> {
    return this.service.login(req.ip ?? "unknown", body);
  }

  /** Publico, con limite por IP. Crea el moderator activo; despues entra por `login`. */
  @Post("accept-invitation")
  @HttpCode(204)
  @Header("Cache-Control", NO_STORE)
  async acceptInvitation(@Body() body: unknown, @Req() req: Request): Promise<void> {
    await this.admin.acceptInvitation(req.ip ?? "unknown", body);
  }

  /** Publico: el refresh token es la credencial. */
  @Post("refresh")
  @HttpCode(200)
  @Header("Cache-Control", NO_STORE)
  refresh(@Body() body: unknown): Promise<PanelSession> {
    return this.service.refresh(body);
  }

  /** Publico e idempotente. */
  @Post("logout")
  @HttpCode(204)
  @Header("Cache-Control", NO_STORE)
  logout(@Body() body: unknown): Promise<void> {
    return this.service.logout(body);
  }

  /** Unica ruta permitida con `mustChangePassword`. */
  @Post("change-password")
  @HttpCode(200)
  @Header("Cache-Control", NO_STORE)
  @UseGuards(PanelGuard)
  @AllowPasswordChange()
  changePassword(@CurrentAccount() account: AuthenticatedAccount, @Body() body: unknown): Promise<PanelSession> {
    return this.service.changePassword(account, body);
  }

  /** Cuenta autenticada. Tambien sirve para probar el guard. */
  @Get("me")
  @Header("Cache-Control", NO_STORE)
  @UseGuards(PanelGuard)
  me(@CurrentAccount() account: AuthenticatedAccount): PanelAccount {
    return this.service.me(account);
  }
}
