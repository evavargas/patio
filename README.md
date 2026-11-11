# Patio

Juego educativo 3D para niños de 6 a 11 años (Uruguay, con proyección a Latinoamérica) y un panel web para moderadores y administradores.

El objetivo es que el niño comprenda y resuelva mejor ciertos problemas, **no** maximizar el tiempo de pantalla.

## Estado

En desarrollo, en etapa temprana. La documentación del producto y la arquitectura está cerrada; el primer paso de código es una prueba de rendimiento del juego 3D antes de construir el resto.

## Qué incluye

- **Juego 3D** para jugadores (`player`), pensado para funcionar bien en dispositivos modestos.
- **Panel web** para moderadores (`moderator`) y administradores (`administrator`).
- **Principios de producto:** sin analítica, publicidad ni SDK de terceros; accesibilidad WCAG 2.2 AA; el texto del jugador siempre se trata como texto plano.

## Cómo está organizado el proyecto

Todo el contexto vive en [`docs/context`](docs/context): visión y alcance, arquitectura, backend, base de datos, juego, panel, contratos, tema y accesibilidad, seguridad y privacidad, pruebas e infraestructura. Las decisiones y pendientes están en [`docs/memory`](docs/memory).

## Cómo lo construyo con IA

El proyecto está preparado para trabajar con agentes de IA (Claude Code): [CLAUDE.md](CLAUDE.md) es el índice del contexto, y las decisiones se registran por escrito para que cualquier agente, o persona, pueda retomar el trabajo sin perder criterio.
