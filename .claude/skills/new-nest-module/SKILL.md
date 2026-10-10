---
name: new-nest-module
description: Crear un módulo nuevo del back (NestJS) respetando el mapa de dependencias sin ciclos y las tres capas controlador, servicio y repositorio.
argument-hint: "<nombre del módulo y su responsabilidad>"
---

# Módulo nuevo del back

Contexto: `docs/context/02-arquitectura-general.md` (tabla de módulos) y `03-backend.md`.

1. Confirmá que no existe ya un módulo con esa responsabilidad. Si algo toca jugador y grupo a la vez, va en `membership`, no en un módulo nuevo.
2. Declará de qué depende y quién lo usa. Dibujá el grafo: no puede haber ciclos. `auth` no depende de nadie; `groups` no conoce a `players`; `players` y `groups` no conocen a `membership`; `accounts` y `players` son independientes.
3. Si cambia el mapa, actualizá la tabla de `02-arquitectura-general.md` y registrá la decisión (`record-decision`). Consultá al `architect` si la responsabilidad no es obvia.
4. Estructura: `<nombre>.module.ts`, `<nombre>.controller.ts` (solo HTTP y validación con el schema), `<nombre>.service.ts` (reglas), `<nombre>.repository.ts` (MongoDB), `*.guard.ts` si aplica, y carpeta de pruebas.
5. Funciones puras separadas y con pruebas propias.
6. Agregá una regla de lint de límites de importación para el módulo nuevo.
7. Conectalo en el módulo raíz y verificá que la aplicación levanta.

Verificación: lint de límites, tipos y pruebas en verde, y el grafo de dependencias sin ciclos.
