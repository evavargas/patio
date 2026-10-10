# Memoria del proyecto

Esta carpeta es la memoria DEL PROYECTO y está versionada en el repo. Es distinta de la memoria automática de Claude Code (`~/.claude/projects/.../memory/`), que es local de cada máquina y no se versiona.

| Archivo | Para qué sirve | Quién lo actualiza |
| --- | --- | --- |
| `decisions.md` | Registro fechado de decisiones cerradas. Lo más reciente manda sobre `docs/context/`. | Skill `record-decision` |
| `open-questions.md` | Pendientes, riesgos y verificaciones abiertas, con responsable y bloqueo. | Quien las abre o las cierra |
| `preferences.md` | Cómo prefiere la persona responsable que se trabaje y se comunique. | Solo a pedido |
| `lessons.md` | Aprendizajes del desarrollo (qué falló, qué sorprendió). Vacío al empezar. | Quien lo descubre |

Reglas de uso:

1. Al empezar una tarea no trivial: lee `decisions.md` (las últimas entradas) y `open-questions.md` del área.
2. Una decisión nueva se registra en el mismo cambio que la aplica.
3. Un pendiente que se cierra se mueve de `open-questions.md` a `decisions.md`.
4. Nada de datos personales de niños, secretos ni credenciales en estos archivos.
5. Cada línea debe poder verificarse: quién lo dijo o dónde está la fuente.
