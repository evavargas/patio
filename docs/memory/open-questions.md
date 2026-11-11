# Pendientes, riesgos y verificaciones abiertas

Cada fila: qué falta, quién puede resolverlo, qué bloquea. Cuando se cierra, pasa a `decisions.md`.

## Bloquean el inicio del código

| Tema | Detalle | Bloquea |
| --- | --- | --- |
| Versiones exactas del resto del stack | Fijadas para el juego (ver `decisions.md`, 2026-11-11). Faltan NestJS, Tailwind, shadcn/ui, Capacitor y la librería i18n. Verificar compatibilidad en la documentación oficial, no de memoria. | Paquetes de panel y API |

## Verificar antes de abrir a niños

| Tema | Detalle |
| --- | --- |
| Rendimiento en dispositivo real | Salteado el 2026-11-11. Dispositivo candidato: Xiaomi Redmi Note 9 Pro (Snapdragon 720G, 6 GB, Android 10). Medir con `?perf=1` en navegador y WebView antes de abrir a niños; el criterio sigue siendo propuesta. |
| Respaldo | Dónde se guarda el archivo (artefactos de GitHub, Cloudflare R2 o Google Cloud Storage), límites gratuitos, y que GitHub desactiva flujos programados en repos inactivos. Probar `mongorestore`. |
| CORS en Capacitor | Confirmar el origen real en un dispositivo contra `CORS_ORIGINS`. Nota de nombre: la arquitectura menciona `ALLOWED_ORIGINS` y `CORS_ORIGINS` en la misma sección. Vigente: `CORS_ORIGINS`. Corregir el documento. |
| Modo del sistema en Capacitor | Que `prefers-color-scheme` refleje el modo del sistema dentro del WebView. Si no, leerlo del lado nativo. |
| StatusBar | Confirmar que el plugin no pide permisos en Android. |
| Transacciones en Atlas M0 | No verificado. El diseño no depende de ellas. |
| Cloud Run en región cercana | Confirmar si la cuota gratuita aplica a una región cercana a Uruguay. |
| Oracle (V2) | Disponibilidad, requisitos de alta y términos. |
| Cloudflare Pages | Términos si Patio pasa a ser comercial. |
| Prueba de carga | 50 y 500 jugadores simultáneos. Herramienta sin elegir. |
| Lista de palabras prohibidas | Cargarla antes de abrir (arranca vacía). |
| Textos legales | Términos y condiciones y política de privacidad, por redactar. |
| Revisión jurídica y modelo de negocio | Se tratan aparte, no resueltos. |
| Aprobación de tiendas | App Store (4.2, más que un sitio empaquetado) y Google Play (Familias). Sin verificar con Capacitor. |

## Decisiones de producto o de diseño sin cerrar

| Tema | Propuesta actual |
| --- | --- |
| Orientación en móvil | Horizontal parece mejor para joystick y salto. Probar ambas. |
| Audio | No definido (música, efectos, lectura de la consigna). |
| Almacenamiento de sesión en móvil | Preferences al inicio. Evaluar almacenamiento seguro para el código de recuperación. |
| Objetos que se mueven solos | Definir si colisionan con el jugador. Entra en la prueba de rendimiento. |
| Colores, tipografía y temas | Paleta y fuente del prototipo: "Patio Uruguayo Sunset" con Lexend (`docs/design/stitch/DESIGN-patio-uruguayo-sunset.md`). Falta confirmar licencia OFL de Lexend y pasarlo a tokens de `packages/theme`. |
| Formularios del panel | Propuesta: escritos a mano por mecánica. Ajuste respecto del diseño 6.4. Falta confirmar. |
| Catálogo cerrado de assets | Propuesta: el moderador no sube archivos. Falta confirmar. |
| Router y librerías | Zustand en el juego, React Router y TanStack Query en el panel. Confirmar al empezar. |
| Valores reales de dificultades, niveles y reglas | Reemplazar los valores de prueba por los que defina una persona docente. |
| Controles de movimiento para 6 y 7 años | Probar joystick y salto con niños del tramo menor. |
| Cantidad de desafíos por día y duración | Probar con grupos reducidos, sin límite rígido. |

