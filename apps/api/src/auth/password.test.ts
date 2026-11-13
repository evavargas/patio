import { describe, expect, it } from "vitest";
import { Clock } from "../platform/clock.ts";
import { hashPassword, verifyPassword } from "./password.ts";

describe("hashPassword / verifyPassword (argon2id)", () => {
  it("guarda argon2id con los parametros minimos de OWASP (m=19456, t=2, p=1) y sal propia", async () => {
    const a = await hashPassword("una contrasena bastante larga");
    const b = await hashPassword("una contrasena bastante larga");
    expect(a).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$/);
    expect(a).not.toBe(b);
    expect(a).not.toContain("bastante");
  });

  it("acepta la correcta y rechaza la equivocada", async () => {
    const stored = await hashPassword("una contrasena bastante larga");
    expect(await verifyPassword("una contrasena bastante larga", stored)).toBe(true);
    expect(await verifyPassword("una contrasena bastante largA", stored)).toBe(false);
    expect(await verifyPassword("", stored)).toBe(false);
  });

  it("normaliza Unicode (NFKC): la misma contrasena escrita compuesta o descompuesta es la misma", async () => {
    const stored = await hashPassword("contraseña-con-éééé");
    expect(await verifyPassword("contraseña-con-éééé", stored)).toBe(true);
  });

  it("un hash ausente o mal formado nunca verifica (y no lanza)", async () => {
    expect(await verifyPassword("x", null)).toBe(false);
    for (const bad of ["", "texto", "$argon2i$v=19$m=19456,t=2,p=1$YWJj$YWJj", "$argon2id$v=19$m=0,t=2,p=1$YWJj$YWJj", "$argon2id$v=19$m=19456,t=2,p=1$$"]) {
      expect(await verifyPassword("x", bad)).toBe(false);
    }
  });

  it("con hash ausente tarda como una verificacion real (hash ficticio)", async () => {
    const stored = await hashPassword("una contrasena bastante larga");
    const clock = new Clock("UTC");
    const time = async (stored: string | null): Promise<number> => {
      const samples: number[] = [];
      for (let i = 0; i < 5; i++) {
        const start = clock.monotonicMs();
        await verifyPassword("otra contrasena distinta", stored);
        samples.push(clock.monotonicMs() - start);
      }
      return samples.sort((a, b) => a - b)[2] ?? 0;
    };
    const real = await time(stored);
    const dummy = await time(null);
    expect(dummy).toBeGreaterThan(real * 0.5);
    expect(dummy).toBeLessThan(real * 2);
  });
});
