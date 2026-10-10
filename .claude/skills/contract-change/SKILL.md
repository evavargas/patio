---
name: contract-change
description: Cambiar un contrato en packages/contracts (JSON Schema de desafíos, mecánicas, días, reglas, respuestas de la API, códigos de error) sin romper el back, el juego ni las apps instaladas.
argument-hint: "<qué contrato y qué cambio>"
---

# Cambio de contrato

Contexto: `docs/context/07-contratos-y-tipado.md` y `13-compatibilidad-entre-sistemas.md`.

## Decidir el tipo de cambio

- Aditivo (campo nuevo opcional, valor nuevo tolerado): permitido en `/v1`.
- Incompatible (quitar, renombrar, cambiar tipo o hacer obligatorio un campo existente): NO se hace en `/v1`. Si es de una mecánica, sube `schemaVersion` y las apps viejas muestran el aviso amable. Si es de la API, consultá al `architect` y registrá la decisión.

## Pasos (en este orden)

1. Describí el cambio y a quién afecta (API, juego, panel, apps ya instaladas).
2. Editá el JSON Schema en `packages/contracts`.
3. Regenerá tipos y validadores (`pnpm contracts:generate`). No edites lo generado.
4. Agregá o actualizá ejemplos válidos de las tres mecánicas si corresponde, y un ejemplo inválido por cada regla nueva.
5. Pruebas de contrato: los ejemplos validan en API, juego y panel.
6. Recién ahora: API (validación y servicio), `api-client`, apps.
7. Confirmá que `level` no aparece en ninguna respuesta de `/v1`.
8. Si cambia una forma persistida, aplicá también `new-mongo-collection` o el plan expand/contract.
9. Actualizá `docs/context/07-contratos-y-tipado.md` si cambia una regla y registrá con `record-decision` lo que sea una decisión.

## Verificación

Tipos y lint sin errores, pruebas de contrato en verde, y un pedido real de una versión vieja del cliente contra el schema nuevo sigue funcionando.
