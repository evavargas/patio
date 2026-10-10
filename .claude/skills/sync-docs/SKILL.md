---
name: sync-docs
description: Detectar y reportar desajustes entre docs/context, docs/memory/decisions.md, los documentos originales en documentation/ y el código, y proponer las correcciones. Usarlo al terminar una etapa o antes de una revisión.
---

# Sincronizar documentación

1. Leé las entradas recientes de `docs/memory/decisions.md` y la sección "Documentos originales desactualizados" de `docs/memory/open-questions.md`.
2. Compará cada decisión con `docs/context/` y con `CLAUDE.md`. Un desajuste es una decisión que un archivo de contexto no refleja o contradice.
3. Compará `docs/context/` con el código existente (módulos, rutas, colecciones, índices, tokens). Marcá lo que el código hace distinto de lo documentado: decidí con la persona responsable cuál corregir.
4. Compará con `documentation/*.docx` solo si la persona lo pide: los .docx no se editan desde acá. Listá las correcciones que habría que hacer en ellos.
5. Verificá `CLAUDE.md` bajo 200 líneas, enlaces de la tabla "Dónde está cada cosa" válidos y la sección "Comandos" al día.
6. Verificá la nomenclatura (`nomenclature-check`).

Entrega: lista de desajustes con archivo, qué dice cada fuente y la corrección propuesta. No cambies decisiones por tu cuenta: proponé.
