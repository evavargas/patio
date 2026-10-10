# Patio

Juego educativo 3D para niños de 6 a 10 años (Uruguay, proyección LATAM) y panel web para moderadores y administradores. Objetivo: que el niño comprenda y resuelva mejor ciertos problemas. NO es maximizar tiempo de pantalla.

**Estado: documentación cerrada, SIN código todavía.** No empieces a programar hasta que la persona responsable lo pida. La primera tarea de código es la prueba de rendimiento 3D (skill `perf-gate-3d`).

Este archivo es el índice. El detalle vive en `docs/context/`. Lee solo lo que la tarea necesita.

## Dónde está cada cosa

| Necesitas | Lee |
| --- | --- |
| Qué es el producto, qué entra y qué no | `docs/context/00-vision-y-alcance.md` |
| Nombres de roles y glosario | `docs/context/01-nomenclatura.md` (importado abajo) |
| Mapa del sistema, módulos, dependencias | `docs/context/02-arquitectura-general.md` |
| API, auth, permisos, operaciones | `docs/context/03-backend.md` |
| Colecciones, índices, eliminaciones, respaldo | `docs/context/04-base-de-datos.md` |
| Juego, escena 3D, Capacitor | `docs/context/05-juego-frontend.md` |
| Panel | `docs/context/06-panel-frontend.md` |
| Contratos y tipado | `docs/context/07-contratos-y-tipado.md` |
| Temas, modo oscuro, accesibilidad | `docs/context/08-tema-y-accesibilidad.md` |
| Reglas de producto y bienestar infantil | `docs/context/09-juego-contenido-y-bienestar.md` |
| Servicios, despliegue, costos | `docs/context/10-infraestructura-y-despliegue.md` |
| Seguridad y privacidad | `docs/context/11-seguridad-y-privacidad.md` |
| Pruebas y definición de terminado | `docs/context/12-pruebas-y-calidad.md` |
| Qué debe seguir compatible entre piezas | `docs/context/13-compatibilidad-entre-sistemas.md` |
| Convenciones de código y nombres | `docs/context/14-convenciones-de-codigo.md` |
| Assets, fuentes, licencias | `docs/context/15-recursos-y-assets.md` |
| Decisiones, pendientes, preferencias | `docs/memory/` (empieza por `MEMORY.md`) |

Orden de autoridad si hay contradicción: `docs/memory/decisions.md` (lo más reciente) > `docs/context/` > documentos originales en `documentation/` (`Patio_arquitectura.docx`, `Patio_diseno_sistema_mvp.docx`, `Patio_investigacion.docx`). Si encuentras una contradicción, no adivines: avisa y propone cuál corregir.

@docs/context/01-nomenclatura.md

## Stack decidido (no cambiar sin una decisión registrada)

| Capa | Tecnología |
| --- | --- |
| Monorepo | pnpm workspaces (Turborepo solo si hace falta) |
| Juego | React + TypeScript + Vite, three.js con React Three Fiber, Rapier, Zustand, Tailwind, Capacitor (Android primero, iOS al final) |
| Panel | React + TypeScript + Vite, React Router, TanStack Query y Table, shadcn/ui + Tailwind, Recharts, dnd-kit |
| API | Node LTS, TypeScript, NestJS, un solo servicio modular |
| Base | MongoDB Atlas M0 (sin transacciones, sin backups propios) |
| Contratos | JSON Schema como fuente única de verdad (`packages/contracts`) |
| Hosting | Cloudflare Pages + Google Cloud Run + Atlas M0 (+ Oracle Always Free en V2) |
| Respaldo | GitHub Actions diario |
| Tiempo real (V2, no construir) | Colyseus |
| Plan B si falla el rendimiento 3D | Unity |

## Reglas que no se negocian

1. Nomenclatura: `player` / `moderator` / `administrator` en código, rutas, colecciones y documentos técnicos.
2. El servidor es la autoridad del tiempo, del nivel y de los permisos. El nivel NUNCA viaja al juego.
3. Los contratos JSON Schema mandan. No escribas a mano tipos de la API. Cambios de `/v1` solo aditivos.
4. Todo texto que ve el jugador se renderiza como texto plano. Nunca HTML.
5. Sin analítica, publicidad ni SDK de terceros. Sin CDN. Fuentes autoalojadas.
6. Ningún color, tamaño de letra, radio ni sombra dentro de un componente: salen de tokens del tema. Aplica a juego y panel, modo claro y oscuro.
7. Accesibilidad WCAG 2.2 AA. HTML semántico primero. Todo arrastre tiene alternativa de teclado.
8. Un moderador nunca ve datos de grupos ajenos. Todo pasa por el servicio de alcance.
9. Sin dependencias circulares entre módulos del back ni entre apps y paquetes. Los paquetes no importan de apps.
10. Nada del bucle de dibujo 3D toca el estado de React.
11. La hora sale de UNA función de reloj. Prohibido `Date.now()` o `new Date()` suelto.
12. Producto: sin rachas, sin rankings para el jugador, sin urgencia, sin notificaciones, sin penalidades, sin mostrar la solución, sin contar intentos. Ante la duda, usa `wellbeing-check`.
13. No agregues mecánicas, funciones de V2 ni abstracciones "por si acaso".

## Cómo trabajar

- Antes de implementar algo no trivial: di tus supuestos. Si hay contradicción o ambigüedad, detente y pregunta.
- Orden: contrato -> prueba -> implementación -> verificación en ejecución. Skills en `.claude/skills/`.
- Delega al agente adecuado de `.claude/agents/` (back, base, juego, panel, contratos, tema y accesibilidad, infra, pruebas, revisión, bienestar).
- Un cambio lógico por vez. Mantén el alcance: no refactorices ni borres lo que no te pidieron.
- Verifica antes de decir "listo": ejecuta pruebas, lint y tipos. Definición de terminado en `docs/context/12-pruebas-y-calidad.md`.
- Si tomaste una decisión de arquitectura o producto, regístrala con el skill `record-decision`.
- No hagas commit ni push salvo que te lo pidan.
- Dependencia nueva: justifica, revisa licencia y telemetría, y registra.

## Estilo de comunicación y escritura

- Responde en español rioplatense, sin asumir el género de la persona. Análisis y tablas en texto plano en el chat.
- NO crees HTML, dashboards ni artefactos visuales salvo pedido explícito.
- En documentos en español NO uses raya larga (em dash).
- Datos de la persona o del proyecto que no estén en estos documentos: pregunta, no inventes. Cifras sin medir llevan la marca "sin medir".

## Comandos

Todavía no existen (no hay código). Convención de scripts raíz que se creará al empezar: `pnpm dev:api`, `pnpm dev:game`, `pnpm dev:panel`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm contracts:generate`, `pnpm themes:check`, `pnpm build`. Cuando existan, actualiza esta sección.

## Mantenimiento de este harness

`CLAUDE.md` debe quedar bajo 200 líneas. Lo largo va a `docs/context/`. Reglas por ruta en `.claude/rules/`, agentes en `.claude/agents/`, skills en `.claude/skills/`. Guía de edición en `docs/harness/README.md`.
