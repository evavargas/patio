import { describe, expect, it } from "vitest";
import { addDays, addMonths, lastOfMonth, monthWeeks } from "./calendar";

describe("calendar", () => {
  it("suma dias y meses sin corrimiento", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(lastOfMonth("2028-02")).toBe("2028-02-29");
  });
  it("arma semanas que empiezan en lunes", () => {
    const weeks = monthWeeks("2026-11"); // 1 de noviembre de 2026 es domingo
    expect(weeks[0]?.indexOf("2026-11-01")).toBe(6);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });
});
