# Panel (apps/panel)

Stack: React + TypeScript + Vite, React Router, TanStack Query y Table, Zustand mínimo, shadcn/ui sobre Tailwind, Recharts (v3 vía envoltorios de shadcn), dnd-kit (parte de `@dnd-kit/core`; revisar madurez de `@dnd-kit/react` al implementar). Todo en español. App de una sola página.

## Estructura

Carpetas por funcionalidad (`features/`), una por vista: dashboard, players, groups, rankings, challenges, day-sets, rules, word-filter, accounts. Filtros en la URL para poder compartir una vista. Datos del servidor con TanStack Query. Zustand solo para sesión y preferencias de interfaz.

## Vistas

| Vista | Qué hace |
| --- | --- |
| Resumen | Indicadores (registrados, nuevos de la semana, activos ayer, grupos creados, logro de ayer) y gráficos: registros por día o semana, logro por desafío y día (barras y mapa de calor), jugadores por nivel, jugadores que entraron por día, tiempo en resolver. Filtra por grupo y rango de fechas. Dice con claridad que los datos llegan hasta AYER; el selector no deja elegir el día en curso. |
| Jugadores | Tabla y tarjetas con apodo, ID corto, grupo, nivel, puntaje, progreso por familia, registro y última actividad. Filtros por grupo, nivel, "sin grupo", "sin actividad hace N días". Ficha con evolución. Reemitir código; el administrador elimina. |
| Grupos | Tablero de columnas ("Sin grupo" solo administrador + una por grupo). dnd-kit con sensores de puntero, táctil y teclado; alternativa "Mover a..." en cada tarjeta; selección múltiple y lote (`POST /players/move`); actualización optimista que revierte si el servidor rechaza (`GROUP_FULL`, `FORBIDDEN_SCOPE`); aviso con "deshacer" que envía el movimiento inverso; indicador de capacidad; virtualización de columnas largas. Crear grupos, ver y regenerar código, sacar jugadores. |
| Rankings | Dos listas separadas por grupo: compromiso y avance. |
| Desafíos | Biblioteca común. Crear, editar (solo autor y administrador), duplicar, archivar, versionar. Formulario ESCRITO A MANO por cada mecánica (son tres), validado con el JSON Schema compartido. Assets desde un selector del catálogo cerrado (sin subir archivos). Vista previa deseable con los componentes de `packages/challenges`. |
| Días | Calendario por grupo (calendario de shadcn). Se arrastran desafíos de la biblioteca al día. Aviso, no error, fuera de 3 a 5. Set bloqueado en solo lectura con el motivo. El administrador elimina sets. |
| Reglas | Puntos por dificultad, niveles, reglas de avance, zona horaria, tolerancia de medianoche y límites por IP (cantidad y ventana). Solo edita el administrador. |
| Palabras prohibidas | Agregar y quitar palabras, versión que sube en cada cambio, cambio de apodos inadecuados. Solo administrador. |
| Cuentas | Crear moderadores con contraseña temporal, reiniciarla, asignar roles, reasignar grupos, eliminar. Solo administrador. |

## Sesión y permisos en la interfaz

Access token en memoria; refresh en el almacenamiento del navegador. El cliente de la API renueva UNA sola vez ante un 401 (las llamadas simultáneas esperan la misma renovación) y reintenta; si falla, cierra sesión. Rutas protegidas por rol; la interfaz oculta lo que el rol no puede hacer, pero la seguridad real está en el servidor. Con `mustChangePassword` solo existe la pantalla de cambio de contraseña. CSP estricta: sin scripts en línea, conexión solo a la API.

## Eliminaciones (administrator)

Solo en la interfaz del administrador. Diálogo de confirmación que dice qué se borra y cuántos datos afecta. Sin "deshacer" (a diferencia de mover jugadores) y el diálogo lo dice con claridad.

## Estados y avisos

Cada vista tiene carga (esqueletos), vacío y error. Avisos con notificaciones breves; ventanas bloqueantes solo para confirmar acciones destructivas. Todo lo que se hace arrastrando tiene alternativa de teclado y de menú. Gráficos con color más etiqueta o patrón, resumen en texto y tabla con los mismos datos. El mapa de calor es una grilla de celdas con descripción accesible por celda.
