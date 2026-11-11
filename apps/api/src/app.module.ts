import { type DynamicModule, Module } from "@nestjs/common";
import { DatabaseModule } from "./database/database.module.ts";
import { MembershipModule } from "./membership/membership.module.ts";
import { PlayersModule } from "./players/players.module.ts";
import { PlatformModule, type PlatformOptions } from "./platform/platform.module.ts";
import { WordFilterModule } from "./word-filter/word-filter.module.ts";

export interface AppOptions extends PlatformOptions {
  /** false = sin modulos que usan MongoDB (pruebas que no necesitan base). */
  withDatabase?: boolean;
}

@Module({})
export class AppModule {
  static register({ withDatabase = true, ...platform }: AppOptions): DynamicModule {
    return {
      module: AppModule,
      imports: [PlatformModule.register(platform), ...(withDatabase ? [DatabaseModule, WordFilterModule, MembershipModule, PlayersModule] : [])],
    };
  }
}
