import type { Document } from "mongodb";

/**
 * Servicio de alcance (doc 03): QUE grupos puede tocar una cuenta. Toda consulta del panel pasa por aca.
 * administrator = todo (incluidos los jugadores y sets sin grupo). moderator = solo sus grupos.
 */
export class GroupScope {
  /** `null` = todos. */
  constructor(private readonly ids: readonly string[] | null) {}

  get isAll(): boolean {
    return this.ids === null;
  }

  /** Los grupos permitidos, o null si son todos. */
  get groupIds(): readonly string[] | null {
    return this.ids;
  }

  /** `null` (sin grupo / set general) solo lo permite el alcance total. */
  allows(groupId: string | null): boolean {
    if (this.ids === null) return true;
    return groupId !== null && this.ids.includes(groupId);
  }

  /** Fragmento de filtro para un campo que guarda el id de grupo. Vacio para el alcance total. */
  filter(field: string): Document {
    return this.ids === null ? {} : { [field]: { $in: [...this.ids] } };
  }
}
