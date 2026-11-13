# Contratos y tipado

`packages/contracts` es la ÚNICA fuente de verdad. La API valida con ellos, el juego y el panel leen con ellos, y de ellos salen los tipos. Nadie escribe a mano un tipo que describa una forma de la API.

## Qué contiene

- JSON Schema (draft 2020-12 propuesto) de: desafíos, las tres mecánicas con su `config`, días y sets, reglas, límites, palabras prohibidas, jugadores, cuentas, resultados y respuestas de la API, y el cuerpo de error `{ code, message, details }`.
- Tipos TypeScript GENERADOS desde los schemas (no editar a mano los archivos generados).
- Validadores en tiempo de ejecución (Ajv propuesto) para los bordes: cuerpo de cada pedido HTTP en la API, respuesta en el cliente, formularios del panel.
- Ejemplos válidos de cada mecánica. Esos ejemplos se validan en las pruebas del juego, del panel y de la API (prueba de contrato).
- Registro de player (`schemas/player.schema.json`): `RegisterPlayerRequest` { `nickname` 1 a 64 en el schema (el máximo de 20 lo aplica el servidor con `NICKNAME_NOT_ALLOWED`), `termsVersion` `^[A-Za-z0-9._-]{1,32}$`, `groupCode?` }, y `RegisterPlayerResponse` { `playerId`, `token` (32 bytes en base64url, 43 caracteres), `recoveryCode` (8) }. Primitivos nuevos: `GroupCode` (6), `RecoveryCode` (8), `PlayerToken`, del mismo alfabeto de 31 símbolos. Sin nivel. Validadores `isRegisterPlayerRequest` / `isRegisterPlayerResponse`; ejemplos en `examples/requests` y `examples/responses`. Los objetos toleran campos nuevos.
- Recuperar y perfil (`schemas/player.schema.json`): `RecoverPlayerRequest` { `recoveryCode` (8) }, `RecoverPlayerResponse` { `playerId`, `token` (nuevo), `nickname` } y `MeResponse` { `nickname`, `score` entero >= 0 }. Validadores `isRecoverPlayerRequest`, `isRecoverPlayerResponse`, `isMeResponse` e `isPlayerToken`. Ejemplos con prefijo `recover-player` y `me` en `examples/`. Sin nivel, sin hashes, sin código en ninguna respuesta.
- Día y logros (`schemas/day.schema.json`, `schemas/result.schema.json`): `DayResponse` { `serverTime`, `date`, `dayEndsAt`, `status` (`available`|`noSet`), `items[]` (`DayItem`: `challengeId`, `text`, `mechanic`, `difficulty`, `assets`, `points?`, `family?`), `completedChallengeIds[]`, `score` }; `SubmitResultRequest` { `eventId` (`EventId`, UUID), `date`, `challengeId`, `durationMs` 0 a 86400000 }; `SubmitResultResponse` { `score`, `pointsEarned` }. Validadores `isDayResponse`, `isSubmitResultRequest`, `isSubmitResultResponse`, `isChallengeId`. Sin nivel, sin grupo, sin ID del set, sin intentos ni solución. Forma propuesta (aditiva a futuro).
- Panel completo (`schemas/panel.schema.json`, 2026-11-12, propuesta de forma; un ejemplo válido por forma en `examples/panel/`, validado por una prueba que recorre `panelValidators`): grupos (`PanelGroup`, `CreateGroupRequest`, `UpdateGroupRequest`), players (`PanelPlayer` CON `level`, `PanelPlayerList`, `PanelPlayerDetail`, `MovePlayerRequest`, `MovePlayersRequest`/`Response`, `UpdateNicknameRequest`, `ReissueRecoveryResponse`), desafíos (`PanelChallenge` { `id`, `authorId`, `status`, `version`, `challenge` (el schema `Challenge`) }, `PanelChallengeList`), sets (`PanelDaySet`, `SaveDaySetRequest`), `PanelRules`, `PanelLimits`, `PanelBannedWords`, `UpdateBannedWordsRequest`, cuentas (`AccountSummary`, `CreateModeratorRequest`, `UpdateAccountRequest`, `ResetPasswordRequest`, `InviteModeratorRequest`, `InvitationResponse`, `AcceptInvitationRequest`), `DeletionImpact` y `Stats*`. El nivel aparece solo acá (la prueba de "ningún schema menciona level" excluye este archivo). Sin `maxItems` en arrays: el generador los vuelve tuplas; el tope de 50 de `POST /players/move` lo aplica el servidor. Códigos de error nuevos: `CONFIRMATION_REQUIRED`, `INVITATION_INVALID`.
- Panel, autenticación (`schemas/account.schema.json`, propuesta de forma): `LoginRequest` { `email`, `password` 1 a 128 }, `RefreshRequest` y `LogoutRequest` { `refreshToken` (43 caracteres base64url) }, `ChangePasswordRequest` { `currentPassword`, `newPassword` 15 a 128 }, `PanelSession` { `accessToken` (JWT), `refreshToken`, `expiresAt`, `account` } (respuesta de login, refresh y cambio de contraseña; logout responde 204), `PanelAccount` { `id`, `email`, `role`, `mustChangePassword` } (respuesta de `GET /auth/me`) y `AccountRecord` (el documento `accounts`, solo para pruebas y documentación: nunca sale por la API). Validadores `isLoginRequest`, `isRefreshRequest`, `isLogoutRequest`, `isChangePasswordRequest`, `isPanelSession`, `isPanelAccount`, `isAccountRecord`, `isAccountId`, `isEmail`. Ejemplos con prefijo `panel-` en `examples/requests` y `examples/responses`, y `examples/records`. Ninguna respuesta lleva hashes ni nivel. No reutilizan ningún DTO de `/v1`.
- Catálogo de códigos de error de dominio, como unión de literales (29 al 2026-11-11, en `schemas/error.schema.json`; solo se agregan).
- `wordDrop.config`: `template` con huecos `{id}`, `blanks[{id, correct}]` y `words[]` (banco con distractores). `dragDrop` implementa `equalShare` y `targetCounts`; clasificación por categoría y orden faltan (aditivo). La respuesta correcta viaja en `config` y el juego no la consume ni la muestra.

