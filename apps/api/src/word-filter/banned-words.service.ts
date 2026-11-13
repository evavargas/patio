import { Inject, Injectable } from "@nestjs/common";
import type { BannedWordsResponse } from "@patio/contracts";
import { BannedWordsRepository } from "./banned-words.repository.ts";

@Injectable()
export class BannedWordsService {
  constructor(@Inject(BannedWordsRepository) private readonly repository: Pick<BannedWordsRepository, "find" | "replace">) {}

  /** La lista arranca vacia: sin documento es la version 0. */
  async get(): Promise<BannedWordsResponse> {
    const doc = await this.repository.find();
    return doc === null ? { version: 0, words: [] } : { version: doc.version, words: doc.words };
  }

  /** PUT del panel (solo administrator). Recorta, descarta vacias y repetidas; cada cambio sube la version. 1 escritura. */
  async replace(words: string[]): Promise<BannedWordsResponse> {
    const clean = [...new Set(words.map((w) => w.trim()).filter((w) => w !== ""))];
    const doc = await this.repository.replace(clean);
    return { version: doc.version, words: doc.words };
  }
}
