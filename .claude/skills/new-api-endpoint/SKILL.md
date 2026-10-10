---
name: new-api-endpoint
description: Agregar un endpoint a la API del juego (/v1) o del panel (/v1/panel) con contrato, permisos, alcance, límites, errores y pruebas.
argument-hint: "<método y ruta, superficie (juego o panel)>"
---

# Endpoint nuevo

Contexto: `docs/context/03-backend.md`, `07-contratos-y-tipado.md`, `11-seguridad-y-privacidad.md`.

1. Definí superficie: `/v1` (guard del jugador) o `/v1/panel` (guard del panel). Nunca mezclar controladores ni DTO.
2. Contrato primero: skill `contract-change` para cuerpo, respuesta y errores nuevos con código de dominio estable.
3. Permisos: completá la fila de la matriz (administrator, moderator, player). En el panel TODA lectura pasa por el servicio de alcance.
4. Reglas: servicio con la lógica; funciones puras para cálculos. El controlador solo valida y delega.
5. Datos: contá las operaciones de base (límite 100 ops/s) y declará los índices. Orden de escritura e idempotencia si escribe más de un documento.
6. Abuso: ¿necesita límite por IP? Si sí, usá `settings.limits`, con cantidad y ventana configurables.
7. Logs: solo ID de pedido, ruta, estado, duración y `playerId`/`accountId`.
8. Pruebas (primero): caso feliz, validación, cada fila de la matriz de permisos (incluido moderator ajeno), idempotencia si aplica, y errores de dominio.
9. Si es una eliminación: skill `destructive-operation`.
10. Actualizá la tabla de endpoints de `docs/context/03-backend.md`.

Salida: ruta, contrato, permisos, operaciones de base por pedido, índices, pruebas ejecutadas y qué no se probó.
