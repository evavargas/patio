import { Inject, Injectable } from "@nestjs/common";
import { BannedWordsService } from "./banned-words.service.ts";
import { checkNickname } from "./nickname.ts";

@Injectable()
export class NicknameService {
  constructor(@Inject(BannedWordsService) private readonly bannedWords: Pick<BannedWordsService, "get">) {}

  /** Apodo recortado, o null si no se puede usar. 1 lectura de `settings`. */
  async check(nickname: string): Promise<string | null> {
    const { words } = await this.bannedWords.get();
    return checkNickname(nickname, words);
  }
}
