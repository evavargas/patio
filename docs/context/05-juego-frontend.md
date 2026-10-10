# Juego (apps/game)

Stack: React + TypeScript + Vite, three.js con React Three Fiber, Rapier (`@react-three/rapier`), Zustand, Tailwind (decidido), Capacitor. Un solo código para web y móvil. Capacitor empaqueta los archivos compilados dentro de la app: NO se descarga código en tiempo de ejecución (Apple 2.5.2). Los desafíos son datos, no código.

## Capas

Dos capas superpuestas: canvas 3D (R3F) debajo, interfaz React (HUD, desafíos, pantallas) encima. Pantallas con una máquina de estados simple, sin librería de rutas.

Regla de oro: nada del bucle de dibujo toca el estado de React. La escena lee entradas y estado por referencias para no re-renderizar la interfaz 60 veces por segundo.

## Pantallas

Arranque (sesión guardada, palabras prohibidas, día) -> Términos (primera apertura) -> Registro (apodo validado al escribir, código de grupo opcional, muestra el código de recuperación al terminar) -> Patio (escena, reloj, joystick, salto, juguetes) -> Desafío (cubre la escena) -> Cierre ("Terminaste tu recreo", puntaje, reloj) | Sin set ("Vuelve pronto") | Perfil (apodo, puntaje, código de recuperación, elegir tema y modo) | Recuperar (ingresar código) | Errores (mensajes amables, sin lenguaje técnico).

## Estado y datos

- Zustand: sesión, pantalla, día, puntaje, juguetes logrados. Se lee sin re-renderizar.
- Sin TanStack Query en el juego: pocos endpoints y cola de reintentos de logros propia.
- Sesión (ID, token, código de recuperación, apodo) en `localStorage` (web) o plugin Preferences de Capacitor (móvil), tras una abstracción de almacenamiento única. Evaluar almacenamiento seguro más adelante (pendiente).
- Textos en un catálogo propio, español base `es-UY`, sin librería de i18n en el MVP. Ninguna cadena escrita dentro de un componente.

## Escena 3D

- World: escuela, canchas, cielo al atardecer, luces. Estático, colisionadores fijos. La escena NO cambia con el modo oscuro ni con el tema (decidido): es arte, no interfaz.
- Character: extraterrestre con controlador de personaje cinemático de Rapier (pendientes, escalones, detección de suelo). Salto = velocidad vertical con gravedad propia. Física con paso fijo e interpolación de dibujo.
- Camera: tercera persona con suavizado, sin atravesar objetos.
- Toys: uno por desafío. Posición e imagen salen de un PRNG con semilla = hash(playerId + fecha). Posiciones elegidas entre puntos válidos precalculados, con distancia mínima. El desafío n usa el juguete n. Un juguete logrado queda apagado; uno no logrado sigue activo hasta que termina el día.
- Movers: objetos decorativos que se mueven solos. No son desafíos ni dan puntos. Pendiente: si colisionan con el jugador.
- Con el desafío abierto, `frameloop` de R3F en pausa. También en segundo plano.
- `prefers-reduced-motion`: suavizar cámara y detener movers.

## Entrada

Capa única: teclado (flechas o WASD, barra espaciadora), joystick virtual y botón de salto táctiles. Produce un vector de movimiento normalizado y una bandera de salto que la escena lee por referencia. Blancos táctiles de al menos 48 dp. Orientación por definir (propuesta: horizontal).

## Desafíos dentro del juego

- Cada mecánica es un componente de `packages/challenges`: recibe la configuración y devuelve un único evento "lo logré". Evalúa la regla localmente.
- El juego genera el `eventId` (UUID) al lograr y envía `POST /results`. Si falla, reintenta con el mismo `eventId` durante la sesión.
- No logrado: mensaje "probá otra estrategia", deja seguir. NUNCA muestra la solución ni cuenta intentos.
- Textos siempre como texto plano.
- `schemaVersion` mayor a la conocida: aviso amable para actualizar, juguete sin abrir.
- Arrastre con dnd-kit (táctil, puntero, teclado). Es la misma librería que el panel.

## Reloj y sesión

Al recibir `GET /day` se calcula la diferencia servidor-dispositivo y se cuenta con ella (cambiar la hora del celular no altera el reloj). Al volver de segundo plano se vuelve a pedir el día. Si pasa la medianoche con un desafío abierto, puede terminarlo; al cerrarlo se pide el día de nuevo. Un 401 lleva a Recuperar. El reloj se muestra tranquilo ("El patio abre en 7 h"), sin urgencia.

## Assets y presupuesto gráfico

GLB con Draco o Meshopt, texturas KTX2, optimizados con gltf-transform en un paso de build. Instancias para objetos repetidos. Un solo mapa de sombras. Sin postprocesado en el MVP. Calidad adaptable (PerformanceMonitor de drei, factor de píxeles con mínimo). Presupuesto inicial SIN MEDIR: ~100 draw calls, ~50 mil triángulos, pocas decenas de MB de texturas en GPU. El prototipo visual actual tiene 51 draw calls y 4.800 triángulos.

## Móvil con Capacitor

Plugins mínimos: Preferences, App (pausa y reanudación), StatusBar (a confirmar que no pide permisos) y, si se decide, Screen Orientation. Prohibidos: analítica, ubicación, notificaciones, identificador publicitario, HTTP nativo de Capacitor. Android: único permiso `INTERNET`. `capacitor.config` declara `server.androidScheme` en `https` explícito; ese origen va en `CORS_ORIGINS`. Términos y política de privacidad dentro de la app, sin enlaces externos. Compilación de Android en Mac con Android Studio; depuración del WebView desde Chrome.

## Prueba de rendimiento (primera tarea de código)

Ver skill `perf-gate-3d`. Modo `?perf=1`, guion de 60 s, registra fps promedio y peor 1 %, tiempo de cuadro, draw calls, triángulos, memoria y tiempo hasta poder jugar; resumen en pantalla y JSON exportable; se mide en cada dispositivo de prueba, en navegador y en el WebView. Criterio propuesto: 30 fps sostenidos en el dispositivo más modesto con el peor 1 % no menor a 20 (a fijar con los dispositivos reales; faltan marca, versión de Android y memoria).
