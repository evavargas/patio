import { Body, Controller, Get, Inject, Put, UseGuards } from "@nestjs/common";
import { type PanelBannedWords, type PanelLimits, type PanelRules, isPanelLimits, isPanelRules, isUpdateBannedWordsRequest } from "@patio/contracts";
import { PanelGuard, PanelRoles } from "../accounts/panel.guard.ts";
import { DomainException } from "../platform/domain.exception.ts";
import { LimitsService } from "../rate-limit/limits.service.ts";
import { RulesService } from "../rules/rules.service.ts";
import { BannedWordsService } from "../word-filter/banned-words.service.ts";

/** Reglas (ambos roles ven, administrator edita), limites por IP y palabras prohibidas (solo administrator). */
@Controller("v1/panel")
@UseGuards(PanelGuard)
export class SettingsPanelController {
  constructor(
    @Inject(RulesService) private readonly rules: RulesService,
    @Inject(LimitsService) private readonly limits: LimitsService,
    @Inject(BannedWordsService) private readonly bannedWords: BannedWordsService,
  ) {}

  @Get("rules")
  rulesGet(): Promise<PanelRules> {
    return this.rules.get();
  }

  @Put("rules")
  @PanelRoles("administrator")
  rulesPut(@Body() body: unknown): Promise<PanelRules> {
    if (!isPanelRules(body)) throw new DomainException("VALIDATION_FAILED", 400);
    const pointsByDifficulty: Record<string, number> = {};
    for (const [difficulty, points] of Object.entries(body.pointsByDifficulty)) if (points !== undefined) pointsByDifficulty[difficulty] = points;
    return this.rules.replace({ ...body, pointsByDifficulty });
  }

  @Get("limits")
  @PanelRoles("administrator")
  limitsGet(): Promise<PanelLimits> {
    return this.limits.get();
  }

  @Put("limits")
  @PanelRoles("administrator")
  limitsPut(@Body() body: unknown): Promise<PanelLimits> {
    if (!isPanelLimits(body)) throw new DomainException("VALIDATION_FAILED", 400);
    return this.limits.replace(body);
  }

  @Get("banned-words")
  @PanelRoles("administrator")
  bannedWordsGet(): Promise<PanelBannedWords> {
    return this.bannedWords.get();
  }

  /** Reemplaza la lista; cada cambio sube la version. */
  @Put("banned-words")
  @PanelRoles("administrator")
  bannedWordsPut(@Body() body: unknown): Promise<PanelBannedWords> {
    if (!isUpdateBannedWordsRequest(body)) throw new DomainException("VALIDATION_FAILED", 400);
    return this.bannedWords.replace(body.words);
  }
}
