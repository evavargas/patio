---
name: new-mongo-collection
description: Agregar o cambiar una colección o índice de MongoDB, con su forma, índices, orden de escritura sin transacciones, efecto de eliminación y migración segura.
argument-hint: "<colección y qué cambia>"
---

# Colección o índice nuevo

Contexto: `docs/context/04-base-de-datos.md` y `.claude/rules/database.md`.

1. Justificá por qué no cabe en una colección existente. Recordá el límite de 0,5 GB y 100 ops/s de Atlas M0.
2. Definí campos en `camelCase`, colección en plural, instantes en UTC y claves de día `YYYY-MM-DD`.
3. Contrato: skill `contract-change` si la forma aparece en la API.
4. Índices: lista cada consulta y el índice que la sostiene. Únicos y TTL se crean desde código de arranque.
5. Sin transacciones: definí el orden de escritura, la idempotencia y cómo se repara una falla a la mitad (comando de mantenimiento o verificación al leer).
6. Alcance: ¿la lee un moderador? Entonces su repositorio recibe el filtro del servicio de alcance.
7. Eliminación: definí qué pasa con estos datos al borrar un jugador, grupo, set o moderador, y actualizá la tabla de `04-base-de-datos.md`.
8. Si hay datos existentes: plan expand/contract (agregar, migrar, leer ambos, quitar) y respaldo probado antes.
9. Pruebas de integración con MongoDB en memoria: índices únicos, idempotencia, efectos de eliminación.
10. Actualizá `04-base-de-datos.md` y registrá lo que sea una decisión.

Salida: esquema, índices, costo en operaciones, tamaño estimado (marcado como estimación) y pruebas ejecutadas.
