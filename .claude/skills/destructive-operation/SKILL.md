---
name: destructive-operation
description: Implementar o modificar una eliminación definitiva (jugador, grupo, set del día, cuenta de moderador) o un comando de mantenimiento que borre o reescriba datos, solo del administrador, con confirmación y registro.
argument-hint: "<qué se elimina>"
---

# Operación destructiva

Contexto: `docs/context/04-base-de-datos.md` (eliminaciones), `03-backend.md` (5.8), `06-panel-frontend.md`.

Reglas fijas:
- Solo `administrator`. Un moderator recibe 403 y nunca ve el botón.
- Definitivo: se borran documentos, no se marcan. Sin papelera. La única recuperación es el respaldo.
- Un administrador no puede eliminar su propia cuenta ni la del último administrador activo.
- Cada eliminación deja una línea de log con quién, qué y cuándo (sin datos personales extra).

Pasos:
1. Efecto exacto en cada colección, según la tabla de `04-base-de-datos.md`. Los `dailyStats` ya cerrados no se tocan.
2. Endpoint de conteo previo: cuántos datos se verán afectados (por ejemplo jugadores del grupo, jugadores que abrieron el set). El panel lo muestra ANTES de ejecutar.
3. Endpoint `DELETE` con el orden de borrado definido y seguro ante fallas a la mitad (sin transacciones): primero lo que invalida el acceso (token, refresh, set), después lo derivado.
4. Casos borde: eliminar un set ya abierto por jugadores (siguiente `GET /day` lo resuelve de nuevo y puede quedar "sin set", y no se aceptan logros de un set inexistente); eliminar un moderador (revocar refresh tokens, quitarlo de `ownerIds`, grupo sin dueño lo maneja el administrador, desafíos y sets con autor marcado como eliminado); eliminar un grupo (jugadores a "Sin grupo", cerrar fila de pertenencia, borrar sus sets).
5. Panel: diálogo de confirmación que dice qué se borra y cuántos datos afecta, y que no se puede deshacer.
6. Pruebas: efecto en cada colección, el permiso (administrator sí, moderator no), la regla del último administrador, el log y el caso borde de cada operación.

Verificación: ejecutá las pruebas de integración y confirmá con datos de prueba que nada queda huérfano.
