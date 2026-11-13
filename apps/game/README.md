# @patio/game

Estado: juego mínimo conectado a la API (registro, recuperar, patio con un juguete por desafío, tres mecánicas, cola de logros) y prueba de rendimiento 3D (skill `perf-gate-3d`, abajo). Para jugar: `pnpm db:up`, `pnpm db:seed`, `pnpm dev:api` y `pnpm dev:game`; con el seed, el código de grupo `TERCER` tiene set hoy. Pruebas: `pnpm --filter @patio/game test`.

Prueba de rendimiento: Capacitor todavía no está agregado: falta el Android SDK en la máquina de desarrollo.

Criterio propuesto (a fijar): 30 fps sostenidos y peor 1 % no menor a 20 en el dispositivo más modesto (Xiaomi Redmi Note 9 Pro, Snapdragon 720G, Adreno 618, 6 GB, Android 10; fuente smart-gsm.com).

## Correr en el navegador

```
pnpm install
pnpm dev:game          # http://localhost:5173
```

- Juego normal: `http://localhost:5173/`. Flechas o WASD, espacio para saltar, joystick y botón en pantalla táctil, botón "Abrir desafío".
- Prueba: `http://localhost:5173/?perf=1`. No toques nada durante 60 s: 45 s de guion (circuito caminando, saltos cada 3 s, cruza el escalón) y 15 s con el desafío abierto y el bucle de R3F en pausa (`frameloop="never"`). Al terminar se muestra el resumen y el JSON (descargar o copiar). También queda en `window.__perfResult`.
- Parámetros opcionales: `device=<etiqueta>` (queda en el JSON, usá marca y modelo), `dpr=<n>` (factor de píxeles, máximo 2; sirve para probar bajar calidad), `duration=<s>` (solo para depurar el guion; la medición oficial es 60).
- Para medir en celular por red local: `pnpm dev:game` ya escucha en la red; abrí `http://<IP-de-la-compu>:5173/?perf=1&device=...`. Mejor medir con `pnpm build` y servir `dist/` (por ejemplo `pnpm --filter @patio/game exec vite preview --host`), porque el modo dev agrega costo.

## Qué mide

- fps promedio, tiempo de cuadro promedio, p99 y máximo, y "peor 1 %" (fps equivalentes al promedio del 1 % de cuadros más lentos). Se mide con `requestAnimationFrame`, así que está limitado al refresco de pantalla.
- Draw calls y triángulos (máximo, de `renderer.info`), geometrías y texturas.
- Memoria JS (`performance.memory`, solo Chromium). La memoria de GPU no se puede leer desde la web: mirar en Android Studio o Chrome remoto.
- Tiempo hasta poder jugar: desde el inicio de la carga hasta el tercer cuadro con el controlador de personaje listo.
- Fase `challengePaused`: cuadros de rAF con el desafío abierto y cantidad de cuadros que R3F dibujó (debe ser 0 o 1, el de la transición).

Cada cifra vale solo para el dispositivo que figura en el JSON. Las corridas en una laptop o en un navegador headless NO valen para el dispositivo: sin medir en dispositivo. Hacé al menos tres corridas por dispositivo y reportá el rango.

## Medir dentro del WebView de Capacitor (Chrome remoto)

Pendiente de que exista el proyecto Android (`pnpm add -E @capacitor/core @capacitor/android` y `cap add android`; requiere Android SDK y Android Studio). Una vez hecho:

1. Compilá con `pnpm build` y sincronizá `dist/` con Capacitor. La app tiene que abrirse con `?perf=1`: apuntá temporalmente `server.url` a la URL de `vite preview` con `?perf=1`, o desde la consola remota ejecutá `location.search = '?perf=1&device=...'`.
2. En el celular: activar Opciones de desarrollador y Depuración USB; conectarlo por cable.
3. En Chrome de escritorio: `chrome://inspect/#devices`, buscar el WebView de la app y "inspect".
4. En la consola remota, tras 60 s: `copy(JSON.stringify(window.__perfResult, null, 2))` y pegar en un archivo. El botón de descarga puede no funcionar en el WebView: usar este paso.
5. Para GPU y memoria nativa, usar el perfilador de Android Studio durante la corrida.

Plugins permitidos: Preferences, App, StatusBar y opcionalmente Screen Orientation. Sin HTTP nativo.

## Estructura

- `src/clock.ts`: única fuente de hora.
- `src/i18n/texts.ts`: catálogo es-UY provisorio.
- `src/styles.css`: tokens CSS (el DOM no tiene valores literales fuera de ahí).
- `src/input/`: entrada por referencias (teclado, joystick, guion).
- `src/scene/`: escena R3F, física Rapier con paso fijo e interpolación.
- `src/challenge/DragChallenge.tsx`: mecánica de arrastrar con dnd-kit y alternativa de teclado (sensor de teclado y botones).
- `src/perf/`: grabador, guion y panel de resultados.
