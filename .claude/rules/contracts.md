---
paths:
  - "packages/contracts/**"
  - "packages/api-client/**"
  - "packages/challenges/**"
---

# Reglas de contratos y paquetes compartidos

Contexto: `docs/context/07-contratos-y-tipado.md`, `13-compatibilidad-entre-sistemas.md`.

- `packages/contracts` es la ÚNICA fuente de verdad. Los archivos de tipos generados no se editan a mano.
- Cambios de `/v1` solo aditivos. Nada de quitar, renombrar ni cambiar el tipo de un campo existente.
- Un cambio incompatible en una mecánica sube su `schemaVersion`.
- Cada mecánica tiene ejemplos válidos que se validan en las pruebas de juego, panel y API.
- `challenges` y `api-client` dependen de `contracts`. Ningún paquete importa de `apps/`.
- `challenges` debe funcionar dentro del juego y en la vista previa del panel con el mismo componente. Devuelve un único evento: lo logré. No muestra solución ni cuenta intentos.
- Textos de desafíos siempre como texto plano.
- `api-client`: una función tipada por endpoint, errores con los códigos de dominio, renovación única de token en el panel.
- Ningún tipo de respuesta de `/v1` incluye `level`.
- Proceso completo: skill `contract-change`.
