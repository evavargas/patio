import { describe, expect, it } from "vitest";
import { groupError } from "./group-rules.ts";

describe("groupError", () => {
  it("grupo activo con lugar: sin error", () => {
    expect(groupError({ active: true, maxSize: 50 }, 49)).toBeNull();
    expect(groupError({ active: true, maxSize: 50 }, 0)).toBeNull();
  });
  it("grupo lleno: GROUP_FULL (con exactamente maxSize jugadores, o mas)", () => {
    expect(groupError({ active: true, maxSize: 50 }, 50)).toBe("GROUP_FULL");
    expect(groupError({ active: true, maxSize: 50 }, 51)).toBe("GROUP_FULL");
  });
  it("grupo inactivo: GROUP_INACTIVE, aunque tambien este lleno", () => {
    expect(groupError({ active: false, maxSize: 50 }, 0)).toBe("GROUP_INACTIVE");
    expect(groupError({ active: false, maxSize: 50 }, 50)).toBe("GROUP_INACTIVE");
  });
});
