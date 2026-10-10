# Pruebas y calidad

## Back

| Nivel | Qué cubre |
| --- | --- |
| Unitarias | Cálculo de nivel (incluidos saltos de varios niveles), normalización y comparación de apodos, resolución del set (precedencia y congelado), tolerancia de medianoche, generación y validación de códigos. |
| Integración | Con MongoDB en memoria: índices únicos, idempotencia de resultados, bloqueo de sets, cierre diario perezoso y su desactualización, efecto de cada eliminación. |
| Permisos | La matriz de permisos por cada ruta: administrator, moderator dueño, moderator ajeno y player. Ningún moderador accede a datos de grupos ajenos y solo el administrador elimina. |
| Contratos | Ejemplos de las tres mecánicas validan contra los JSON Schema compartidos. |
| Carga | Herramienta de carga contra un despliegue de prueba, con 50 y 500 jugadores simultáneos. La herramienta concreta está sin elegir. |

## Front

| Nivel | Qué cubre |
| --- | --- |
| Unitarias | Generador con semilla (misma posición para el mismo jugador y fecha), diferencia de reloj, cola de reintentos, evaluación de la regla de cada mecánica, normalización de apodos en el cliente. |
| Componentes | Las tres mecánicas con Vitest y Testing Library, incluida la interacción de arrastre con puntero. |
| Panel extremo a extremo | Playwright contra la API local: login, permisos por rol, mover un jugador por arrastre y por menú, crear y publicar un set. |
| Contratos | Los ejemplos de `packages/contracts` validan en juego, panel y API. |
| Tema y accesibilidad | Validador de contraste de todos los temas, axe-core en claro y oscuro, pasada manual con teclado y TalkBack. |
| Dispositivo | Prueba de rendimiento y pasada manual por los flujos del jugador en cada dispositivo, en navegador y en el WebView. |

## Herramientas propuestas (ajustables)

Vitest (unidad y componentes), Testing Library, Playwright (extremo a extremo y axe), `mongodb-memory-server` (integración), eslint con `jsx-a11y`, prettier. Tipos con `tsc --noEmit` en CI.

## Definición de terminado (aplica a TODO cambio)

1. Pruebas nuevas o actualizadas, todas pasan.
2. Lint y tipos sin errores. Sin `any`.
3. Contratos regenerados y sin diferencias si el cambio los toca.
4. Nomenclatura `player/moderator/administrator` respetada (revisión con skill `nomenclature-check`).
5. Si toca interfaz: sin colores o tamaños sueltos, axe en claro y oscuro, foco y teclado verificados.
6. Si toca permisos: pruebas de la matriz actualizadas.
7. Si toca datos: índices y efectos de eliminación revisados.
8. Si toca un flujo del jugador: revisado contra `09-juego-contenido-y-bienestar.md`.
9. Documentación y `docs/memory/decisions.md` actualizados si hubo una decisión.
10. Verificado en ejecución (no solo "debería funcionar").

## Reglas de pruebas

- El reloj se inyecta: NADIE usa `Date.now()` ni `new Date()` fuera de la función de reloj de `platform` (back) o del reloj del servidor (juego).
- Funciones puras primero. Probar la regla antes de implementar el endpoint.
- Una prueba que falla se arregla o se elimina con justificación. Nunca se deja saltada.
