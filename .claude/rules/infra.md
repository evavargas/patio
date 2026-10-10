---
paths:
  - ".github/**"
  - "infra/**"
  - "**/Dockerfile"
  - "**/docker-compose*.yml"
  - "apps/game/capacitor.config.*"
---

# Reglas de infraestructura

Contexto: `docs/context/10-infraestructura-y-despliegue.md`, `04-base-de-datos.md` (respaldo).

- Todo gratuito en lo posible. Antes de proponer un servicio o plan nuevo, verifica límites en la documentación oficial y registra la fuente y la fecha. No asumas límites de memoria.
- Secretos solo como variables de entorno o secretos de GitHub. Nunca en el repo, en logs ni en la imagen Docker.
- Docker de varias etapas, Node LTS vigente, usuario sin privilegios, sin secretos en capas.
- Cloud Run: mín 0 instancias, máximo bajo, cuotas y alertas de presupuesto. El presupuesto no corta el gasto.
- El respaldo es cifrado, usa una cuenta de Atlas de solo lectura y conserva los últimos 30. No se confía en él hasta probar `mongorestore`.
- CI: lint, tipos, pruebas, contraste de temas, axe en Playwright, construcción de imagen y apps. Sin pasos que envíen datos a terceros.
- Despliegue manual al principio. Nada se despliega ni se hace `push` sin pedido explícito.
- Capacitor: `server.androidScheme: "https"` explícito, único permiso Android `INTERNET`, sin plugins de analítica, ubicación ni notificaciones.
