import { Controller, Get, Module, UseGuards } from "@nestjs/common";
import { AccountsModule } from "./accounts.module.ts";
import { PanelGuard, PanelRoles } from "./panel.guard.ts";

/** SOLO pruebas: rutas minimas para probar el guard de rol. No se compila ni se registra en la app real. */
@Controller("v1/panel/probe")
@UseGuards(PanelGuard)
export class PanelProbeController {
  @Get("any")
  any(): { ok: true } {
    return { ok: true };
  }

  @Get("administrator")
  @PanelRoles("administrator")
  administrator(): { ok: true } {
    return { ok: true };
  }

  @Get("moderator")
  @PanelRoles("moderator")
  moderator(): { ok: true } {
    return { ok: true };
  }
}

@Module({ imports: [AccountsModule], controllers: [PanelProbeController] })
export class PanelProbeModule {}
