---
name: release-android
description: Preparar y verificar una compilación de Android del juego con Capacitor (permisos, origen, plugins, versionCode, WebView), sin publicar en la tienda. Solo se ejecuta cuando la persona responsable lo invoca.
disable-model-invocation: true
---

# Compilación de Android con Capacitor

Contexto: `docs/context/05-juego-frontend.md` (Capacitor), `10-infraestructura-y-despliegue.md`. La compilación se hace en la Mac de la persona responsable con Android Studio. No subas nada a Play ni firmes con claves sin pedido explícito.

1. Compilá el juego (`pnpm build`) y sincronizá (`cap sync`). Los archivos van DENTRO de la app. La app no apunta a una URL remota ni descarga código.
2. `capacitor.config`: `server.androidScheme` en `https` explícito. Ese origen está en `CORS_ORIGINS` de la API.
3. Plugins permitidos: Preferences, App, StatusBar (confirmar sin permisos) y opcional Screen Orientation. Sin analítica, ubicación, notificaciones ni identificador publicitario. Sin HTTP nativo de Capacitor.
4. `AndroidManifest`: único permiso `INTERNET`. Revisá el manifiesto final unido, no solo el tuyo.
5. Versión: semver de la app y `versionCode` incrementado.
6. Términos y política de privacidad dentro de la app, sin enlaces externos.
7. Pruebas en dispositivo real con depuración remota del WebView desde Chrome: registro, recuperación, patio, desafío, cierre, perfil, cambio de modo y de tema, y `prefers-color-scheme` dentro del WebView.
8. Confirmá el origen real del pedido contra CORS en el dispositivo (pendiente abierto en `open-questions.md`).
9. Prueba de rendimiento (`perf-gate-3d`) en cada dispositivo de prueba, dentro del WebView.
10. Claves de firma: nunca en el repo. Están ignoradas (`*.keystore`, `*.jks`).

Entrega: versión, resultados por dispositivo, permisos finales del manifiesto y lo que quedó sin verificar.
