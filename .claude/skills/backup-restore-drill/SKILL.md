---
name: backup-restore-drill
description: Configurar el respaldo automático de MongoDB con GitHub Actions y ejecutar el simulacro de restauración con mongorestore, requisito antes de abrir Patio a niños.
disable-model-invocation: true
---

# Respaldo y simulacro de restauración

Contexto: `docs/context/04-base-de-datos.md` (respaldo) y `10-infraestructura-y-despliegue.md`. Atlas M0 no tiene copias automáticas.

## Pendientes a resolver con la persona responsable ANTES de configurar

1. Dónde se guarda el archivo: artefactos de GitHub, Cloudflare R2 o Google Cloud Storage. Verificá en la documentación oficial límites gratuitos y retención, y anotá fuente y fecha.
2. Verificá que GitHub desactiva flujos programados en repos inactivos y cómo se evita.

## Configuración

- Flujo programado diario, de madrugada hora de Montevideo (recordá que `cron` de Actions es UTC).
- `mongodump` con una cuenta de Atlas de SOLO LECTURA, distinta de la de la API.
- Cifrar el archivo antes de guardarlo. Conservar los últimos 30.
- Secretos como secretos del repo (cadena de conexión y clave de cifrado). Nunca en el repo ni en logs.
- Atlas acepta cualquier IP (las del runner cambian): la protección son credenciales largas. Dejá registrada esa decisión.
- Fallo del flujo = alerta visible (correo de GitHub u otro canal elegido).

## Simulacro de restauración (obligatorio)

1. Elegí un respaldo reciente. Descifralo en un entorno aislado.
2. Restauralo con `mongorestore` en una base distinta (nunca sobre producción).
3. Verificá: conteo por colección, índices únicos y TTL recreados, y consultas clave (jugador por `tokenHash`, set por {date, groupId}, resultado por `eventId`).
4. Medí cuánto tardó y documentá los pasos exactos.
5. Registrá fecha y resultado en `docs/memory/decisions.md`.

No des el respaldo por válido hasta que el simulacro funcione. Informá con honestidad qué probaste.
