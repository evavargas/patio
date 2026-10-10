# Convenciones de código

Estado: PROPUESTAS del harness, derivadas de las decisiones de arquitectura. No salen textualmente de los documentos de diseño y arquitectura salvo donde se indique. Son tuyas: edítalas y las reglas, agentes y skills las siguen.

## Idioma

| Qué | Idioma |
| --- | --- |
| Identificadores (variables, funciones, tipos, colecciones, rutas, valores, claves de JSON, errores) | Inglés, con los tres roles `player` / `moderator` / `administrator` |
| Documentación, ADR, memoria del proyecto | Español, sin raya larga (em dash) |
| Texto de interfaz (juego y panel) | Español `es-UY`, siempre desde el catálogo de textos, nunca dentro de un componente |
| Comentarios de código | Pocos. Español o inglés, solo para explicar el POR QUÉ. Nada de comentarios que repiten el código |
| Commits y ramas | Inglés, Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`), alcance por paquete (`feat(api): ...`) |

## Nombres

| Elemento | Convención | Ejemplo |
| --- | --- | --- |
| Archivos y carpetas | `kebab-case` | `day-sets`, `word-filter`, `results.service.ts` |
| Componentes React | `PascalCase` (archivo y export) | `ChallengeScreen.tsx` |
| Hooks | `useCamelCase` | `useTheme`, `useServerClock` |
| Tipos e interfaces | `PascalCase`, sin prefijo `I` | `DaySet`, `PlayerId` |
| Variables y funciones | `camelCase` | `resolveDaySet` |
| Constantes de módulo | `UPPER_SNAKE_CASE` | `RECOVERY_CODE_LENGTH` |
| Colecciones y campos de Mongo | `camelCase`, plural para colecciones | `groupMemberships`, `lastActiveAt` |
| Rutas HTTP | `kebab-case`, sustantivos en plural | `/v1/panel/day-sets` |
| Códigos de error de dominio | `UPPER_SNAKE_CASE` estables | `GROUP_FULL` |
| Variables de entorno | `UPPER_SNAKE_CASE`; las del front con `VITE_` | `CORS_ORIGINS` |
| Paquetes del workspace | `@patio/<nombre>` | `@patio/contracts` |
| Archivos de NestJS | `<nombre>.<rol>.ts` con rol `module`, `controller`, `service`, `repository`, `guard` | `players.repository.ts` |
| Pruebas | `*.test.ts` junto al archivo; extremo a extremo en `tests/e2e/*.e2e.ts` | `level.test.ts` |
| Booleanos | prefijo `is`, `has`, `can` | `isLocked` |
| Duraciones | sufijo `Ms` | `durationMs` |
| Fechas | instante `...At`; día `...Date` o `DayKey` | `lockedAt`, `date` |
| Temas | archivo `themes/<id>.json`, `id` en `kebab-case` | `default.json` |

## TypeScript

Ver `07-contratos-y-tipado.md`: `strict`, `noUncheckedIndexedAccess`, sin `any`, sin `enum`, IDs de marca, tipos generados desde los schemas. Además: módulos ES, un solo `tsconfig` base en `packages/config` que todos extienden, importaciones con alias de workspace (`@patio/*`), sin imports relativos que crucen paquetes.

## Calidad automática

- ESLint (con `eslint-plugin-jsx-a11y` en las apps) y Prettier, configuración en `packages/config`.
- Regla de límites de importación (por ejemplo `eslint-plugin-boundaries` o `dependency-cruiser`, a elegir): hace cumplir las dependencias entre módulos del back y entre apps y paquetes.
- Prohibido por lint: `any`, `dangerouslySetInnerHTML`, colores literales (`#fff`, `rgb(`, nombres de color) y `px` de tamaños de letra en componentes, `console.log` en el back (usar el logger), `Date.now()` y `new Date()` fuera del reloj.

## Dependencias

Solo las decididas en los documentos. Agregar una nueva exige: justificación, licencia compatible, revisión de telemetría y tamaño (en el juego, cada KB cuenta), y una línea en `docs/memory/decisions.md`. Versiones exactas fijadas, lockfile en el repo. Verificar en la documentación oficial al elegir versiones: no asumir APIs de memoria.

## Git

Repo privado, rama principal `main`, ramas cortas, un cambio lógico por commit, commits que compilan y pasan pruebas. Nada de secretos, `.env`, keystores ni respaldos en el repo. Quien dirige el proyecto decide cuándo se hace commit y push: los agentes no empujan.

## Errores y respuestas del back

Siempre `{ code, message, details }`. `message` no incluye datos personales. Cada error de dominio tiene un código estable en `contracts`. Los códigos de estado HTTP siguen la semántica habitual (400 validación, 401 autenticación, 403 `FORBIDDEN_SCOPE`/permiso, 404, 409 conflicto como `SET_LOCKED`, 429 límite, 5xx).
