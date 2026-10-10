---
paths:
  - "apps/api/**"
---

# Reglas del back (apps/api)

Contexto: `docs/context/03-backend.md`, `04-base-de-datos.md`, `11-seguridad-y-privacidad.md`.

- Capas por módulo: controlador (HTTP y validación con el schema de `@patio/contracts`) -> servicio (reglas) -> repositorio (MongoDB). El controlador no toca la base y el repositorio no contiene reglas.
- Dependencias entre módulos solo las del mapa de `02-arquitectura-general.md`. `auth` sin dependencias y sin base de datos. `groups` no conoce a `players`. Todo lo que toca jugador y grupo va en `membership`.
- Dos superficies separadas: `/v1` (juego, guard por token del jugador) y `/v1/panel` (guard del panel que lee la cuenta en cada pedido). No compartas controladores ni DTO.
- Toda ruta del panel pasa por el servicio de alcance. Prueba de permisos por ruta: administrator, moderator dueño, moderator ajeno, player.
- Errores de dominio con código estable de `contracts`, forma `{ code, message, details }`.
- Un pedido hace pocas operaciones de base (límite de 100 ops/s). Cuenta las operaciones de cada endpoint nuevo en la descripción del PR.
- Sin transacciones. Diseña con orden de escritura, idempotencia e índices únicos. Documenta cómo se repara una falla a la mitad.
- Reloj: solo la función de `platform`. Prohibido `Date.now()` y `new Date()`.
- Logs: solo el logger JSON. Nunca apodos, tokens ni códigos.
- Nunca devuelvas el nivel en `/v1`. Nunca guardes un token o código en claro.
- Comparaciones de secretos en tiempo constante. Aleatoriedad criptográfica para tokens y códigos.
