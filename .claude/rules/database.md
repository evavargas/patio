---
paths:
  - "apps/api/**/*.repository.ts"
  - "apps/api/**/migrations/**"
  - "apps/api/**/seed/**"
---

# Reglas de base de datos

Contexto: `docs/context/04-base-de-datos.md`.

- Nombres de colecciones y campos en `camelCase`, colecciones en plural. Los nombres vigentes están en la tabla de `04-base-de-datos.md`.
- Todo índice único o TTL que la lógica necesita se crea desde código de arranque, no a mano en Atlas.
- Cada consulta nueva declara el índice que la sostiene. Sin índice no se entrega.
- No hay transacciones (no verificadas en Atlas M0). Orden de escritura documentado. Operaciones idempotentes.
- `results`: nunca borres ni edites un resultado salvo en el flujo de eliminación del administrador. Puntaje, conteos y nivel son derivados y recalculables.
- Un cambio de grupo escribe primero `groupMemberships` y después `players.groupId`.
- Instantes en `Date` UTC. Claves de día como string `YYYY-MM-DD` en la zona del set.
- Los repositorios devuelven solo lo que el servicio necesita (proyecciones), nunca documentos enteros con hashes.
- Ningún repositorio devuelve datos de grupos fuera del filtro recibido del servicio de alcance.
- Un cambio de forma de datos con datos existentes sigue expand/contract: agregar, migrar, leer ambos, quitar. Documenta el plan y el respaldo previo.
