---
paths:
  - "apps/panel/**"
---

# Reglas del panel (apps/panel)

Contexto: `docs/context/06-panel-frontend.md`, `03-backend.md` (permisos), `08-tema-y-accesibilidad.md`.

- Datos del servidor SOLO con TanStack Query. Filtros de listas en la URL. Zustand solo para sesión y preferencias de interfaz.
- La interfaz oculta lo que el rol no puede hacer, pero NUNCA es el control de acceso. Todo permiso real vive en el servidor.
- Estructura por funcionalidad en `features/`, una por vista.
- Componentes: shadcn/ui sobre Tailwind con tokens de `@patio/theme`. Ningún color o tamaño literal.
- Formularios de las tres mecánicas escritos a mano y validados con el schema de `@patio/contracts`.
- Todo arrastre (dnd-kit) tiene alternativa de teclado y de menú ("Mover a...").
- Las eliminaciones son solo del administrador y piden confirmación que dice qué se borra y cuántos datos afecta. Sin "deshacer". Mover jugadores sí tiene "deshacer".
- El cliente de la API renueva el token UNA vez ante un 401 (llamadas simultáneas esperan la misma renovación). Con `mustChangePassword` solo existe el cambio de contraseña.
- CSP estricta: sin scripts en línea, conexión solo a la API.
- Cada vista: estado de carga (esqueletos), vacío y error.
- Gráficos: color más etiqueta o patrón, resumen en texto y tabla equivalente. Los datos llegan hasta AYER y el selector de fechas no deja elegir hoy.
- Nunca renderizar HTML escrito por usuarios.
