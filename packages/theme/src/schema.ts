/** Tokens obligatorios (doc 08). Un tema que no los defina todos no pasa la validacion. */
export const COLOR_TOKENS = [
  "background", "surface", "surface-raised", "text", "text-muted", "border",
  "primary", "primary-contrast", "primary-soft", "accent", "accent-soft",
  "success", "success-soft", "warning", "warning-soft", "danger", "danger-soft", "info", "info-soft",
  "focus-ring",
  "data-1", "data-2", "data-3", "data-4", "data-5", "data-6",
  "seq-1", "seq-2", "seq-3", "seq-4", "seq-5",
] as const;

export const SHADOW_TOKENS = ["raised", "floating"] as const;

export const SHARED_TOKENS = {
  font: ["sans"],
  text: ["xs", "sm", "base", "lg", "xl", "2xl", "3xl"],
  weight: ["normal", "medium", "semibold", "bold"],
  leading: ["tight", "normal", "relaxed"],
  radius: ["sm", "md", "lg", "xl", "full"],
  size: ["touch"],
  motion: ["duration-fast", "duration-base", "ease"],
} as const;
