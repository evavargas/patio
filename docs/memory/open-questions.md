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


## Registro de player (pendientes)

| Tema | Detalle |
| --- | --- |
| Números y "patrones de nombre completo" en el apodo | Doc 09 dice que también se bloquean, pero no define qué es un patrón de nombre completo ni si cualquier dígito se bloquea. NO implementado. Definir antes de abrir a niños. |
| Versión de términos | `termsVersion` se guarda sin validar contra una lista. Definir los valores válidos cuando se redacten los textos. |
| Límites por IP desde `settings.limits` | Hoy salen de variables de entorno con los valores de doc 03 (sin medir). Falta leer `settings.limits` con caché de 1 minuto cuando exista el panel. Doc 03 no da el límite de login para este paso ni el de recuperación está implementado. |
| Saltos de proxy de Cloud Run | Se propone `TRUST_PROXY_HOPS=1`. Verificar con un despliegue real (y si se agrega un balanceador) que `req.ip` sea la IP del cliente y no la del proxy. |
| Comando de verificación de pertenencia | Repara filas de `groupMemberships` sin jugador (si falló el deshacer) y la inversa. Doc 04 lo lista como comando a crear. |
| Cupo estricto del grupo | Con insertar y volver a contar no se supera `maxSize`, pero una carrera por el último lugar puede rechazar a todos los que compiten. Un contador atómico en `groups` lo evitaría, a costa de mantenerlo en mover y borrar. Decidir si hace falta. |
| IP en `rateLimits` | La IP queda en texto en la clave durante la ventana. Evaluar guardar un hash. |
| Caché de la lista de palabras | El registro hace 1 lectura de `settings` por pedido. Sin medir; cachear en memoria si pesa. |
| Recuperar y perfil | Estado `RECOVERY_CODE_INVALID` (404) e `INVALID_TOKEN` (401) son propuesta. Límite de recuperación 100/hora por IP sin medir: un colegio entero detrás de una IP comparte el cupo. `MeResponse` no incluye grupo ni juguetes logrados (doc no los pide; confirmar con el juego). El cliente debe normalizar el código a mayúsculas antes de enviar. Falta decidir si recuperar debe actualizar `lastActiveAt`. |
| Código de grupo en minúsculas | El contrato exige mayúsculas; el cliente debe normalizar antes de enviar. |

## Pedir el día y enviar logro (pendientes)

| Tema | Detalle |
| --- | --- |
| Contradicción doc 04 y doc 09 (conteos) | Doc 09 pide requisitos por dificultad Y familia; doc 04 solo tiene conteos separados. Se agregó `countsByDifficultyFamily` (propuesta). Confirmar o cambiar la regla de nivel. |
| Forma de `settings/rules` | Propuesta en `04`. Sin documento: sin puntos por dificultad (0), sin niveles y tolerancia 30. Definir si faltar el documento debe ser un error. La zona horaria de las reglas no se consulta (sale de `DEFAULT_TIME_ZONE`). |
| Campos nuevos de `results` | `points`, `difficulty`, `family` y `claimedAt` son propuesta. Reserva de 60 s sin medir. |
| Comando de recálculo | Recalcular puntaje, conteos y nivel desde `results` y completar los `applied=false` viejos. Pendiente (doc 04 lo lista). Es lo que cubre la ventana entre sumar y marcar `applied`. |
| Tolerancia y "desafío abierto" | El servidor acepta cualquier desafío del set de ayer dentro de la tolerancia, no solo el que estaba abierto (no lo sabe). Un cliente podría usarla para un desafío que no había abierto. Riesgo acotado al progreso propio. |
| Cierre diario desactualizado | Doc 03 pide marcar desactualizado el cierre de una fecha ya cerrada al llegar un logro tardío. No hay `dailyStats` todavía. |
| `durationMs` | Máximo de 24 h (propuesta). Se guarda; ningún endpoint lo expone. Revisar si hace falta guardarlo. |
| Límite por IP | `GET /day` y `POST /results` no tienen límite (la tabla de doc 03 no los lista). Evaluar con la prueba de carga. |
| Puntaje atrasado al reintentar | Un reenvío responde con el puntaje leído por el guard; con dos logros simultáneos puede quedar atrasado unos ms. El cliente reemplaza el puntaje y lo refresca en el próximo `GET /day`. |
| Zona con horario de verano | `startOfDay` calcula el desfase con dos pasadas; un cambio de hora justo a medianoche no está cubierto (Montevideo no tiene). |

