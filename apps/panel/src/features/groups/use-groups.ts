import { useQuery } from "@tanstack/react-query";
import { listGroups } from "../../api/panel-api";

export const GROUPS_KEY = ["groups"] as const;
export const useGroups = () => useQuery({ queryKey: GROUPS_KEY, queryFn: listGroups, select: (d) => d.items });
