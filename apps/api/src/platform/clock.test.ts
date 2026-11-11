import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Clock } from "./clock.ts";

class FixedClock extends Clock {
  constructor(private readonly at: Date, timeZone = "America/Montevideo") {
    super(timeZone);
  }
  override now(): Date {
    return this.at;
  }
}

describe("Clock", () => {
  it("es inyectable: una subclase fija la hora", () => {
    const clock = new FixedClock(new Date("2026-11-11T12:00:00Z"));
    expect(clock.now().toISOString()).toBe("2026-11-11T12:00:00.000Z");
  });

  it("today() usa la zona configurada (Montevideo es UTC-3)", () => {
    expect(new FixedClock(new Date("2026-11-12T02:59:59Z")).today()).toBe("2026-11-11");
    expect(new FixedClock(new Date("2026-11-12T03:00:00Z")).today()).toBe("2026-11-12");
    expect(new FixedClock(new Date("2026-11-12T03:00:00Z"), "UTC").today()).toBe("2026-11-12");
  });

  it("nadie mas que clock.ts lee la hora del sistema", () => {
    const root = join(import.meta.dirname, "..");
    const files = readdirSync(root, { recursive: true, encoding: "utf8" }).filter(
      (f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== join("platform", "clock.ts"),
    );
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      expect(readFileSync(join(root, f), "utf8"), f).not.toMatch(/Date\.now\(|new Date\(/);
    }
  });
});
