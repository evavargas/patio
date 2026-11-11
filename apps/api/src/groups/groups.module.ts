import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.ts";
import { GroupsRepository } from "./groups.repository.ts";
import { GroupsService } from "./groups.service.ts";

@Module({
  imports: [DatabaseModule],
  providers: [GroupsService, GroupsRepository],
  exports: [GroupsService],
})
export class GroupsModule {}