## Mecánicas (conjunto cerrado)

`MechanicType` = `dragDrop` | `numberInput` | `wordDrop`. Unión discriminada por `type`. Cada una tiene `schemaVersion` y `config` propio, que incluye la regla de logro.

```json
{ "text": "Ayúdame a repartir estas 20 manzanas en las 4 bolsas.",
  "mechanic": { "type": "dragDrop", "schemaVersion": 1,
    "config": { "items": { "assetId": "manzana", "count": 20 },
                "containers": { "assetId": "bolsa", "count": 4 },
                "rule": { "type": "equalShare" } } },
  "difficulty": 2 }
{ "text": "¿Qué número falta?",
  "mechanic": { "type": "numberInput", "schemaVersion": 1,
    "config": { "expression": "7 + {a} = 12", "fields": [ { "id": "a", "expected": 5 } ] } },
  "difficulty": 1 }
```

Reglas de logro: `dragDrop` = reparto parejo, cantidades objetivo, clasificación por categoría u orden. `numberInput` = valor esperado por campo. `wordDrop` = palabra correcta por hueco.

## Cambiar un contrato (proceso)

1. Los cambios de `/v1` son SOLO aditivos (campos nuevos opcionales). Nunca quitar, renombrar ni cambiar el tipo de un campo existente.
2. Un cambio incompatible en una mecánica sube su `schemaVersion`. Las apps viejas muestran el aviso amable de actualizar; el back debe seguir sirviendo a las versiones instaladas.
3. Actualizar schema -> regenerar tipos -> actualizar ejemplos -> pruebas de contrato -> recién después API, cliente y apps.
4. Skill: `contract-change`.

## Reglas de tipado en TypeScript

- `strict` activado, más `noUncheckedIndexedAccess` y `noImplicitOverride`. Sin `any` (usar `unknown` y validar en el borde). Sin aserciones `!` ni `as` para saltar la validación.
- IDs con tipos de marca (`PlayerId`, `GroupId`, `ChallengeId`, `DaySetId`, `AccountId`) para no mezclarlos. Propuesta del harness: definirlos en `contracts`.
- Sin `enum` de TypeScript: uniones de literales de string que salen del schema.
- Uniones discriminadas para mecánicas y para estados de pantalla del juego.
- Fechas: instante = `Date` en el back y string ISO 8601 en el cable; día = string `YYYY-MM-DD` (tipo de marca `DayKey`).
- Duraciones con sufijo `Ms`. Puntos y conteos son enteros no negativos.
- El nivel NO existe en ningún tipo de respuesta del juego.
- Tipos de respuesta del juego y del panel son distintos (nunca reutilizar un DTO del panel en `/v1`).
