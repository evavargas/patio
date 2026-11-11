import { Inject, Injectable } from "@nestjs/common";
import type { PlayerId } from "@patio/contracts";
import { generatePlayerId, generateRecoveryCode, generateToken, hashRecoveryCode, hashToken } from "../auth/credentials.ts";
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
    @Inject(CONFIG) private readonly config: Pick<AppConfig, "recoveryHmacSecret">,
    @Inject(NicknameService) private readonly nicknames: Pick<NicknameService, "check">,
    @Inject(PlayersRepository) private readonly repository: Pick<PlayersRepository, "insert" | "delete" | "countInGroup">,
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
}
