import type { PanelAccount } from "@patio/contracts";
import { BookOpen, CalendarDays, Gauge, Medal, Puzzle, ShieldBan, SlidersHorizontal, UserCog, Users, type LucideIcon } from "lucide-react";

type Role = PanelAccount["role"];

export interface NavItem {
  /** Clave de i18n bajo `nav.` */
  key: string;
  path: string;
  icon: LucideIcon;
  /** La interfaz oculta lo que el rol no puede hacer; el permiso real lo aplica el servidor. */
  roles: readonly Role[];
}

const BOTH: readonly Role[] = ["moderator", "administrator"];
const ADMIN: readonly Role[] = ["administrator"];

export const NAV_ITEMS: readonly NavItem[] = [
  { key: "dashboard", path: "/", icon: Gauge, roles: BOTH },
  { key: "players", path: "/players", icon: Users, roles: BOTH },
  { key: "groups", path: "/groups", icon: BookOpen, roles: BOTH },
  { key: "rankings", path: "/rankings", icon: Medal, roles: BOTH },
  { key: "challenges", path: "/challenges", icon: Puzzle, roles: BOTH },
  { key: "daySets", path: "/day-sets", icon: CalendarDays, roles: BOTH },
  // Reglas: el moderator solo las VE (doc 03); edicion y limites son del administrator.
  { key: "rules", path: "/rules", icon: SlidersHorizontal, roles: BOTH },
  { key: "wordFilter", path: "/word-filter", icon: ShieldBan, roles: ADMIN },
  { key: "accounts", path: "/accounts", icon: UserCog, roles: ADMIN },
];
