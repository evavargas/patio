import { Inject, Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service.ts";
import { type AppConfig, CONFIG } from "../platform/config.ts";

export type Limits = AppConfig["limits"];

/**
 * `settings/limits` (doc 04). Hoy el panel los guarda y los muestra, pero el registro, la recuperacion y el login siguen
 * leyendo los de la configuracion (pendiente: leerlos de aca con cache de 1 minuto, ver open-questions).
 */
@Injectable()
export class LimitsService {
  private readonly settings;

  constructor(
    @Inject(CONFIG) private readonly config: Pick<AppConfig, "limits">,
    @Inject(DatabaseService) database: Pick<DatabaseService, "db">,
  ) {
    this.settings = database.db.collection<{ _id: string; limits: Limits }>("settings");
  }

  /** 1 lectura. Sin documento: los de la configuracion. */
  async get(): Promise<Limits> {
    return (await this.settings.findOne({ _id: "limits" }))?.limits ?? this.config.limits;
  }

  /** 1 escritura (upsert). */
  async replace(limits: Limits): Promise<Limits> {
    await this.settings.updateOne({ _id: "limits" }, { $set: { limits } }, { upsert: true });
    return limits;
  }
}
