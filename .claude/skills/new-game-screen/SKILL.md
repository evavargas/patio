---
name: new-game-screen
description: Agregar o modificar una pantalla del juego (DOM sobre el canvas) con máquina de estados, accesibilidad, tema por tokens, textos del catálogo y reglas de bienestar infantil.
argument-hint: "<nombre de la pantalla>"
---

# Pantalla nueva del juego

Contexto: `docs/context/05-juego-frontend.md`, `08-tema-y-accesibilidad.md`, `09-juego-contenido-y-bienestar.md`.

1. Ubicala en el flujo (Arranque, Términos, Registro, Patio, Desafío, Cierre, Sin set, Perfil, Recuperar, Errores) y definí transiciones en la máquina de estados. Sin librería de rutas.
2. Productos prohibidos: ranking, nivel, rachas, urgencia, notificaciones, solución, intentos. Corré `wellbeing-check` sobre el diseño ANTES de implementar.
3. Textos: del catálogo `es-UY`, breves, amables, sin lenguaje técnico. Ninguna cadena dentro del componente. Siempre texto plano.
4. Estructura accesible: un `h1` y un `main`. Al entrar, el foco va al `h1` (`tabindex="-1"`). Controles nativos con `label`. Blancos de 48 dp. Región `aria-live="polite"` para resultados.
5. Estilos: solo tokens (Tailwind con el preset de `@patio/theme`). Probá claro, oscuro y al menos dos temas.
6. Si se muestra sobre el canvas: pausá el `frameloop` cuando la pantalla lo cubre. Sin tocar estado de React desde el bucle de dibujo.
7. Datos: usá los endpoints existentes del `api-client`. Estados de carga, error amable y sin conexión.
8. Pruebas de componente y axe en claro y oscuro (`a11y-check`).

Salida: pantalla, transiciones, textos agregados al catálogo y resultado de las pruebas.
