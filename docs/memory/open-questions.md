# Pendientes, riesgos y verificaciones abiertas

Cada fila: qué falta, quién puede resolverlo, qué bloquea. Cuando se cierra, pasa a `decisions.md`.

## Bloquean el inicio del código

| Tema | Detalle | Bloquea |
| --- | --- | --- |
| Dispositivos de prueba | Faltan marca, versión de Android y memoria de cada uno. Con eso se fija el criterio de aprobación de la prueba de rendimiento. | Prueba de rendimiento 3D |
| Versiones exactas del stack | Elegir y fijar versiones compatibles de React, three, R3F, drei, Rapier, Vite, NestJS, Capacitor, Tailwind, shadcn/ui. Verificar compatibilidad en la documentación oficial, no de memoria. | Primer paquete de código |

## Verificar antes de abrir a niños

| Tema | Detalle |
| --- | --- |
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
| Colores, tipografía y temas | Sin definir. Paleta provisional. Fuentes candidatas: Atkinson Hyperlegible, Lexend (confirmar licencia OFL). |
| Formularios del panel | Propuesta: escritos a mano por mecánica. Ajuste respecto del diseño 6.4. Falta confirmar. |
| Catálogo cerrado de assets | Propuesta: el moderador no sube archivos. Falta confirmar. |
| Router y librerías | Zustand en el juego, React Router y TanStack Query en el panel. Confirmar al empezar. |
| Valores reales de dificultades, niveles y reglas | Reemplazar los valores de prueba por los que defina una persona docente. |
| Controles de movimiento para 6 y 7 años | Probar joystick y salto con niños del tramo menor. |
| Cantidad de desafíos por día y duración | Probar con grupos reducidos, sin límite rígido. |
| Invitación por correo a moderadores | Después del MVP. Requiere servicio de correo gratuito. |

## Documentos originales desactualizados (aplicar cuando corresponda)

1. Arquitectura 19.5 y pendientes (sección 24): reflejar "el jugador elige tema", "escena sin tema", "entrada alternativa fuera de alcance", "Tailwind en el juego" y "fuentes autoalojadas".
2. Arquitectura sección 9: unificar `ALLOWED_ORIGINS` y `CORS_ORIGINS`.
3. Diseño 3.6: sigue con `User`, `ModerationList`, rol `admin | docente`. En el código vale la nomenclatura de arquitectura (`accounts`, `word-filter`, `administrator`/`moderator`).
4. Diseño 6.3: el repo sugerido usa `admin/`. Vale `panel/`.
5. Diseño 6.4 y 3.1: formulario generado desde schema y subida de assets, pendientes de confirmar los ajustes de arquitectura 23.

## V2 (no resolver ahora)

Apodos duplicados dentro de un grupo, límite de frecuencia de gestos, silenciar compañeros, evaluación de tiendas para sala cerrada sin chat, rendimiento de dibujar 50 avatares animados, coincidencia horaria (sala vacía).
