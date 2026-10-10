# AGENTS.md

Este repositorio usa `CLAUDE.md` como archivo de contexto principal. Si tu herramienta lee `AGENTS.md`, lee primero `CLAUDE.md` y `docs/context/`.

Resumen mínimo:

- Proyecto: Patio, juego educativo 3D para niños de 6 a 10 años + panel web. Fase de documentación, sin código todavía.
- Roles: `player`, `moderator`, `administrator`, siempre con esos nombres en código y documentos técnicos.
- Contratos JSON Schema como fuente única de verdad. API `/v1` solo aditiva.
- Sin analítica, publicidad, SDK ni CDN de terceros. Texto del jugador siempre como texto plano.
- Tokens de tema para todo estilo. Accesibilidad WCAG 2.2 AA.
- No hacer commit ni push sin pedido explícito.
