import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.ts";
import { BannedWordsController } from "./banned-words.controller.ts";
import { BannedWordsRepository } from "./banned-words.repository.ts";
import { BannedWordsService } from "./banned-words.service.ts";
import { NicknameService } from "./nickname.service.ts";

@Module({
  imports: [DatabaseModule],
  controllers: [BannedWordsController],
  providers: [BannedWordsService, BannedWordsRepository, NicknameService],
  exports: [NicknameService, BannedWordsService],
})
export class WordFilterModule {}
