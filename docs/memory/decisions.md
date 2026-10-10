# Registro de decisiones

Formato: fecha, decisión, motivo breve, dónde aplica. Lo más reciente va arriba. Estado "doc pendiente" = decidido pero el documento original de arquitectura o diseño todavía no lo refleja.

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
