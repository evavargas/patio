---
paths:
  - "packages/theme/**"
  - "apps/game/src/**/*.tsx"
  - "apps/game/src/**/*.css"
  - "apps/panel/src/**/*.tsx"
  - "apps/panel/src/**/*.css"
  - "packages/challenges/**/*.tsx"
---

# Reglas de tema y accesibilidad

Contexto: `docs/context/08-tema-y-accesibilidad.md`.

Tema:
- Ningún color literal (`#...`, `rgb(...)`, `hsl(...)`, nombres de color), ningún tamaño de letra en `px`, ningún radio o sombra literal en componentes. Usa tokens (clases de Tailwind mapeadas al preset de `@patio/theme` o variables CSS).
- Un tema nuevo es un archivo en `packages/theme/themes/`. Debe definir TODOS los tokens en claro y oscuro y pasar el validador de contraste (4,5:1 texto, 3:1 texto grande y componentes).
- Modo `light` / `dark` / `system`. `system` sigue `prefers-color-scheme` y escucha el cambio. Atributos `data-theme`, `data-mode` y `color-scheme` en la raíz.
- Los scripts de arranque del tema son archivos externos del mismo origen (`theme-init.js`), nunca en línea.
- La escena 3D no se tematiza.

Accesibilidad (WCAG 2.2 AA):
- HTML semántico primero (`button`, `label`, `fieldset`, `nav`, `main`, títulos en orden). ARIA solo si no hay elemento nativo.
- Cada pantalla: un `h1` y un `main`. Al cambiar de pantalla el foco va al `h1` (`tabindex="-1"`). Al cerrar un desafío, el foco vuelve al juguete.
- Ningún estado solo por color: ícono y texto. Íconos sin texto con `aria-label`, decorativos con `aria-hidden`.
- Foco visible con `focus-ring`. Blancos táctiles de 48 dp en el juego.
- Resultados en región `aria-live="polite"`.
- `prefers-reduced-motion` y `forced-colors` respetados. Texto en `rem`.
- Todo arrastre con alternativa de teclado y anuncios. Entrada numérica con `input` nativo, `label` e `inputmode="numeric"`.