## Autenticación del panel (pendientes)

| Tema | Detalle |
| --- | --- |
| Alcance de "por IP y correo" | Hoy hay UN contador por par IP + correo (10 por 15 min). No frena a quien rota IP contra un mismo correo ni a quien prueba muchos correos desde una IP. Un contador solo por correo permitiría bloquear a una cuenta ajena. Decidir si se agrega un segundo contador (por IP, con valor mayor) y qué se acepta. |
| Vida del refresh token | 7 días con tope absoluto (propuesta). Decidir si debe ser deslizante o más corto. |
| Política de contraseñas | 15 a 128 caracteres sin composición, distinta de la actual (propuesta, ASVS 5.0). Falta decidir si se rechazan contraseñas comunes o filtradas (requeriría una lista local; ningún servicio externo). |
| Costo de argon2id en Cloud Run | Sin medir. Medir latencia de login y memoria con carga concurrente en 512 MiB (cada hash usa 19 MiB; el pool de libuv admite 4 a la vez). |
| Versión de Node en el despliegue | `crypto.argon2` exige Node >= 24.7.0. La imagen de Cloud Run debe fijar una versión 24.x posterior. |
| Access token tras cambiar la contraseña | Un token emitido en el mismo segundo del cambio sigue sirviendo hasta 15 min (granularidad de `iat`). Aceptado. |
| Cambio de contraseña a mitad | Si el proceso cae entre guardar la contraseña y borrar los refresh tokens, los viejos siguen vivos hasta repetir el cambio. Un refresh concurrente podría sobrevivir al borrado (ventana de milisegundos). |
| Carrera de refresh | Con dos refresh simultáneos puede quedar un token vivo en una familia que "debió" revocarse (ventana de milisegundos). Nunca dos exitos. |
| `accountId` en los logs | Doc 03 pide `accountId` en los logs de pedido; el logger solo registra ruta, estado y duración (tampoco registra `playerId`). Falta decidir cómo lo dejan los guards. |
| Rotación de `JWT_SECRET` | Cambiarlo invalida todos los access tokens (los refresh siguen). Sin soporte de dos claves a la vez. |
| Comando `create-admin` | Probado con variables de entorno; el modo interactivo (terminal, sin eco) no se pudo probar sin terminal. Crea otro administrator aunque ya haya uno con otro correo. |
| Invitación por correo, restablecer contraseña, CRUD de cuentas, servicio de alcance | Fuera de esta tarea. Al eliminar o desactivar una cuenta hay que borrar sus `refreshTokens` (hoy el guard ya la rechaza al instante, pero las filas quedan hasta el TTL). |

## Base del panel (pendientes)

| Tema | Detalle |
| --- | --- |
| Validadores de contracts en el navegador | Ajv usa `new Function`: choca con la CSP estricta. Los formularios de mecánicas y el cambio de contraseña (hoy copia a mano 15 a 128) necesitan validadores precompilados (Ajv standalone) generados en `contracts:generate`. |
| CSP real | `apps/panel/public/_headers` tiene `API_ORIGIN` sin reemplazar. No se probó con la CSP puesta (Vite en desarrollo inyecta scripts en línea). Verificar en un build servido con esas cabeceras. |
| Refresh en `sessionStorage` | Duplicar una pestaña copia el refresh token y la rotación con detección de reutilización puede cerrar la sesión. Decidir si importa. |
| Vistas | Todas son "próximamente". `Reglas` la ve el moderator (solo lectura, doc 03); límites por IP van dentro de Reglas y solo para administrator. Falta la vista Rankings en el diseño de Stitch. |
| Textos | Revisión de voseo y copy por la persona responsable. Hay claves de error solo para los códigos de auth; cada vista agrega las suyas. |
| Pruebas pendientes | axe-core en claro y oscuro, e2e con Playwright, prueba del menú móvil y del teclado. No se corrió ninguna. |
| Aceptar invitación | Responde 204 y no entrega sesión: la pantalla manda a ingresar. Confirmar que es lo deseado. |
| Espaciados y `?theme=id` | No son token ni existen. El selector de tema solo aparece con más de un tema registrado. |

## API del panel (pendientes y propuestas, 2026-11-12)

