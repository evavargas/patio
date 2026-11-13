import { Module } from "@nestjs/common";
import { AccountsModule } from "../accounts/accounts.module.ts";
import { ChallengesModule } from "../challenges/challenges.module.ts";
import { DaySetsModule } from "../day-sets/day-sets.module.ts";
import { GroupsModule } from "../groups/groups.module.ts";
import { MembershipModule } from "../membership/membership.module.ts";
import { PlayersModule } from "../players/players.module.ts";
import { RateLimitModule } from "../rate-limit/rate-limit.module.ts";
import { ResultsModule } from "../results/results.module.ts";
import { RulesModule } from "../rules/rules.module.ts";
import { StatsModule } from "../stats/stats.module.ts";
import { WordFilterModule } from "../word-filter/word-filter.module.ts";
import { AccountsPanelController } from "./accounts.panel.controller.ts";
import { ChallengesPanelController } from "./challenges.panel.controller.ts";
import { DaySetsPanelController } from "./day-sets.panel.controller.ts";
import { DeletionsService } from "./deletions.service.ts";
import { GroupsPanelController } from "./groups.panel.controller.ts";
import { PanelGroupsService } from "./panel-groups.service.ts";
import { PlayersPanelController } from "./players.panel.controller.ts";
import { SettingsPanelController } from "./settings.panel.controller.ts";
import { StatsPanelController } from "./stats.panel.controller.ts";

/** Superficie HTTP `/v1/panel/*` (menos `auth`, que vive en `accounts`). Controladores delgados: validan, piden el alcance y llaman a los servicios de cada modulo. */
@Module({
  imports: [AccountsModule, GroupsModule, PlayersModule, MembershipModule, ChallengesModule, DaySetsModule, ResultsModule, RulesModule, RateLimitModule, WordFilterModule, StatsModule],
  controllers: [GroupsPanelController, PlayersPanelController, ChallengesPanelController, DaySetsPanelController, SettingsPanelController, AccountsPanelController, StatsPanelController],
  providers: [PanelGroupsService, DeletionsService],
})
export class PanelModule {}
