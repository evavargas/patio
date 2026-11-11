# Registro de decisiones

Formato: fecha, decisión, motivo breve, dónde aplica. Lo más reciente va arriba. Estado "doc pendiente" = decidido pero el documento original de arquitectura o diseño todavía no lo refleja.

## Prototipo visual (Stitch)

Detalle en `docs/design/prototipo-pantallas.md`. Sin fecha a pedido de la persona responsable.

- Al terminar el día el player camina libre por el patio: sin límite de tiempo forzado, sin salida forzada, juguetes apagados y sin interacción, mensaje amable de que puede seguir practicando la próxima vez, sin chip de hora. Motivo: no hay interacción nueva y forzar el cierre es contraproducente. Aplica: `09-juego-contenido-y-bienestar.md`, `05-juego-frontend.md`.
- Salir de un desafío sin responder solo lo cierra: no cambia el estado ni los logros y se puede reabrir.
- El perfil incluye tema, sonido, idioma y botón "ver tutorial". El juego tiene tutorial de primera vez, pantalla de carga y patio con juguetes apagados.
- Los moderators son invitados por correo; la pantalla de registro del panel es "aceptar invitación".
- El panel reutiliza paleta y fuente del juego (sistema de diseño "Patio Uruguayo Sunset", Lexend) en un proyecto de Stitch aparte. Los textos del prototipo son provisorios y los revisa la persona responsable.
- La invitación por correo a moderators entra al MVP y usa Gmail SMTP. Sustituye el "después del MVP" anterior. Es la excepción a "sin correo" de `02-arquitectura-general.md`.
- El panel muestra rankings y nivel de los players a moderators y administrators. El juego no los muestra al player. Se mantiene lo de `06-panel-frontend.md`.
- El juego Y el panel usan i18n (librería de internacionalización) para escalar. Idiomas: español `es-UY` (por defecto) e inglés. Selector de idioma en el perfil del juego y en el menú de la cuenta del panel. Sustituye "catálogo propio sin librería de i18n" y "panel todo en español". Falta elegir la librería.
- Gmail SMTP queda confirmado para el correo de invitación. La contraseña de aplicación de 16 caracteres va solo en `.env` (ignorado por git) y en los secretos del despliegue. `.env.example` lleva solo nombres de variables con valores vacíos, nunca el valor real.
- La pantalla "Moderación y Actividad" del panel en Stitch se borra y no se implementa (muestra datos por player y marcas de hora que no se pidieron).
- Los tamaños en dp de la referencia mobile y las medidas del panel son PROPUESTAS, no decisiones.

## 2026-10-06 (últimas respuestas)

- El JUGADOR puede elegir entre temas (además del modo). Motivo: necesidad de personalización que no interfiere con el plan pedagógico. Aplica: `08-tema-y-accesibilidad.md`. Estado: doc pendiente (arquitectura 19.5 y pendientes decían "solo modo").
- La escena 3D NO cambia con el modo oscuro ni con el tema. Estado: doc pendiente de cierre.
- Entrada alternativa a caminar (lista de desafíos como botones): FUERA de alcance, no se persigue. Estado: doc pendiente (arquitectura 19.6 y sección 24).
- Estilos del juego: Tailwind, con el mismo preset de tokens que el panel. Estado: doc pendiente de cierre.
- Fuentes tipográficas: autoalojadas, sin CDN. La familia y su licencia siguen pendientes.
- Se arma el harness de desarrollo (este material). No se desarrolla todavía.

## 2026-10-06 (tema y accesibilidad)

- Tema configurable como archivos de datos con modo claro y oscuro, en `packages/theme`, para juego y panel. Modo `light`/`dark`/`system` con escucha de `prefers-color-scheme`. Accesibilidad WCAG 2.2 AA con ARIA solo si hace falta.
- Persistencia de tema y modo en el dispositivo (no en el servidor en el MVP).

## 2026-10-06 (back y estructura)

- Un solo repositorio privado, monorepo con pnpm workspaces.
- Nomenclatura técnica unificada: `player` / `moderator` / `administrator` (ver `01-nomenclatura.md`). Renombres: `users` -> `accounts`, `admin` -> `panel`, `moderation` -> `word-filter`.
- Módulos sin ciclos: `membership` une `players` y `groups`; `groups` no conoce a `players`; `auth` es independiente y puro (sin base); `accounts` solo para cuentas del panel e independiente de `players`.
- El administrador puede eliminar jugadores, grupos, sets y moderadores, de forma definitiva y con confirmación. No puede eliminarse a sí mismo ni al último administrador activo. Sin papelera.
- El jugador no puede cambiar de grupo: solo unirse si no tiene. Moderadores y administrador lo mueven.
- Un desafío repetido suma puntos como cualquier otro, una vez por set por jugador (índice único {playerId, daySetId, challengeId}). Se eliminó el campo `counted`.
- Tolerancia de medianoche: 30 minutos por defecto, editable por el administrador (en `rules`).
- Límite de registro por IP: 20 por hora, con cantidad y ventana configurables desde el panel (`settings.limits`).
- Lista de palabras prohibidas: la agrega y quita el administrador desde el panel en cualquier momento. Arranca vacía.
- Respaldo: automático con GitHub Actions. Dónde guardarlo sigue abierto.
- CORS y Capacitor: lista exacta `CORS_ORIGINS`, `server.androidScheme: "https"` explícito, sin HTTP nativo de Capacitor. Confirmar en dispositivo real.

## Decisiones anteriores (resumen)

- Sin modo offline. Sin consentimiento parental: solo casilla de términos. ID aleatorio generado por la app, apodo libre con filtro, guardado en el servidor.
- Código de grupo opcional; el jugador entra directo sin aprobación. Todos empiezan en nivel 0. El jugador no ve el nivel.
- Resultados solo "logrado" o "no logrado". Tres mecánicas cerradas: arrastrar objetos, entrada numérica, arrastrar palabras.
- Movimiento libre con salto en el patio 3D al atardecer. Juguetes aleatorios por desafío. Android primero, iOS al final. V2: compañeros en vivo (Colyseus, Oracle).
- Stack: React + TypeScript + Vite, three.js con React Three Fiber, Rapier, Capacitor, NestJS, MongoDB Atlas M0, shadcn/ui, JSON Schema como contrato.
- Hosting gratuito: Cloudflare Pages + Cloud Run + Atlas M0 (+ Oracle en V2). Plan B de motor: Unity si falla la prueba de rendimiento 3D.
- Métricas por cierre diario perezoso: sin tiempo real, sin servicio externo para métricas, sin tarea programada para métricas.
- Límite por IP. Día de 24 h con cierre 00:00 America/Montevideo. Tokens, no cookies (sin dominio propio). Rankings visibles para moderador y administrador. Porcentaje de aprobación = jugadores del grupo que completaron el desafío sobre los miembros del grupo.
