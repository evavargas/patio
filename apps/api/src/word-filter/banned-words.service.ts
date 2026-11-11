import { Inject, Injectable } from "@nestjs/common";
import type { BannedWordsResponse } from "@patio/contracts";
import { BannedWordsRepository } from "./banned-words.repository.ts";

@Injectable()
export class BannedWordsService {
  constructor(@Inject(BannedWordsRepository) private readonly repository: Pick<BannedWordsRepository, "find">) {}

  /** La lista arranca vacia: sin documento es la version 0. */
  async get(): Promise<BannedWordsResponse> {
    const doc = await this.repository.find();
    return doc === null ? { version: 0, words: [] } : { version: doc.version, words: doc.words };
  }
}
