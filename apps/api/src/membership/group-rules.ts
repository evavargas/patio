import type { ErrorCode } from "@patio/contracts";

/** Un grupo acepta jugadores si esta activo y tiene lugar. Inactivo gana sobre lleno. */
export function groupError(group: { active: boolean; maxSize: number }, memberCount: number): ErrorCode | null {
  if (!group.active) return "GROUP_INACTIVE";
  return memberCount >= group.maxSize ? "GROUP_FULL" : null;
}
