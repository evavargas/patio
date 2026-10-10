---
name: add-theme
description: Agregar un tema nuevo (paleta propia en modo claro y oscuro) como un archivo de datos en packages/theme, validar contraste y probarlo en juego y panel sin tocar componentes.
argument-hint: "<id del tema y paleta>"
---

# Tema nuevo

Contexto: `docs/context/08-tema-y-accesibilidad.md`.

1. Creá `packages/theme/themes/<id>.json` (id en `kebab-case`) copiando `default.json`. Definí TODOS los tokens obligatorios en `light` y en `dark`: superficie y texto, acción y estado (con variante suave), `focus-ring`, 6 colores categóricos y escala secuencial de 5 pasos, tipografía, forma y espacio, movimiento.
2. La escena 3D no se tematiza: no toques los tokens reservados de escena.
3. Corré el generador (`pnpm themes:check`): produce las variables CSS y registra el tema. Si falla por tokens faltantes, completalos.
4. Validador de contraste: texto sobre fondo 4,5:1, texto grande y componentes 3:1, `focus-ring` 3:1 contra fondo y elemento, en AMBOS modos. Si falla, ajustá el color, no el validador.
5. Fuentes: si el tema trae una familia nueva, debe estar autoalojada, con licencia OFL confirmada. Sin CDN.
6. Probá en el juego y en el panel con `?theme=<id>` (compilaciones que no son de producción) y alternando claro, oscuro y sistema. Revisá que no haya colores literales en ningún componente (si aparece uno, es un bug de componente).
7. Pasá axe en claro y oscuro (`a11y-check`). Revisá estados de foco, error y deshabilitado.
8. Si el jugador puede elegirlo, confirmá que aparece en el selector del Perfil.

Salida: archivo del tema, resultado del validador (qué pares pasan y cuáles estaban al límite) y capturas descritas en texto de lo revisado.
