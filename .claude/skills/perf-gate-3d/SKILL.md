---
name: perf-gate-3d
description: Construir y ejecutar la prueba de rendimiento del patio 3D (modo ?perf=1), que decide si el stack web con Capacitor se mantiene o se pasa a Unity. Primera tarea de código del proyecto.
---

# Prueba de rendimiento del patio 3D

Es el punto de decisión del stack. Se hace antes de construir el resto del juego. Contexto: `docs/context/05-juego-frontend.md` (sección "Prueba de rendimiento") y `00-vision-y-alcance.md`.

## Antes de empezar

1. Pedí los dispositivos de prueba: marca, versión de Android y memoria de cada uno. Sin eso, el criterio de aprobación queda propuesto, no fijado. Revisá `docs/memory/open-questions.md`.
2. Fijá y registrá las versiones de React, three, R3F, drei, Rapier, Vite y Capacitor verificando compatibilidad en la documentación oficial.

## Qué construir (mínimo, en `apps/game`)

- Escena: patio con movimiento libre, salto, física (controlador cinemático de Rapier), un objeto animado, juguetes y UNA mecánica de arrastrar abierta (dnd-kit).
- Modo `?perf=1`: guion automático de 60 s (caminar un circuito, saltar, abrir el desafío) sin intervención.
- Registro: fps promedio y peor 1 %, tiempo de cuadro, draw calls, triángulos, memoria y tiempo hasta poder jugar.
- Salida: resumen en pantalla y JSON exportable que incluya el dispositivo y la fecha.
- Presupuesto inicial a validar (sin medir): ~100 draw calls, ~50k triángulos, pocas decenas de MB de texturas en GPU. Una sola sombra, instancias para repetidos, sin postprocesado.

## Cómo medir

- En CADA dispositivo de prueba, en navegador y dentro del WebView de Capacitor (depuración remota desde Chrome).
- Repetí al menos tres corridas por dispositivo y reportá el rango, no un solo número.
- Medí con el desafío abierto y con el bucle pausado (`frameloop`) para validar la pausa.

## Criterio (propuesta, a fijar con los dispositivos)

30 fps sostenidos en el dispositivo más modesto, con el peor 1 % no menor a 20.

## Si no cumple

1. Bajar calidad: factor de píxeles, sombras, instancias, texturas.
2. Si aun así no cumple: plan B con Unity. API, contratos, base y panel se mantienen; escena y mecánicas se reimplementan.
3. Registrá el resultado y la decisión con `record-decision`.

## Entrega

Resultados por dispositivo en tabla de texto plano, JSON adjunto, recomendación (seguir o plan B) y los riesgos que quedaron sin medir. No declares aprobado sin datos de dispositivo real.
