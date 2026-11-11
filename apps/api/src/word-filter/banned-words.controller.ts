import { Controller, Get, Header, Inject, Res } from "@nestjs/common";
import type { BannedWordsResponse } from "@patio/contracts";
import type { Response } from "express";
import { BannedWordsService } from "./banned-words.service.ts";

@Controller("v1")
export class BannedWordsController {
  constructor(@Inject(BannedWordsService) private readonly service: BannedWordsService) {}

  /** Publica (la lista no es secreta: el juego valida apodos con ella). Express responde 304 si el ETag coincide. */
  @Get("banned-words")
  @Header("Cache-Control", "public, max-age=60")
  async list(@Res({ passthrough: true }) res: Response): Promise<BannedWordsResponse> {
    const body = await this.service.get();
    res.setHeader("ETag", `"banned-words-v${body.version}"`);
    return body;
  }
}
