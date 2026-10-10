# Infraestructura y despliegue

Principio: Patio no es comercial por ahora y se mantiene gratuito en lo posible. Los límites cambian: confirmarlos en la documentación oficial antes de publicar. Si Patio pasa a ser comercial, revisar los términos de Cloudflare, Cloud Run, Atlas y Oracle.

## Servicios

| Componente | Servicio | Límites y notas |
| --- | --- | --- |
| Juego web y panel (estáticos) | Cloudflare Pages | 500 compilaciones por mes, 20.000 archivos, 25 MiB por archivo. URL compartida `pages.dev`. |
| API | Google Cloud Run (contenedor) | Cuota gratuita: 2 millones de pedidos por mes, 180.000 s de CPU, 360.000 GiB-s. Escala a cero (arranque en frío). Requiere cuenta de facturación y el presupuesto NO corta el gasto: fijar cuotas y alertas. Falta confirmar si la cuota gratuita aplica a una región cercana a Uruguay. |
| Base de datos | MongoDB Atlas M0 | 0,5 GB, 500 conexiones, 100 ops/s, sin backups, pausa a los 30 días sin actividad. |
| Respaldo | GitHub Actions | Ver `04-base-de-datos.md`. |
| Tiempo real (V2) | Oracle Cloud Always Free (Arm, 2 OCPU, 12 GB) | Solo V2. Oracle reclama máquinas con muy poco uso durante 7 días. Falta verificar disponibilidad, alta y términos. |
| Código | GitHub (repo privado) | CI en Actions. |

No sirven para las salas V2: Cloud Run (WebSocket factura instancia activa), Cloudflare Durable Objects, GitHub Pages, Vercel Hobby, Render gratuito, Fly.io.

Capacidad estimada del MVP (sin medir): con unos 10 pedidos por jugador por día, la cuota de Cloud Run alcanza para 5.000 a 6.000 jugadores por día. El primer límite en picos son las 100 ops/s de Atlas. Confirmar con prueba de carga.

## Dominio y cookies

No hay dominio propio: panel, juego y API quedan en dominios compartidos (`pages.dev`, `run.app`) que no comparten cookies. Por eso: tokens, no cookies. Poner una capa delante (por ejemplo contra inundación de registros) requeriría dominio propio.

## Entornos

- Local: `docker compose` con Mongo y el servicio.
- Producción.
- Entorno de prueba: sería otro proyecto gratuito de Atlas y otro servicio de Cloud Run (a evaluar).

## Variables y secretos

Back: `MONGODB_URI`, `JWT_SECRET`, `RECOVERY_HMAC_SECRET`, `CORS_ORIGINS`, zona horaria por defecto. Front: `VITE_API_URL`, `VITE_DEFAULT_THEME`. Nunca en el repo; `.env*` está en `.gitignore` y denegado en los permisos de Claude Code. Secretos del respaldo en secretos del repo de GitHub.

## CI (GitHub Actions)

Lint, tipos, pruebas, validador de contraste de temas, axe en Playwright y construcción de la imagen y de las dos apps. Despliegue manual al principio (un comando). La compilación de Android es manual al principio.

## Despliegue

- API: imagen Docker de varias etapas con Node LTS vigente -> Cloud Run, mín 0, máx ~5 (a ajustar), 512 MiB (a medir).
- Estáticos: Vite compila cada app y se publican en Cloudflare Pages. El panel lleva CSP estricta (sin scripts en línea, conexión solo a la API).
- Android: compilar el juego, `cap sync`, generar el paquete en una Mac con Android Studio.
- Versiones: semver para apps, `versionCode` en Android. La API es compatible hacia atrás dentro de `/v1`.
- Primer arranque: comando de carga inicial (reglas de prueba, palabras vacías, primer administrador).

## Antes de abrir a niños (lista de bloqueo)

1. Restauración de respaldo probada con `mongorestore`.
2. Lista de palabras prohibidas cargada.
3. Valores reales de dificultades, niveles y reglas.
4. Términos y política de privacidad redactados.
5. Cuotas y alertas fijadas en Cloud Run.
6. Prueba de carga con 50 y 500 jugadores.
7. Prueba de rendimiento 3D aprobada en dispositivos reales.
8. Origen real de Capacitor confirmado contra CORS en un dispositivo.

## Tiendas

Google Play (política de Familias) y Apple (guía Niños 1.3 y 4.2: la app debe ser más que un sitio empaquetado). Sin analítica ni publicidad de terceros, sin enviar información del dispositivo a terceros, sin identificador publicitario, términos y privacidad dentro de la app. Las cuentas de tienda son un costo aparte. Aprobación de Capacitor sin verificar.