| Tema | Detalle |
| --- | --- |
| Límites por IP efectivos | `PUT /limits` guarda en `settings/limits` pero registro, recuperación y login siguen leyendo la configuración. Falta leerlos de la base con caché de 1 minuto. |
| Envío real de correo | Probado solo con un transporte en memoria. Falta probar Gmail SMTP con una contraseña de aplicación real (y qué pasa con el límite diario de Gmail). |
| `.env.example` | La herramienta no dejó crearlo en la raíz. Las variables están en `apps/api/README.md`; crearlo a mano. |
| Estadísticas | Sin `dailyStats`. Con miles de players hay que pasar al cierre diario perezoso de doc 03. "Logro de ayer" del resumen se entrega como conteos (entraron, con logro, logros), no como porcentaje. El nivel por jugador es el actual, no el de ayer. |
| Pertenencia | Sigue pendiente el comando de verificación y reparación de `groupMemberships` vs `players.groupId` (mover y eliminar grupo dependen de que repetir el pedido repare). |
| Archivar desafíos | No hay desarchivar. Un desafío archivado no se puede publicar en sets nuevos; los sets ya publicados lo conservan. |
| Assets de desafíos | No se valida que el `assetId` exista en el catálogo (no hay manifiesto todavía). |
| Autor eliminado | Al eliminar un moderator sus desafíos quedan con su `authorId` (no hay marca explícita); la lista no dice "autor eliminado". |
| Invitación | Una vigente por correo; sin reenvío automático ni lista de invitaciones pendientes en el panel. Aceptar no abre sesión (204). |
| Cursor de players | Orden por `_id` (aleatorio): el panel debe ordenar dentro de la página. Si se necesita orden por apodo o fecha, cambia el cursor. |
| Alcance del moderator | Un moderator no puede mover players "sin grupo" (no están en su alcance); solo el administrator los asigna. Confirmar con la persona responsable. |
| `ownerIds` | Solo el administrator los cambia (el moderator que crea un grupo queda dueño). Un grupo sin dueño lo maneja solo el administrator. |
| Panel: virtualización | No se virtualizan las columnas del tablero de Grupos (cada una trae hasta 100 jugadores y avisa si hay más). Falta paginar "Sin grupo" y virtualizar cuando haya cientos. |
| Panel: validadores | Los validadores de `@patio/contracts` usan ajv (necesita eval) y no pueden correr con la CSP. Hace falta una versión precompilada (standalone) para los formularios de mecánicas. |
| Panel: mapa de calor | "Logro por desafío y día" es una tabla de conteos; falta el mapa de calor con celdas sombreadas (tokens `seq-*`). |
| Panel: vistas pendientes del resumen | Faltan "tiempo en resolver" por día y la evolución del jugador en gráfico (hoy es tabla). |
| Panel: arrastre | Sin `DragOverlay`: la tarjeta se mueve con transform y puede quedar cortada por el contenedor con scroll horizontal. Las flechas arriba y abajo no hacen nada en el teclado (solo cambian de columna). |
| Panel: favicon | `favicon.ico` da 404 (sin ícono definido). |
| Panel: tamaño | El bundle inicial pesa unos 625 kB (sin medir en producción); falta dividir por rutas el resto. |
| Panel: arrastre en Días | Agregar y ordenar desafíos del set es con botones, sin arrastre (falta `@dnd-kit/sortable`). Confirmar si hace falta arrastrar de la biblioteca al día. |
| Panel: catálogo de assets | Lista local de 12 ids de ejemplo hasta que exista `packages/assets` con manifiesto; el servidor tampoco valida que el `assetId` exista. |
| Panel: vista previa de desafíos | No hay vista previa del desafío en el editor (deseable en doc 06; falta `packages/challenges`). |
| Panel: invitaciones pendientes | No hay `GET /accounts/invitations`, así que Cuentas muestra solo la última invitación enviada en la sesión (con el enlace solo en development). Falta endpoint para listar, reenviar y revocar. |
| Panel: zona horaria | Doc 06 la lista entre las reglas, pero la API no la expone (`PanelRules` no la trae). La pantalla la nombra como dato del servidor, sin campo. |
| Panel: biblioteca de Días | La biblioteca para armar el set trae hasta 100 desafíos activos, con búsqueda local por texto. Falta paginar o buscar en el servidor. |
| Panel: validación de formularios | Los límites de los schemas están repetidos a mano en `challenge-form.ts`, `rules-form.ts` y los formularios de Cuentas (sigue pendiente la versión precompilada de los validadores). |
| Panel: autor eliminado | La lista de Desafíos dice "Otra persona" para cualquier autor ajeno, incluida una cuenta eliminada. |

