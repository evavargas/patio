import { Inject, Injectable } from "@nestjs/common";
import { type GroupDoc, GroupsRepository } from "./groups.repository.ts";

export type GroupSummary = Pick<GroupDoc, "_id" | "active" | "maxSize">;

/** Por ahora solo lectura para validar el codigo. El servicio de alcance del panel llega con los endpoints del panel. */
@Injectable()
export class GroupsService {
  constructor(@Inject(GroupsRepository) private readonly repository: Pick<GroupsRepository, "findByCode">) {}

  async findByCode(code: string): Promise<GroupSummary | null> {
    const group = await this.repository.findByCode(code);
    return group === null ? null : { _id: group._id, active: group.active, maxSize: group.maxSize };
  }
}
