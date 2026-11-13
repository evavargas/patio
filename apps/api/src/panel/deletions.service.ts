import { Inject, Injectable } from "@nestjs/common";
import type { DeletionImpact } from "@patio/contracts";
import { AccountsAdminService } from "../accounts/accounts-admin.service.ts";
import { ChallengesService } from "../challenges/challenges.service.ts";
import { DaySetsService } from "../day-sets/day-sets.service.ts";
import { GroupsService } from "../groups/groups.service.ts";
import { MembershipService } from "../membership/membership.service.ts";
import { PlayersService } from "../players/players.service.ts";
import { JsonLogger } from "../platform/json-logger.ts";
import { ResultsService } from "../results/results.service.ts";

/**
 * Eliminaciones definitivas (solo administrator; lo exige el controlador). Cada una: "impacto" (cuantos datos afecta, para el
 * dialogo de confirmacion) y "borrar". El orden de borrado siempre corta primero lo que da acceso (cuenta, token, codigo) y
 * limpia despues; repetir el DELETE completa una limpieza interrumpida. Una linea de log: quien (cuenta), que (tipo e id), cuando.
 * Sin datos personales: nunca apodos ni correos.
 */
@Injectable()
export class DeletionsService {
  constructor(
    @Inject(JsonLogger) private readonly logger: JsonLogger,
    @Inject(GroupsService) private readonly groups: GroupsService,
    @Inject(PlayersService) private readonly players: PlayersService,
    @Inject(MembershipService) private readonly membership: MembershipService,
    @Inject(ResultsService) private readonly results: ResultsService,
    @Inject(DaySetsService) private readonly daySets: DaySetsService,
    @Inject(ChallengesService) private readonly challenges: ChallengesService,
    @Inject(AccountsAdminService) private readonly accounts: AccountsAdminService,
  ) {}

  async groupImpact(id: string): Promise<DeletionImpact> {
    await this.groups.get(await this.adminScope(), id);
    return { counts: { players: (await this.players.countByGroup([id]))[id] ?? 0, daySets: await this.daySets.countSetsByGroup(id) } };
  }

  /** Grupo primero (el codigo muere), despues players sin grupo, despues sets. Repetible. */
  async deleteGroup(actorId: string, id: string): Promise<void> {
    await this.groups.delete(id);
    await this.membership.releaseGroup(id);
    await this.daySets.deleteByGroup(id);
    this.log(actorId, "group", id);
  }

  async playerImpact(id: string): Promise<DeletionImpact> {
    await this.players.getForPanel(id);
    return { counts: { results: await this.results.countByPlayer(id), daysEntered: await this.daySets.countAccessByPlayer(id), membershipRows: await this.membership.countRows(id) } };
  }

  /** Player primero (token y codigo mueren), despues logros, accesos y pertenencia. Idempotente. */
  async deletePlayer(actorId: string, id: string): Promise<void> {
    await this.players.delete(id);
    await this.results.deleteByPlayer(id);
    await this.daySets.deleteAccessByPlayer(id);
    await this.membership.deleteRows(id);
    this.log(actorId, "player", id);
  }

  async daySetImpact(id: string): Promise<DeletionImpact> {
    const scope = await this.adminScope();
    await this.daySets.get(scope, id);
    return { counts: { playersWhoOpened: await this.daySets.countAccess(id) } };
  }

  /** Los logros ya guardados se conservan. */
  async deleteDaySet(actorId: string, id: string): Promise<void> {
    await this.daySets.deleteSet(id);
    this.log(actorId, "daySet", id);
  }

  async accountImpact(id: string): Promise<DeletionImpact> {
    await this.accounts.get(id);
    return { counts: { groupsOwned: await this.groups.countOwnedBy(id), challengesAuthored: await this.challenges.countByAuthor(id) } };
  }

  /**
   * Cuenta y sesiones (en `accounts`), despues se la quita de `ownerIds`. Sus desafios y sets se conservan: el autor ya no existe,
   * asi que solo el administrator los edita.
   */
  async deleteAccount(actorId: string, id: string): Promise<void> {
    await this.accounts.delete(actorId, id);
    await this.groups.removeOwner(id);
    this.log(actorId, "account", id);
  }

  private adminScope(): ReturnType<GroupsService["scopeFor"]> {
    return this.groups.scopeFor({ accountId: "", role: "administrator" });
  }

  private log(actorId: string, kind: string, targetId: string): void {
    this.logger.log({ event: "deletion", by: actorId, kind, targetId });
  }
}
