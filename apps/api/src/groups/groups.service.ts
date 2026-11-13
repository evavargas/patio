import { Inject, Injectable } from "@nestjs/common";
import type { AccountRole } from "@patio/contracts";
import { randomUUID } from "node:crypto";
import { generateGroupCode } from "../auth/credentials.ts";
import { Clock } from "../platform/clock.ts";
import { DomainException } from "../platform/domain.exception.ts";
import { GroupScope } from "./group-scope.ts";
import { type GroupDoc, GroupsRepository } from "./groups.repository.ts";

export type GroupSummary = Pick<GroupDoc, "_id" | "active" | "maxSize">;

/** Quien pide, tal como lo deja el guard del panel. */
export interface ScopeSubject {
  accountId: string;
  role: AccountRole;
}

const MAX_CODE_ATTEMPTS = 5;
const DEFAULT_MAX_SIZE = 50;

@Injectable()
export class GroupsService {
  constructor(
    @Inject(Clock) private readonly clock: Clock,
    @Inject(GroupsRepository) private readonly repository: GroupsRepository,
  ) {}

  /** Para validar el codigo en el registro (`/v1`). */
  async findByCode(code: string): Promise<GroupSummary | null> {
    const group = await this.repository.findByCode(code);
    return group === null ? null : { _id: group._id, active: group.active, maxSize: group.maxSize };
  }

  /** EL servicio de alcance. administrator: todo, sin leer la base. moderator: sus grupos (1 lectura). */
  async scopeFor(subject: ScopeSubject): Promise<GroupScope> {
    return subject.role === "administrator" ? new GroupScope(null) : new GroupScope(await this.repository.idsOwnedBy(subject.accountId));
  }

  /** 1 lectura. */
  list(scope: GroupScope): Promise<GroupDoc[]> {
    return this.repository.list(scope.filter("_id"));
  }

  /** FORBIDDEN_SCOPE si la cuenta no puede tocar el grupo (sin leer la base); GROUP_NOT_FOUND si no existe. 1 lectura. */
  async get(scope: GroupScope, id: string): Promise<GroupDoc> {
    if (!scope.allows(id)) throw new DomainException("FORBIDDEN_SCOPE", 403);
    const group = await this.repository.findById(id);
    if (group === null) throw new DomainException("GROUP_NOT_FOUND", 404);
    return group;
  }

  /** 1 escritura (mas reintentos si el codigo choca, raro: 31^6 combinaciones). */
  async create(input: { name: string; maxSize?: number; ownerIds: string[] }): Promise<GroupDoc> {
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const doc: GroupDoc = { _id: randomUUID(), name: input.name, code: generateGroupCode(), ownerIds: input.ownerIds, maxSize: input.maxSize ?? DEFAULT_MAX_SIZE, active: true, createdAt: this.clock.now() };
      if (await this.repository.insert(doc)) return doc;
    }
    throw new Error("no se pudo generar un codigo de grupo libre");
  }

  /** 1 escritura. */
  async update(scope: GroupScope, id: string, patch: Partial<Pick<GroupDoc, "name" | "maxSize" | "active" | "ownerIds">>): Promise<GroupDoc> {
    await this.get(scope, id);
    const updated = await this.repository.update(id, patch);
    if (updated === null) throw new DomainException("GROUP_NOT_FOUND", 404);
    return updated;
  }

  /** El codigo viejo deja de funcionar al instante. 1 lectura + 1 escritura. */
  async regenerateCode(scope: GroupScope, id: string): Promise<GroupDoc> {
    const group = await this.get(scope, id);
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
      const code = generateGroupCode();
      if (await this.repository.setCode(id, code)) return { ...group, code };
    }
    throw new Error("no se pudo generar un codigo de grupo libre");
  }

  /** Solo administrator (lo exige el controlador). Idempotente. */
  delete(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  removeOwner(accountId: string): Promise<void> {
    return this.repository.removeOwner(accountId);
  }

  async countOwnedBy(accountId: string): Promise<number> {
    return (await this.repository.idsOwnedBy(accountId)).length;
  }
}
