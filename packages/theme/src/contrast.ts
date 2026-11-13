export type Colors = Readonly<Record<string, string>>;

function channel(hex: string, start: number): number {
  const v = parseInt(hex.slice(start, start + 2), 16) / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}

const SURFACES = ["background", "surface", "surface-raised"];
const STATUS = ["primary", "accent", "success", "warning", "danger", "info"];
const SOFT = ["primary", "accent", "success", "warning", "danger", "info"].map((n) => `${n}-soft`);
const DATA = ["data-1", "data-2", "data-3", "data-4", "data-5", "data-6"];

/** Pares [texto, fondo, minimo]. 4,5 texto; 3 componentes de interfaz, foco y graficos. */
export const CONTRAST_PAIRS: readonly (readonly [string, string, number])[] = [
  ...["text", "text-muted", ...STATUS].flatMap((fg) => SURFACES.map((bg) => [fg, bg, 4.5] as const)),
  ["primary-contrast", "primary", 4.5],
  ...SOFT.map((bg) => ["text", bg, 4.5] as const),
  ...["border", "focus-ring", ...DATA].flatMap((fg) => SURFACES.map((bg) => [fg, bg, 3] as const)),
];

/** Devuelve los pares que no cumplen y si la escala secuencial es monotona. */
export function checkColors(colors: Colors, mode: "light" | "dark"): string[] {
  const errors: string[] = [];
  for (const [fg, bg, min] of CONTRAST_PAIRS) {
    const a = colors[fg];
    const b = colors[bg];
    if (a === undefined || b === undefined) continue;
    const ratio = contrastRatio(a, b);
    if (ratio < min) errors.push(`${mode}: ${fg} sobre ${bg} = ${ratio.toFixed(2)} (minimo ${min})`);
  }
  const lum = [1, 2, 3, 4, 5].map((i) => luminance(colors[`seq-${i}`] ?? "#000000"));
  const ok = lum.every((v, i) => i === 0 || (mode === "light" ? v < (lum[i - 1] ?? 0) : v > (lum[i - 1] ?? 0)));
  if (!ok) errors.push(`${mode}: la escala seq-1..5 no es monotona`);
  return errors;
}
