import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.ts";
import { BannedWordsController } from "./banned-words.controller.ts";
import { BannedWordsRepository } from "./banned-words.repository.ts";
import { BannedWordsService } from "./banned-words.service.ts";

@Module({
  imports: [DatabaseModule],
  controllers: [BannedWordsController],
  providers: [BannedWordsService, BannedWordsRepository],
})
export class WordFilterModule {}
