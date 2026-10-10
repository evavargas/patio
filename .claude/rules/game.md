---
paths:
  - "apps/game/**"
---

# Reglas del juego (apps/game)

Contexto: `docs/context/05-juego-frontend.md`, `08-tema-y-accesibilidad.md`, `09-juego-contenido-y-bienestar.md`.

- El bucle de dibujo (`useFrame`) NO escribe en el estado de React ni en Zustand de forma reactiva. Entradas y estado de escena por referencias (`useRef`, estado leído con `getState()`).
- Capa 3D y capa DOM separadas. Toda la interfaz (pantallas, HUD, desafíos) es DOM accesible. El canvas lleva `role="img"` y etiqueta.
- La escena no usa tokens del tema ni cambia con el modo.
- Física con paso fijo e interpolación. Controlador cinemático de Rapier.
- `frameloop` en pausa con el desafío abierto y en segundo plano.
- Posiciones e imágenes de juguetes: PRNG con semilla `hash(playerId + fecha)` sobre puntos válidos precalculados.
- Textos desde el catálogo (`lib/`), nunca dentro de componentes. El jugador nunca ve HTML interpretado.
- Reloj: diferencia con la hora del servidor calculada en `GET /day`. No uses la hora del dispositivo para decidir nada.
- Logros: `eventId` UUID generado al lograr, cola de reintentos con el mismo `eventId`.
- NUNCA muestres la solución, cuentes intentos, uses rachas, muestres el nivel, ranking o urgencia. En duda: skill `wellbeing-check`.
- Plugins de Capacitor solo los permitidos: Preferences, App, StatusBar y opcionalmente Screen Orientation. HTTP nativo prohibido. Único permiso Android: `INTERNET`.
- Cualquier cosa que descargue código en tiempo de ejecución está prohibida.
- Presupuesto gráfico: ~100 draw calls y ~50k triángulos (sin medir). Cada asset nuevo se mide.
- Ningún pedido a dominios que no sean la API. Fuentes y assets del paquete.
