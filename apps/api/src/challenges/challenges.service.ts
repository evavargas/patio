import { Inject, Injectable } from "@nestjs/common";
import { type AccountRole, type Challenge, isChallenge } from "@patio/contracts";
import type { Document } from "mongodb";
import { randomUUID } from "node:crypto";
import { Clock } from "../platform/clock.ts";
import { DomainException } from "../platform/domain.exception.ts";
import { type ChallengeDoc, ChallengesRepository } from "./challenges.repository.ts";

export interface ChallengeActor {
  accountId: string;
  role: AccountRole;
}

export interface ChallengeFilters {
  status?: ChallengeDoc["status"];
  mechanic?: string;
  difficulty?: number;
  family?: string;
  authorId?: string;
}

const content = (c: Challenge, updatedAt: Date): Omit<ChallengeDoc, "_id" | "authorId" | "status" | "version" | "createdAt"> => ({
  text: c.text,
  mechanic: c.mechanic,
  difficulty: c.difficulty,
  ...(c.points === undefined ? {} : { points: c.points }),
  ...(c.family === undefined ? {} : { family: c.family }),
  assets: c.assets,
  updatedAt,
});

@Injectable()
export class ChallengesService {
  constructor(
    @Inject(Clock) private readonly clock: Clock,
    @Inject(ChallengesRepository) private readonly repository: ChallengesRepository,
  ) {}

  /** Valida con el schema compartido (incluida la mecanica). 1 escritura. */
  async create(authorId: string, body: unknown): Promise<ChallengeDoc> {
    if (!isChallenge(body)) throw new DomainException("VALIDATION_FAILED", 400);
    const now = this.clock.now();
    const doc: ChallengeDoc = { _id: randomUUID(), authorId, status: "active", version: 1, createdAt: now, ...content(body, now) };
    await this.repository.insert(doc);
    return doc;
  }

  /** 1 lectura. */
  async get(id: string): Promise<ChallengeDoc> {
    const doc = await this.repository.findById(id);
    if (doc === null) throw new DomainException("CHALLENGE_NOT_FOUND", 404);
    return doc;
  }

  /** 1 lectura. Biblioteca comun: la ven todos. */
  async list(filters: ChallengeFilters, cursor: string | undefined, limit: number): Promise<{ items: ChallengeDoc[]; nextCursor: string | null }> {
    const filter: Document = {
      ...(filters.status === undefined ? {} : { status: filters.status }),
      ...(filters.mechanic === undefined ? {} : { "mechanic.type": filters.mechanic }),
      ...(filters.difficulty === undefined ? {} : { difficulty: filters.difficulty }),
      ...(filters.family === undefined ? {} : { family: filters.family }),
      ...(filters.authorId === undefined ? {} : { authorId: filters.authorId }),
    };
    const rows = await this.repository.list(filter, cursor, limit);
    const items = rows.slice(0, limit);
    return { items, nextCursor: rows.length > limit ? (items.at(-1)?._id ?? null) : null };
  }

  /** Solo el autor y el administrator. Sube la version. 2 operaciones. */
  async update(actor: ChallengeActor, id: string, body: unknown): Promise<ChallengeDoc> {
    if (!isChallenge(body)) throw new DomainException("VALIDATION_FAILED", 400);
    await this.getEditable(actor, id);
    const updated = await this.repository.replaceContent(id, content(body, this.clock.now()));
    if (updated === null) throw new DomainException("CHALLENGE_NOT_FOUND", 404);
    return updated;
  }

  /** Cualquiera puede duplicar; el duplicado es del que duplica. 2 operaciones. */
  async duplicate(actor: ChallengeActor, id: string): Promise<ChallengeDoc> {
    const source = await this.get(id);
    const now = this.clock.now();
    const { _id, authorId, status, version, createdAt, ...rest } = source;
    void [_id, authorId, status, version, createdAt];
    const doc: ChallengeDoc = { ...rest, _id: randomUUID(), authorId: actor.accountId, status: "active", version: 1, createdAt: now, updatedAt: now };
    await this.repository.insert(doc);
    return doc;
  }

  /** Solo el autor y el administrator. Idempotente. 2 operaciones. */
  async archive(actor: ChallengeActor, id: string): Promise<ChallengeDoc> {
    const doc = await this.getEditable(actor, id);
    if (doc.status === "archived") return doc;
    const archived = await this.repository.archive(id, this.clock.now());
    if (archived === null) throw new DomainException("CHALLENGE_NOT_FOUND", 404);
    return archived;
  }

  /** Desafios activos para publicar un set. CHALLENGE_NOT_FOUND si falta o esta archivado alguno. 1 lectura. */
  async findActive(ids: string[]): Promise<ChallengeDoc[]> {
    const docs = await this.repository.findMany(ids);
    const byId = new Map(docs.filter((d) => d.status === "active").map((d) => [d._id, d]));
    return ids.map((id) => {
      const doc = byId.get(id);
      if (doc === undefined) throw new DomainException("CHALLENGE_NOT_FOUND", 404);
      return doc;
    });
  }

  /** Solo existencia (el borrador puede incluir cualquier desafio existente). 1 lectura. */
  async assertExist(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    if ((await this.repository.findMany(ids)).length !== ids.length) throw new DomainException("CHALLENGE_NOT_FOUND", 404);
  }

  countByAuthor(authorId: string): Promise<number> {
    return this.repository.countByAuthor(authorId);
  }

  private async getEditable(actor: ChallengeActor, id: string): Promise<ChallengeDoc> {
    const doc = await this.get(id);
    if (actor.role !== "administrator" && doc.authorId !== actor.accountId) throw new DomainException("FORBIDDEN_SCOPE", 403);
    return doc;
  }
}
