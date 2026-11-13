import type { Challenge, DragDropRule } from "@patio/contracts";

// Validacion a mano de los limites de challenge, drag-drop, number-input y word-drop (schemas de contracts).
// No se usan los validadores de contracts: ajv necesita eval y la CSP no lo permite. El servidor vuelve a validar todo.
export const TEXT_MAX = 300;
export const TEMPLATE_MAX = 200;
export const WORD_MAX = 40;
const FIELD_ID = /^[a-z][a-zA-Z0-9]{0,15}$/;
const INT = /^\d+$/;

export type MechanicType = "dragDrop" | "numberInput" | "wordDrop";
export interface Row {
  key: number;
  a: string;
  b: string;
}
export interface FormState {
  text: string;
  difficulty: string;
  points: string;
  family: string;
  assets: string[];
  type: MechanicType;
  ddItemAsset: string;
  ddItemCount: string;
  ddContainerAsset: string;
  ddContainerCount: string;
  ddRule: "equalShare" | "targetCounts";
  ddCounts: string;
  niExpression: string;
  niFields: Row[]; // a = id, b = valor esperado
  wdTemplate: string;
  wdBlanks: Row[]; // a = id, b = palabra correcta
  wdWords: Row[]; // a = palabra
}
/** Codigo de error por campo; el texto sale de `challenges.err.<codigo>`. */
export type FormErrors = Record<string, string>;

let rowKey = 1;
/** Tupla con al menos un elemento (los schemas piden minItems 1), o null si esta vacia. */
const nonEmpty = <T,>(list: T[]): [T, ...T[]] | null => {
  const [first, ...rest] = list;
  return first === undefined ? null : [first, ...rest];
};
export const FAMILIES = ["resolver", "descubrir", "crear"] as const;
export const newRow = (a = "", b = ""): Row => ({ key: rowKey++, a, b });

export const emptyForm = (): FormState => ({
  text: "", difficulty: "1", points: "", family: "", assets: [], type: "dragDrop",
  ddItemAsset: "", ddItemCount: "", ddContainerAsset: "", ddContainerCount: "", ddRule: "equalShare", ddCounts: "",
  niExpression: "", niFields: [newRow()], wdTemplate: "", wdBlanks: [newRow()], wdWords: [newRow()],
});

export function fromChallenge(c: Challenge): FormState {
  const f = { ...emptyForm(), text: c.text, difficulty: String(c.difficulty), points: c.points === undefined ? "" : String(c.points), family: c.family ?? "", assets: [...c.assets], type: c.mechanic.type };
  const m = c.mechanic;
  if (m.type === "dragDrop") {
    const { items, containers, rule } = m.config;
    Object.assign(f, { ddItemAsset: items.assetId, ddItemCount: String(items.count), ddContainerAsset: containers.assetId, ddContainerCount: String(containers.count), ddRule: rule.type, ddCounts: rule.type === "targetCounts" ? rule.counts.join(", ") : "" });
  } else if (m.type === "numberInput") {
    Object.assign(f, { niExpression: m.config.expression, niFields: m.config.fields.map((x) => newRow(x.id, String(x.expected))) });
  } else {
    Object.assign(f, { wdTemplate: m.config.template, wdBlanks: m.config.blanks.map((x) => newRow(x.id, x.correct)), wdWords: m.config.words.map((w) => newRow(w)) });
  }
  return f;
}

const placeholders = (text: string): string[] => [...text.matchAll(/\{([^{}]*)\}/g)].map((m) => m[1] ?? "");

/** Los huecos `{id}` del texto y los ids declarados deben coincidir. */
function checkHoles(text: string, ids: string[], key: string, errors: FormErrors): void {
  const holes = placeholders(text);
  if (holes.some((h) => !ids.includes(h)) || ids.some((i) => i !== "" && !holes.includes(i))) errors[key] = "holes";
}

