import { Body, Controller, Get, HttpCode, Inject, Param, Post, Put, Query, UseGuards } from "@nestjs/common";
import type { PanelChallenge, PanelChallengeList } from "@patio/contracts";
import { type AuthenticatedAccount } from "../accounts/accounts.service.ts";
import { CurrentAccount, PanelGuard } from "../accounts/panel.guard.ts";
import { ChallengesService } from "../challenges/challenges.service.ts";
import { DomainException } from "../platform/domain.exception.ts";
import { toPanelChallenge } from "./panel-mappers.ts";
import { type Query as Q, int, page, text } from "./panel-query.ts";

/** `/v1/panel/challenges`: biblioteca comun (la ven ambos roles). Editar y archivar: autor y administrator. */
@Controller("v1/panel/challenges")
@UseGuards(PanelGuard)
export class ChallengesPanelController {
  constructor(@Inject(ChallengesService) private readonly challenges: ChallengesService) {}

  /** Filtros: `status`, `mechanic`, `difficulty`, `family`, `mine=true`, `cursor`, `limit`. */
  @Get()
  async list(@CurrentAccount() account: AuthenticatedAccount, @Query() query: Q): Promise<PanelChallengeList> {
    const status = text(query, "status");
    if (status !== undefined && status !== "active" && status !== "archived") throw new DomainException("VALIDATION_FAILED", 400);
    const { cursor, limit } = page(query);
    const mechanic = text(query, "mechanic");
    const family = text(query, "family");
    const difficulty = int(query, "difficulty", 1, 100);
    const result = await this.challenges.list(
      {
        ...(status === undefined ? {} : { status }),
        ...(mechanic === undefined ? {} : { mechanic }),
        ...(family === undefined ? {} : { family }),
        ...(difficulty === undefined ? {} : { difficulty }),
        ...(text(query, "mine") === "true" ? { authorId: account.accountId } : {}),
      },
      cursor,
      limit,
    );
    return { items: result.items.map(toPanelChallenge), nextCursor: result.nextCursor };
  }

  @Get(":id")
  async get(@Param("id") id: string): Promise<PanelChallenge> {
    return toPanelChallenge(await this.challenges.get(id));
  }

  @Post()
  async create(@CurrentAccount() account: AuthenticatedAccount, @Body() body: unknown): Promise<PanelChallenge> {
    return toPanelChallenge(await this.challenges.create(account.accountId, body));
  }

  @Put(":id")
  async update(@CurrentAccount() account: AuthenticatedAccount, @Param("id") id: string, @Body() body: unknown): Promise<PanelChallenge> {
    return toPanelChallenge(await this.challenges.update(account, id, body));
  }

  @Post(":id/duplicate")
  async duplicate(@CurrentAccount() account: AuthenticatedAccount, @Param("id") id: string): Promise<PanelChallenge> {
    return toPanelChallenge(await this.challenges.duplicate(account, id));
  }

  @Post(":id/archive")
  @HttpCode(200)
  async archive(@CurrentAccount() account: AuthenticatedAccount, @Param("id") id: string): Promise<PanelChallenge> {
    return toPanelChallenge(await this.challenges.archive(account, id));
  }
}
