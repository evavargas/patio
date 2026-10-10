# Compatibilidad entre sistemas

Qué debe seguir siendo cierto entre piezas para que nada se rompa. Cada fila es una promesa que una prueba o una revisión debe poder verificar.

## Quién habla con quién

| Origen | Destino | Canal | Contrato |
| --- | --- | --- | --- |
| `apps/game` | `apps/api` `/v1` | HTTPS, JSON, `Authorization: Bearer <token del jugador>` | `contracts` via `api-client` |
| `apps/panel` | `apps/api` `/v1/panel` | HTTPS, JSON, `Authorization: Bearer <access token>` | `contracts` via `api-client` |
| `apps/api` | MongoDB Atlas | Driver oficial, pool de 10 | repositorios por módulo |
| GitHub Actions | MongoDB Atlas | `mongodump` con cuenta de solo lectura | n/a |
| `apps/realtime` (V2) | `apps/api` / Mongo | por definir | por definir |

No hay otro tráfico saliente. En particular: nada a analítica, CDN de fuentes, mapas, fuentes de tipografía ni servicios de terceros.

## Compatibilidad hacia atrás

- `/v1` solo cambia agregando. Una app instalada de una tienda NO se puede forzar a actualizar.
- Cada desafío lleva `schemaVersion`. App vieja + desafío con versión nueva = aviso amable y juguete sin abrir, nunca un error.
- Los sets publicados guardan copia de los desafíos (`items`): editar un desafío no rompe sets ya abiertos.
- El juego descarga la lista de palabras prohibidas con versión; el servidor siempre repite la validación.
- Cambios de reglas (puntos, niveles) afectan logros nuevos, no reescriben el pasado. Para reescribir existe el comando de recálculo.

## Alineación de versiones y herramientas

- UNA versión de TypeScript, de Node LTS y de pnpm para todo el monorepo (fijadas en `packages/config` y en `engines`/`packageManager`). Fijar versiones exactas al empezar el código.
- Un solo React y un solo `three` en el árbol (versiones únicas con `pnpm.overrides` si hace falta).
- `@react-three/fiber`, `@react-three/drei`, `@react-three/rapier` y `three` deben ser mutuamente compatibles: verificarlo con la documentación al elegir versiones, no asumir.
- `packages/challenges` lo usan juego y panel: debe funcionar dentro del canvas del juego y en una vista previa normal de DOM. Mismos componentes, mismo comportamiento.
- Mismo preset de Tailwind y mismo formato de tema en juego y panel.

## Tiempo

El servidor es la única autoridad. Fecha del día = una función en `platform`, zona `America/Montevideo` por defecto, configurable. El cliente solo calcula la diferencia con el reloj del servidor y cuenta con ella. Claves de día = `YYYY-MM-DD` en esa zona. Al cambiar la zona horaria, los días ya cerrados no se recalculan (cada `daySet` guarda su `timezone`).

## CORS y orígenes

`CORS_ORIGINS` = lista exacta: panel, juego web, desarrollo local, `https://localhost` (Capacitor Android con `server.androidScheme: "https"` declarado explícito) y `capacitor://localhost` (iOS). Sin comodín. Permitir `Authorization` y `Content-Type`. `OPTIONS` sin tocar la base, con `Access-Control-Max-Age`. No usar el HTTP nativo de Capacitor. Confirmar el origen real en un dispositivo (pendiente). Atención: el documento de arquitectura menciona `ALLOWED_ORIGINS` y `CORS_ORIGINS`; el nombre vigente es `CORS_ORIGINS` (ver `docs/memory/open-questions.md`).

## Almacenamiento en el cliente

Una única abstracción de almacenamiento (`localStorage` en web, Preferences de Capacitor en móvil) usada por sesión y por preferencias de tema. El panel usa `localStorage`.

## Tabla de coherencia de nombres entre capas

| Concepto | Cable (JSON) | Mongo | Código | Español |
| --- | --- | --- | --- | --- |
| jugador | `player` | `players` | `Player`, `PlayerId` | jugador |
| moderador | `moderator` | `accounts.role` | `Role` | moderador |
| administrador | `administrator` | `accounts.role` | `Role` | administrador |
| set del día | `daySet` | `daySets` | `DaySet` | set del día |
| acceso | `dayAccess` | `dayAccess` | `DayAccess` | acceso |
| logro | `result` | `results` | `Result` | logro |
| pertenencia | `membership` | `groupMemberships` | `GroupMembership` | pertenencia |

## Compatibilidad con la V2

El MVP no implementa nada de V2, pero no debe impedirla: `groupId` y `GroupMembership` ya existen, el apodo ya se guarda en el servidor, el límite de 50 por grupo ya existe. No agregar abstracciones "para V2".

## Plan B de motor

Si la prueba de rendimiento falla y se pasa a Unity: se mantienen API, contratos, base y panel; se reimplementan escena y mecánicas del juego. Por eso la lógica de dominio (nivel, puntos, resolución del set) vive en el servidor y en `contracts`, no en la escena.