export function buildChallenge(f: FormState): { challenge: Challenge | null; errors: FormErrors } {
  const e: FormErrors = {};
  const text = f.text.trim();
  if (text === "") e.text = "required";
  else if (text.length > TEXT_MAX) e.text = "tooLong";
  if (!INT.test(f.difficulty) || Number(f.difficulty) < 1) e.difficulty = "intMin1";
  if (f.points !== "" && !INT.test(f.points)) e.points = "intMin0";

  const mechanic = ((): Challenge["mechanic"] | null => {
    if (f.type === "dragDrop") {
      if (f.ddItemAsset === "") e.ddItemAsset = "required";
      if (f.ddContainerAsset === "") e.ddContainerAsset = "required";
      if (!INT.test(f.ddItemCount) || Number(f.ddItemCount) < 1) e.ddItemCount = "intMin1";
      if (!INT.test(f.ddContainerCount) || Number(f.ddContainerCount) < 1) e.ddContainerCount = "intMin1";
      let rule: DragDropRule = { type: "equalShare" };
      if (f.ddRule === "targetCounts") {
        const parts = f.ddCounts.split(",").map((p) => p.trim());
        if (parts.some((p) => !INT.test(p))) e.ddCounts = "counts";
        else if (!e.ddContainerCount && parts.length !== Number(f.ddContainerCount)) e.ddCounts = "countsLength";
        else {
          const counts = nonEmpty(parts.map(Number));
          if (counts) rule = { type: "targetCounts", counts };
        }
      }
      if (Object.keys(e).some((k) => k.startsWith("dd"))) return null;
      return { type: "dragDrop", schemaVersion: 1, config: { items: { assetId: f.ddItemAsset, count: Number(f.ddItemCount) }, containers: { assetId: f.ddContainerAsset, count: Number(f.ddContainerCount) }, rule } };
    }
    if (f.type === "numberInput") {
      const expr = f.niExpression.trim();
      if (expr === "") e.niExpression = "required";
      else if (expr.length > TEMPLATE_MAX) e.niExpression = "tooLong";
      const ids = f.niFields.map((r) => r.a.trim());
      if (f.niFields.length === 0) e.niFields = "atLeastOne";
      else if (ids.some((i) => !FIELD_ID.test(i))) e.niFields = "fieldId";
      else if (new Set(ids).size !== ids.length) e.niFields = "duplicate";
      else if (f.niFields.some((r) => r.b.trim() === "" || !Number.isFinite(Number(r.b)))) e.niFields = "number";
      if (!e.niExpression && !e.niFields) checkHoles(expr, ids, "niExpression", e);
      const fields = nonEmpty(f.niFields.map((r) => ({ id: r.a.trim(), expected: Number(r.b) })));
      if (e.niExpression || e.niFields || !fields) return null;
      return { type: "numberInput", schemaVersion: 1, config: { expression: expr, fields } };
    }
    const tpl = f.wdTemplate.trim();
    if (tpl === "") e.wdTemplate = "required";
    else if (tpl.length > TEMPLATE_MAX) e.wdTemplate = "tooLong";
    const ids = f.wdBlanks.map((r) => r.a.trim());
    const words = f.wdWords.map((r) => r.a.trim());
    if (f.wdBlanks.length === 0) e.wdBlanks = "atLeastOne";
    else if (ids.some((i) => !FIELD_ID.test(i))) e.wdBlanks = "fieldId";
    else if (new Set(ids).size !== ids.length) e.wdBlanks = "duplicate";
    else if (f.wdBlanks.some((r) => r.b.trim() === "" || r.b.trim().length > WORD_MAX)) e.wdBlanks = "word";
    if (words.length === 0) e.wdWords = "atLeastOne";
    else if (words.some((w) => w === "" || w.length > WORD_MAX)) e.wdWords = "word";
    else if (!e.wdBlanks && f.wdBlanks.some((r) => !words.includes(r.b.trim()))) e.wdWords = "bankMissing";
    if (!e.wdTemplate && !e.wdBlanks) checkHoles(tpl, ids, "wdTemplate", e);
    const blanks = nonEmpty(f.wdBlanks.map((r) => ({ id: r.a.trim(), correct: r.b.trim() })));
    const bank = nonEmpty(words);
    if (e.wdTemplate || e.wdBlanks || e.wdWords || !blanks || !bank) return null;
    return { type: "wordDrop", schemaVersion: 1, config: { template: tpl, blanks, words: bank } };
  })();

  if (Object.keys(e).length > 0 || mechanic === null) return { challenge: null, errors: e };
  const assets = [...new Set([...f.assets, ...(mechanic.type === "dragDrop" ? [mechanic.config.items.assetId, mechanic.config.containers.assetId] : [])])];
  const family = FAMILIES.find((x) => x === f.family);
  const challenge: Challenge = { text, mechanic, difficulty: Number(f.difficulty), assets, ...(f.points === "" ? {} : { points: Number(f.points) }), ...(family === undefined ? {} : { family }) };
  return { challenge, errors: e };
}
