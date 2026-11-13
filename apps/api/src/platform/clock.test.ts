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

  it("nextDay y previousDay respetan meses y anios", () => {
    const clock = new Clock("America/Montevideo");
    expect(clock.nextDay(clock.dayKey("2026-11-30"))).toBe("2026-12-01");
    expect(clock.nextDay(clock.dayKey("2026-12-31"))).toBe("2027-01-01");
    expect(clock.previousDay(clock.dayKey("2026-03-01"))).toBe("2026-02-28");
    expect(clock.previousDay(clock.dayKey("2028-03-01"))).toBe("2028-02-29");
  });

  it("startOfDay es la medianoche local en UTC (Montevideo UTC-3, UTC, y una zona con horario de verano)", () => {
    expect(new Clock("America/Montevideo").startOfDay(new Clock("UTC").dayKey("2026-11-11")).toISOString()).toBe("2026-11-11T03:00:00.000Z");
    expect(new Clock("UTC").startOfDay(new Clock("UTC").dayKey("2026-11-11")).toISOString()).toBe("2026-11-11T00:00:00.000Z");
    // Nueva York: EST (UTC-5) en noviembre, EDT (UTC-4) en julio
    expect(new Clock("America/New_York").startOfDay(new Clock("UTC").dayKey("2026-11-11")).toISOString()).toBe("2026-11-11T05:00:00.000Z");
    expect(new Clock("America/New_York").startOfDay(new Clock("UTC").dayKey("2026-07-01")).toISOString()).toBe("2026-07-01T04:00:00.000Z");
  });

  it("endOfDay es el inicio del dia siguiente y addMinutes suma", () => {
    const clock = new FixedClock(new Date("2026-11-11T15:00:00Z"));
    expect(clock.endOfDay().toISOString()).toBe("2026-11-12T03:00:00.000Z");
    expect(clock.addMinutes(clock.now(), 30).toISOString()).toBe("2026-11-11T15:30:00.000Z");
  });

  it("fromEpochSeconds convierte segundos Unix", () => {
    expect(new Clock("UTC").fromEpochSeconds(1_794_409_200).toISOString()).toBe("2026-11-11T15:00:00.000Z");
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
