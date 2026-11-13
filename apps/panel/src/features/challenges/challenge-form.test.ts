import { describe, expect, it } from "vitest";
import { buildChallenge, emptyForm, newRow } from "./challenge-form";

describe("buildChallenge", () => {
  it("pide texto y dificultad", () => {
    const { challenge, errors } = buildChallenge({ ...emptyForm(), difficulty: "0" });
    expect(challenge).toBeNull();
    expect(errors).toMatchObject({ text: "required", difficulty: "intMin1" });
  });
  it("numberInput: los huecos y los campos deben coincidir", () => {
    const base = { ...emptyForm(), text: "x", type: "numberInput" as const, niFields: [newRow("a", "5")] };
    expect(buildChallenge({ ...base, niExpression: "7 + {b} = 12" }).errors.niExpression).toBe("holes");
    const ok = buildChallenge({ ...base, niExpression: "7 + {a} = 12" });
    expect(ok.challenge?.mechanic).toMatchObject({ type: "numberInput", config: { fields: [{ id: "a", expected: 5 }] } });
  });
  it("wordDrop: la palabra correcta va en el banco", () => {
    const f = { ...emptyForm(), text: "x", type: "wordDrop" as const, wdTemplate: "El {a}", wdBlanks: [newRow("a", "gato")], wdWords: [newRow("perro")] };
    expect(buildChallenge(f).errors.wdWords).toBe("bankMissing");
  });
  it("dragDrop con cantidades objetivo", () => {
    const f = { ...emptyForm(), text: "x", ddItemAsset: "manzana", ddItemCount: "8", ddContainerAsset: "bolsa", ddContainerCount: "2", ddRule: "targetCounts" as const, ddCounts: "3, 5" };
    expect(buildChallenge(f).challenge?.assets).toEqual(["manzana", "bolsa"]);
    expect(buildChallenge({ ...f, ddCounts: "3" }).errors.ddCounts).toBe("countsLength");
  });
});
