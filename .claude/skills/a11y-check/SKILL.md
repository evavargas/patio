---
name: a11y-check
description: Auditar accesibilidad WCAG 2.2 AA de una pantalla o vista del juego o del panel, en modo claro y oscuro, con herramientas automáticas y una lista manual de teclado y lector de pantalla.
argument-hint: "<pantalla o vista>"
---

# Auditoría de accesibilidad

Contexto: `docs/context/08-tema-y-accesibilidad.md` y `.claude/rules/theme-a11y.md`.

## Automático

1. `eslint-plugin-jsx-a11y` sin errores en lo tocado.
2. axe-core en Playwright en modo claro y en oscuro (y con un segundo tema). Cero violaciones nuevas.
3. Validador de contraste de temas (`pnpm themes:check`).

## Revisión del código

- HTML semántico: `button`, `label`, `fieldset`, `nav`, `main`, títulos en orden. ARIA solo donde no hay elemento nativo.
- Un `h1` y un `main` por pantalla. Foco al `h1` al cambiar de pantalla; al cerrar un desafío vuelve al juguete.
- Ningún estado solo por color. Íconos sin texto con `aria-label`, decorativos con `aria-hidden`.
- Foco visible con el token `focus-ring`. Blancos de 48 dp en el juego.
- Resultados en `aria-live="polite"`.
- Arrastre con alternativa de teclado y anuncios. Entrada numérica con `input`, `label` e `inputmode="numeric"`.
- `prefers-reduced-motion` y `forced-colors` respetados. Texto en `rem`. `lang="es-UY"`.
- Canvas con `role="img"` y etiqueta corta.
- Gráficos con color más etiqueta o patrón, resumen en texto y tabla.

## Manual (lo que no se automatiza)

- Panel solo con teclado: orden de foco, trampas, atajos, menú "Mover a...".
- Zoom del navegador al 200 % en el panel.
- Desafíos y perfil con TalkBack en Android.

No marques como verificado lo manual si no se hizo: listalo como pendiente con el dispositivo requerido.

## Entrega

Hallazgos por gravedad con el criterio WCAG afectado y el arreglo, resultado de axe y qué quedó pendiente de prueba manual.