## Documentos originales desactualizados (aplicar cuando corresponda)

1. Arquitectura 19.5 y pendientes (sección 24): reflejar "el jugador elige tema", "escena sin tema", "entrada alternativa fuera de alcance", "Tailwind en el juego" y "fuentes autoalojadas".
2. Arquitectura sección 9: unificar `ALLOWED_ORIGINS` y `CORS_ORIGINS`.
3. Diseño 3.6: sigue con `User`, `ModerationList`, rol `admin | docente`. En el código vale la nomenclatura de arquitectura (`accounts`, `word-filter`, `administrator`/`moderator`).
4. Diseño 6.3: el repo sugerido usa `admin/`. Vale `panel/`.
5. Diseño 6.4 y 3.1: formulario generado desde schema y subida de assets, pendientes de confirmar los ajustes de arquitectura 23.

## V2 (no resolver ahora)

Apodos duplicados dentro de un grupo, límite de frecuencia de gestos, silenciar compañeros, evaluación de tiendas para sala cerrada sin chat, rendimiento de dibujar 50 avatares animados, coincidencia horaria (sala vacía).

## Del prototipo visual (a resolver sin adivinar)

| Tema | Detalle |
| --- | --- |
| Gmail SMTP | Verificar el límite diario de envíos de Gmail (fuente oficial y fecha). Revisar que la librería de envío (por elegir) no rompa "sin SDK de terceros". Confirmar que la contraseña de aplicación NO esté en `.env.example`. |
| Librería i18n | Idiomas decididos: `es-UY` (por defecto) e inglés, en juego y panel. Falta elegir la librería (licencia, peso, sin telemetría). Los textos legales también pasan a tener versión en inglés (a definir). |
| Vistas del panel | Las de `06` difieren de la navegación del prototipo (Jugadores, Desafíos, Métricas, Moderadores, Ajustes). Alinear. |
| Métrica de duración de sesión | El prototipo propone la mediana como contrapeso de bienestar. Verificar si el servidor guarda ese dato. |
| Audio | El perfil tiene ajuste de sonido pero el audio sigue sin definir. |
| Valores en dp (mobile) | Propuestos, a validar en dispositivo real. Dock de 112 o 96 dp sin decidir. |
| Desenfoque del dock | Costo de rendimiento sin medir. |
| Textos del prototipo | Voseo o tuteo y redacción final: los revisa la persona responsable. |

## Palabras prohibidas (pendientes de definir)

| Tema | Detalle |
| --- | --- |
| Límites de `words` | Largo máximo de cada palabra y cantidad máxima de palabras: el doc no los define. El schema solo exige `minLength: 1`. |
| Forma de guardado | Si el panel guarda las palabras ya normalizadas (mayúsculas y tildes) o el servidor normaliza al comparar. |
| Creación del documento | Quién crea `settings/bannedWords` (comando de carga inicial o primer PUT del panel). Hoy su ausencia equivale a versión 0. |
| Caché en memoria | Doc 03 sugiere cachear la lista en la instancia; hoy cada pedido hace 1 lectura (aceptable, el navegador cachea 60 s). |
| Atlas M0 y versión | Confirmar la versión de servidor de Atlas M0 (se asume 8.0) y que `mongo:8.0.34` es compatible. |

## Lint

| Tema | Detalle |
| --- | --- |
| TypeScript 6.0.3 solo para lint | `typescript-eslint` no soporta TS 7 (peer `<6.1.0`, verificado 2026-11-11). Cuando lo soporte, quitar `typescript@6.0.3` de la raíz y revisar si conviene pasar a `strictTypeChecked`. Hasta entonces, el lint puede diferir de `tsc` 7 en casos raros. |
| ESLint 10 | Se usa la línea 9 por el peer de `eslint-plugin-jsx-a11y`. Revisar cuando ese plugin declare ESLint 10 (la 9.x figura como deprecada en npm). |

