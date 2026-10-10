# Guía del harness

El harness es el conjunto de archivos que le dan contexto, reglas y herramientas a Claude Code dentro de este repo. Todo es texto simple que podés editar.

## Mapa

```
CLAUDE.md                     Índice y reglas que no se negocian (menos de 200 líneas)
AGENTS.md                     Puntero para otras herramientas
CLAUDE.local.md               (opcional, ignorado por git) tus notas personales
.claude/
  settings.json               Permisos compartidos (qué se permite, pregunta o niega)
  settings.local.json         (opcional, ignorado por git) permisos personales
  rules/*.md                  Reglas que se cargan solo al tocar ciertas rutas (campo paths)
  agents/*.md                 Agentes especializados (subagentes)
  skills/<nombre>/SKILL.md    Procedimientos repetibles
docs/
  context/                    Contexto del proyecto, un tema por archivo
  memory/                     Memoria del proyecto: decisiones, pendientes, preferencias, aprendizajes
  harness/README.md           Esta guía
```

## Cómo funciona cada pieza

- `CLAUDE.md` se carga al iniciar. Cuanto más corto, mejor se respeta. El detalle va a `docs/context/`. Solo `01-nomenclatura.md` se importa con `@` (los imports se cargan siempre y no ahorran contexto).
- `.claude/rules/*.md` con `paths:` se cargan solo cuando se editan archivos que coinciden. Sin `paths` se cargarían siempre.
- `.claude/agents/*.md`: cada archivo es un agente con su descripción (cuándo usarlo), herramientas permitidas y modelo. Claude delega según la descripción, o lo invocás por nombre.
- `.claude/skills/<nombre>/SKILL.md`: un procedimiento. La `description` decide cuándo se usa. Los que tienen `disable-model-invocation: true` solo corren si los invocás vos con `/nombre`.
- Memoria automática de Claude Code: es local de cada máquina y no se versiona. La memoria que sí se versiona es `docs/memory/`.

## Cómo adaptarlo

1. Cambiar una regla del proyecto: editá `CLAUDE.md` o el archivo de `docs/context/` que corresponda, y registrá la decisión en `docs/memory/decisions.md`.
2. Cambiar un permiso: `.claude/settings.json`. Orden de evaluación: `deny`, luego `ask`, luego `allow`.
3. Agregar un agente: creá `.claude/agents/<nombre>.md` con `name`, `description`, `tools` y `model`.
4. Agregar un skill: creá `.claude/skills/<nombre>/SKILL.md` con `name` y `description`. Si hace acciones con efectos (deploy, push), agregá `disable-model-invocation: true`.
5. Agregar una regla por ruta: creá `.claude/rules/<tema>.md` con `paths:`.

## Qué está decidido y qué es propuesta

Los datos del producto, arquitectura y stack salen de los documentos de diseño y arquitectura y del registro de decisiones. Las convenciones de código (`docs/context/14-convenciones-de-codigo.md`), los permisos de `settings.json`, las herramientas de prueba sugeridas y la división de agentes y skills son PROPUESTAS del harness: están pensadas para cambiarse.

## Permisos por defecto

Permitido: comandos `pnpm`, lectura de estado de git. Pregunta: instalar dependencias, `git commit`, `docker`, `gcloud`, `gh`, `npx`. Negado: `git push`, `git reset --hard`, `git clean`, `rm -rf`, leer `.env*`, keystores y carpetas `secrets/`. Los commits y los push los decidís vos.

## Agentes incluidos

`architect`, `backend-engineer`, `database-engineer`, `game-engineer`, `panel-engineer`, `contracts-engineer`, `theme-a11y-engineer`, `devops-engineer`, `test-engineer`, `code-reviewer`, `wellbeing-reviewer`.

## Skills incluidos

`perf-gate-3d`, `contract-change`, `new-api-endpoint`, `new-nest-module`, `new-mongo-collection`, `destructive-operation`, `new-game-screen`, `new-panel-view`, `add-theme`, `a11y-check`, `wellbeing-check`, `security-scope-check`, `nomenclature-check`, `backup-restore-drill`, `deploy-checklist`, `release-android`, `record-decision`, `sync-docs`.

## Higiene

- Mantené `CLAUDE.md` bajo 200 líneas.
- Cuando una regla se rompe seguido, subila de `docs/context/` a `CLAUDE.md` o a una regla por ruta, o automatizala con lint o una prueba.
- Revisá `docs/memory/open-questions.md` antes de cada etapa.
