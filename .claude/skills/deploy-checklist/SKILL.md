---
name: deploy-checklist
description: Lista de verificación y pasos para desplegar la API en Cloud Run y las apps estáticas en Cloudflare Pages, incluida la lista de bloqueo antes de abrir a niños. Solo se ejecuta cuando la persona responsable lo invoca.
disable-model-invocation: true
argument-hint: "<api | game-web | panel | todo>"
---

# Despliegue

Contexto: `docs/context/10-infraestructura-y-despliegue.md`. No despliegues sin confirmación explícita en esta conversación.

## Antes de cualquier despliegue

1. Rama limpia, CI en verde: lint, tipos, pruebas, contraste de temas, axe, construcción.
2. Variables presentes en el destino: `MONGODB_URI`, `JWT_SECRET`, `RECOVERY_HMAC_SECRET`, `CORS_ORIGINS` (API); `VITE_API_URL`, `VITE_DEFAULT_THEME` (apps). Sin secretos en el repo.
3. `CORS_ORIGINS` incluye exactamente: panel, juego web, y los orígenes de Capacitor (`https://localhost`, `capacitor://localhost`).
4. Plan de reversión escrito (imagen anterior, versión anterior de Pages).
5. Contratos: el cambio es compatible con apps instaladas (solo aditivo).

## API (Cloud Run)

Imagen Docker de varias etapas con Node LTS, mín 0, máx bajo (~5), memoria inicial 512 MiB (a medir). Cuotas y alertas fijadas. Verificá `/healthz`, un registro de prueba, `GET /day` y una ruta del panel. Revisá logs: sin apodos, tokens ni códigos.

## Apps estáticas (Cloudflare Pages)

Compilación de Vite, CSP estricta en el panel (sin scripts en línea, conexión solo a la API), `theme-init.js` externo. Verificá que no hay pedidos a dominios de terceros (pestaña de red) y que las fuentes salen del propio sitio.

## Lista de bloqueo antes de abrir a niños

1. Restauración de respaldo probada (`backup-restore-drill`).
2. Lista de palabras prohibidas cargada.
3. Valores reales de dificultades, niveles y reglas.
4. Términos y política de privacidad redactados.
5. Cuotas y alertas de Cloud Run fijadas.
6. Prueba de carga con 50 y 500 jugadores.
7. Prueba de rendimiento 3D aprobada en dispositivos reales.
8. Origen real de Capacitor confirmado contra CORS en un dispositivo.
9. Revisión jurídica realizada (se trata aparte).

Entrega: qué se desplegó, versión, resultados de cada verificación y qué falta de la lista.
