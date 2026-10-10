---
name: new-panel-view
description: Agregar o modificar una vista del panel (React Router, TanStack Query, shadcn/ui) con permisos por rol, estados de carga, vacío y error, accesibilidad y tema por tokens.
argument-hint: "<nombre de la vista y rol>"
---

# Vista nueva del panel

Contexto: `docs/context/06-panel-frontend.md`, `03-backend.md` (matriz), `08-tema-y-accesibilidad.md`.

1. Carpeta `features/<vista>` con ruta, componentes y consultas.
2. Rol: ¿administrator, moderator o ambos? La ruta se protege por rol y la interfaz oculta lo no permitido. El servidor ya hace cumplir el permiso: confirmá que el endpoint existe y filtra por alcance.
3. Datos: TanStack Query, con filtros en la URL. Paginación por cursor con TanStack Table cuando sea lista.
4. Estados: carga (esqueletos), vacío y error en la vista.
5. Si arrastra: dnd-kit con sensores de puntero, táctil y teclado, más alternativa "Mover a..." en menú. Actualización optimista que revierte si el servidor rechaza. Mover tiene "deshacer".
6. Si elimina: skill `destructive-operation` (solo administrator, confirmación con impacto, sin deshacer).
7. Gráficos: Recharts con color más etiqueta o patrón, resumen en texto y tabla equivalente. Los datos llegan hasta ayer y no se puede elegir hoy.
8. Textos en español (identificadores en inglés con los tres roles). Sin colores ni tamaños literales: tokens.
9. Pruebas: permisos con administrator y moderator, flujo en Playwright, y axe en claro y oscuro (`a11y-check`).

Salida: vista, rutas, permisos verificados y resultado de las pruebas.
