import { describe, expect, it } from "vitest";
import { checkColors, contrastRatio } from "./contrast.ts";
import theme from "../themes/default.json";

describe("contraste", () => {
  it("calcula la razon conocida blanco/negro", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 0);
  });
  it("el tema por defecto cumple AA en claro y oscuro", () => {
    expect(checkColors(theme.modes.light.color, "light")).toEqual([]);
    expect(checkColors(theme.modes.dark.color, "dark")).toEqual([]);
  });
  it("detecta un par que no cumple", () => {
    expect(checkColors({ text: "#777777", background: "#888888" }, "light").length).toBeGreaterThan(0);
  });
});
