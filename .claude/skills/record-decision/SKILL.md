---
name: record-decision
description: Registrar una decisión de producto o arquitectura en docs/memory/decisions.md y actualizar el archivo de contexto afectado, cerrando el pendiente correspondiente. Usarlo cada vez que se cierra una decisión.
argument-hint: "<decisión>"
---

# Registrar una decisión

1. Confirmá que es una decisión de la persona responsable (o una propuesta que ella aceptó). Una propuesta sin aceptar va a `docs/memory/open-questions.md`, no a `decisions.md`.
2. Agregá una entrada al principio de `docs/memory/decisions.md` bajo la fecha de hoy: la decisión en una o dos líneas, el motivo breve y dónde aplica. Si los documentos originales (`documentation/*.docx`) todavía no la reflejan, agregá "Estado: doc pendiente".
3. Actualizá el archivo de `docs/context/` afectado en el mismo cambio. Si la decisión cambia una regla que no se negocia, actualizá también `CLAUDE.md`.
4. Si cierra un pendiente de `docs/memory/open-questions.md`, quitalo de ahí. Si abre un pendiente nuevo, agregalo con qué bloquea.
5. Si contradice una decisión anterior, no borres la anterior: anotá "reemplaza a" con la fecha.
6. Nomenclatura `player`/`moderator`/`administrator` y sin raya larga.

Entrega: las líneas agregadas y los archivos modificados.
