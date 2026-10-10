---
name: nomenclature-check
description: Buscar en el código y los documentos técnicos usos incorrectos de la nomenclatura player, moderator y administrator (niño, docente, usuario, admin) y de los nombres de módulos y colecciones.
argument-hint: "[ruta opcional]"
---

# Chequeo de nomenclatura

Contexto: `docs/context/01-nomenclatura.md` y `14-convenciones-de-codigo.md`.

1. Buscá en identificadores, rutas, colecciones, valores de enums o uniones, nombres de archivos, mensajes de commit y documentos técnicos: `niño`, `niña`, `docente`, `usuario`, `user`, `users`, `admin` (salvo palabras como "administrator"), `teacher`, `student`, `child`, `kid`, `encargado`, `maestro`.
2. Excepciones válidas: texto de interfaz para niños (catálogo `es-UY`), copy del panel si se decidió, y el documento de diseño del producto.
3. Colecciones y módulos: deben llamarse como la tabla vigente. Renombres ya hechos: `users` -> `accounts`, `admin` -> `panel`, `moderation` -> `word-filter`.
4. Valores de rol: solo `moderator` y `administrator`.
5. Convenciones de forma (ver `14-convenciones-de-codigo.md`): archivos `kebab-case`, tipos `PascalCase`, colecciones y campos `camelCase`, errores `UPPER_SNAKE_CASE`.
6. En documentos en español, además: sin raya larga (em dash).

Entrega: lista de hallazgos con archivo y línea, el reemplazo correcto y, si hay un caso dudoso, una pregunta. No renombres sin avisar si el cambio toca contratos o datos persistidos (en ese caso usá `contract-change`).
