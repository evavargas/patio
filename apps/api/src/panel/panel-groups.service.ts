import { Inject, Injectable } from "@nestjs/common";
import { type PanelGroup, type PanelGroupList, isCreateGroupRequest, isUpdateGroupRequest } from "@patio/contracts";
import { AccountsAdminService } from "../accounts/accounts-admin.service.ts";
import type { AuthenticatedAccount } from "../accounts/accounts.service.ts";
import { GroupsService } from "../groups/groups.service.ts";
import { PlayersService } from "../players/players.service.ts";
import { DomainException } from "../platform/domain.exception.ts";
import { toPanelGroup } from "./panel-mappers.ts";

/** Grupos del panel: compone `groups` (alcance, codigos) con `players` (cuantos hay), que `groups` no conoce. */
@Injectable()
export class PanelGroupsService {
  constructor(
    @Inject(GroupsService) private readonly groups: GroupsService,
    @Inject(PlayersService) private readonly players: Pick<PlayersService, "countByGroup">,
    @Inject(AccountsAdminService) private readonly accounts: Pick<AccountsAdminService, "countExisting">,
  ) {}

  /** 3 operaciones: dueños del moderator, grupos, cuentas por grupo. */
  async list(account: AuthenticatedAccount): Promise<PanelGroupList> {
    const scope = await this.groups.scopeFor(account);
    const [docs, counts] = await Promise.all([this.groups.list(scope), this.players.countByGroup(scope.groupIds)]);
    return { items: docs.map((g) => toPanelGroup(g, counts[g._id] ?? 0)) };
  }

  /** Un moderator crea y queda como unico dueño (ignora `ownerIds`); un administrator elige los dueños (por defecto ninguno). */
  async create(account: AuthenticatedAccount, body: unknown): Promise<PanelGroup> {
    if (!isCreateGroupRequest(body)) throw new DomainException("VALIDATION_FAILED", 400);
    const ownerIds = account.role === "moderator" ? [account.accountId] : await this.checkedOwners(body.ownerIds ?? []);
    const group = await this.groups.create({ name: body.name.trim(), ownerIds, ...(body.maxSize === undefined ? {} : { maxSize: body.maxSize }) });
    return toPanelGroup(group, 0);
  }

  async update(account: AuthenticatedAccount, id: string, body: unknown): Promise<PanelGroup> {
    if (!isUpdateGroupRequest(body)) throw new DomainException("VALIDATION_FAILED", 400);
    if (body.ownerIds !== undefined && account.role !== "administrator") throw new DomainException("FORBIDDEN_SCOPE", 403);
    const scope = await this.groups.scopeFor(account);
    const { name, maxSize, active, ownerIds } = body;
    const group = await this.groups.update(scope, id, {
      ...(name === undefined ? {} : { name: name.trim() }),
      ...(maxSize === undefined ? {} : { maxSize }),
      ...(active === undefined ? {} : { active }),
      ...(ownerIds === undefined ? {} : { ownerIds: await this.checkedOwners(ownerIds) }),
    });
    return toPanelGroup(group, (await this.players.countByGroup([id]))[id] ?? 0);
  }

  async regenerateCode(account: AuthenticatedAccount, id: string): Promise<PanelGroup> {
    const group = await this.groups.regenerateCode(await this.groups.scopeFor(account), id);
    return toPanelGroup(group, (await this.players.countByGroup([id]))[id] ?? 0);
  }

  /** Los dueños deben ser cuentas reales y no repetirse. */
  private async checkedOwners(ids: string[]): Promise<string[]> {
    const unique = [...new Set(ids)];
    if (unique.length > 0 && (await this.accounts.countExisting(unique)) !== unique.length) throw new DomainException("ACCOUNT_NOT_FOUND", 404);
    return unique;
  }
}
