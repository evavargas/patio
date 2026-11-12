import { Inject, Injectable } from "@nestjs/common";
import { type PlayerId, type RecoverPlayerResponse, isPlayerId, isPlayerToken, isRecoverPlayerRequest } from "@patio/contracts";
import { timingSafeEqual } from "node:crypto";
import { generatePlayerId, generateRecoveryCode, generateToken, hashRecoveryCode, hashToken } from "../auth/credentials.ts";
import { RateLimitService } from "../rate-limit/rate-limit.service.ts";
import { type AppConfig, CONFIG } from "../platform/config.ts";
import { DomainException } from "../platform/domain.exception.ts";
import { NicknameService } from "../word-filter/nickname.service.ts";
import { type PlayerDoc, PlayersRepository } from "./players.repository.ts";

/** Credenciales nuevas: lo que va al player (token y codigo, UNA vez) y lo que se guarda (solo hashes). */
export interface NewIdentity {
  playerId: PlayerId;
  token: string;
  recoveryCode: string;
  tokenHash: string;
  recoveryHash: string;
}

/** Lo que el guard deja en el pedido: solo datos del propio player, nunca hashes ni nivel. */
export interface AuthenticatedPlayer {
  playerId: string;
  nickname: string;
  score: number;
}

/** Estado del player despues de sumar un logro. Interno: el nivel nunca sale en `/v1`. */
export interface PlayerProgress {
  score: number;
  level: number;
  countsByDifficulty: Record<string, number>;
  countsByDifficultyFamily: Record<string, number>;
}

export interface ResultIncrement {
  points: number;
  difficulty: number;
  family?: string;
}

export interface NewPlayer {
  identity: NewIdentity;
  nickname: string;
  groupId: string | null;
  termsVersion: string;
  now: Date;
}

@Injectable()
export class PlayersService {
  constructor(
    @Inject(CONFIG) private readonly config: Pick<AppConfig, "recoveryHmacSecret" | "limits">,
    @Inject(NicknameService) private readonly nicknames: Pick<NicknameService, "check">,
    @Inject(RateLimitService) private readonly rateLimit: Pick<RateLimitService, "hit">,
    @Inject(PlayersRepository)
    private readonly repository: Pick<PlayersRepository, "insert" | "delete" | "countInGroup" | "findByTokenHash" | "replaceTokenByRecoveryHash" | "touch" | "addResult" | "raiseLevel">,
  ) {}

  /** Apodo recortado, o NICKNAME_NOT_ALLOWED sin decir por que. */
  async validateNickname(nickname: string): Promise<string> {
    const clean = await this.nicknames.check(nickname);
    if (clean === null) throw new DomainException("NICKNAME_NOT_ALLOWED", 400);
    return clean;
  }

  newIdentity(): NewIdentity {
    const token = generateToken();
    const recoveryCode = generateRecoveryCode();
    return {
      playerId: generatePlayerId(),
      token,
      recoveryCode,
      tokenHash: hashToken(token),
      recoveryHash: hashRecoveryCode(recoveryCode, this.config.recoveryHmacSecret),
    };
  }

  async create({ identity, nickname, groupId, termsVersion, now }: NewPlayer): Promise<void> {
    const doc: PlayerDoc = {
      _id: identity.playerId,
      nickname,
      groupId,
      tokenHash: identity.tokenHash,
      recoveryHash: identity.recoveryHash,
      score: 0,
      countsByDifficulty: {},
      countsByFamily: {},
      countsByDifficultyFamily: {},
      level: 0,
      termsVersion,
      termsAcceptedAt: now,
      createdAt: now,
      lastActiveAt: now,
    };
    await this.repository.insert(doc);
  }

  delete(playerId: string): Promise<void> {
    return this.repository.delete(playerId);
  }

  countInGroup(groupId: string): Promise<number> {
    return this.repository.countInGroup(groupId);
  }

  /** Valor de `Authorization` -> player, o null por CUALQUIER causa (ausente, malformado, desconocido, borrado). 1 lectura, 0 si el formato no sirve. */
  async authenticate(header: string | undefined): Promise<AuthenticatedPlayer | null> {
    const token = /^Bearer (\S+)$/.exec(header ?? "")?.[1];
    if (token === undefined || !isPlayerToken(token)) return null;
    const hash = hashToken(token);
    const doc = await this.repository.findByTokenHash(hash);
    // La busqueda ya es por hash (no filtra el token); la comparacion en tiempo constante es defensa adicional.
    if (doc === null || !timingSafeEqual(Buffer.from(hash), Buffer.from(doc.tokenHash))) return null;
    return { playerId: doc._id, nickname: doc.nickname, score: doc.score };
  }

  /** Marca actividad (`lastActiveAt`) y devuelve el grupo actual y el puntaje. 1 operacion. null si el player ya no existe. */
  touch(playerId: string, now: Date): Promise<{ groupId: string | null; score: number } | null> {
    return this.repository.touch(playerId, now);
  }

  /** Suma un logro al puntaje y a los conteos (por dificultad, familia y ambas) en UNA operacion atomica. */
  async addResult(playerId: string, { points, difficulty, family }: ResultIncrement): Promise<PlayerProgress | null> {
    const inc: Record<string, number> = { score: points, [`countsByDifficulty.${difficulty}`]: 1 };
    if (family !== undefined) {
      inc[`countsByFamily.${family}`] = 1;
      inc[`countsByDifficultyFamily.${difficulty}:${family}`] = 1;
    }
    const doc = await this.repository.addResult(playerId, inc);
    if (doc === null) return null;
    return { score: doc.score, level: doc.level, countsByDifficulty: doc.countsByDifficulty, countsByDifficultyFamily: doc.countsByDifficultyFamily ?? {} };
  }

  raiseLevel(playerId: string, level: number): Promise<void> {
    return this.repository.raiseLevel(playerId, level);
  }

  /**
   * POST /v1/players/recover. 2 operaciones: limite por IP (cuenta TODO pedido, tambien los invalidos) y un solo update
   * atomico que cambia el hash del token. Codigo inexistente y codigo de un player borrado son indistinguibles: misma
   * operacion, mismo error. El codigo no cambia.
   */
  async recover(ip: string, body: unknown): Promise<RecoverPlayerResponse> {
    if (!(await this.rateLimit.hit(`recover:${ip}`, this.config.limits.recover))) throw new DomainException("RATE_LIMITED", 429);
    if (!isRecoverPlayerRequest(body)) throw new DomainException("VALIDATION_FAILED", 400);
    const token = generateToken();
    const player = await this.repository.replaceTokenByRecoveryHash(hashRecoveryCode(body.recoveryCode, this.config.recoveryHmacSecret), hashToken(token));
    if (player === null) throw new DomainException("RECOVERY_CODE_INVALID", 404);
    if (!isPlayerId(player._id)) throw new Error("ID guardado fuera del contrato");
    return { playerId: player._id, token, nickname: player.nickname };
  }
}
