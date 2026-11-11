# Prototipo visual de pantallas (Stitch)

Este documento resume el prototipo de diseño hecho en Stitch para el juego y para el panel. Es un prototipo visual: importan colores, tipografía, tamaños, estructura e intención de cada mensaje. Los textos son provisorios y los revisa la persona responsable pantalla por pantalla (voseo o tuteo incluidos).

Convención: **DECIDIDO** lo que la persona responsable confirmó. **PROPUESTO** lo que salió de la conversación de diseño y falta validar. Los prompts usados están en `docs/design/stitch/prompts.md` y el sistema de diseño exportado en `docs/design/stitch/DESIGN-patio-uruguayo-sunset.md`.

Proyectos de Stitch: juego, "Patio Educational Game UI Kit", ID `13384218339571647708` (https://stitch.google.com/projects/13384218339571647708). Panel, "Patio Game Admin Panel", ID `3714659169895305440` (https://stitch.google.com/projects/3714659169895305440).

## 1. Juego

### 1.1 Decisiones (DECIDIDO)

- Al terminar el día, el player puede caminar libremente por el patio. No hay límite de tiempo forzado ni salida forzada. Los juguetes quedan apagados y sin interacción. Se muestra un mensaje muy amable que dice que puede seguir practicando la próxima vez. Sin chip de hora.
- Salir de un desafío sin responder solo lo cierra. No cambia el estado ni los logros, y el desafío se puede volver a abrir.
- El perfil contiene cambio de tema, ajustes de sonido e idioma y un botón "ver tutorial".
- Hay pantallas de tutorial de primera vez, pantalla de carga, referencia mobile (teléfono) y patio con los juguetes apagados.
- Los moderators entran por invitación por correo (Gmail SMTP, dentro del MVP). La pantalla de registro del panel es "aceptar invitación".
- El juego y el panel usan i18n, con español `es-UY` por defecto e inglés. Rankings y nivel se ven en el panel y no en el juego.

### 1.2 Pantallas

| N° | Pantalla | Intención |
| --- | --- | --- |
| 1 a 6 | HUD, desafíos (tres mecánicas), logrado, no logrado | Hechas al inicio. Sus prompts no se conservaron (ver `prompts.md`) |
| 7 | Fin del día | Dock con los juguetes logrados (3 íconos de caja abierta) y puntos. Después, caminar libre |
| 8 | Sin desafíos hoy | Dock con ícono de luna creciente. Sin juguetes en escena |
| 9 | Arranque | Entrada al juego |
| 10 | Términos | Casilla de aceptación (no hay consentimiento parental) |
| 11 | Registro | Apodo de texto libre (filtro de palabras prohibidas en el servidor) |
| 12 | Código secreto | Entrega del código de recuperación |
| 13 | Recuperar acceso | Ingreso con código |
| 14 | Perfil | Apodo, puntaje, código, tema, sonido, idioma, ver tutorial |
| 15 | Error amable | Mensaje de error sin rojo |
| 16a, 16b, 16c | Tutorial | Moverse, saltar, tocar un juguete. Anillo pulsante más dock |
| 17 | Carga | Alien caminando y barra indeterminada, sin porcentaje |
| 18 | Patio con juguetes apagados | Estado posterior al fin del día |

Faltan verificar en el tablero de Stitch cuáles de estas pantallas existen y borrar duplicados (Stitch no permite borrar versiones por prompt).

### 1.3 Patrones de interfaz

DECIDIDO:

- Los colores de realimentación no son rojo ni verde. Cierre en durazno, calma o error en lavanda.
- El player nunca ve su nivel. Los resultados son solo logrado o no logrado.

PROPUESTO:

- **Message Dock**: panel fijo abajo para todos los mensajes del sistema. En el canvas de 1280 x 1024 mide 1232 x 220, en x=24 e y=780. Crema, radio de 32 px, relleno de 40 px. Columna de ícono de ancho fijo de 160 px, separación de 24 px, columna de texto que empieza siempre en el mismo x, botón de 72 px a la derecha. Así el ícono no mueve el texto entre mensajes.
- Superficie crema translúcida con desenfoque de 16 px. Tiene costo de rendimiento: medir antes de adoptarla.
- Para "no logrado": franja persistente dentro del panel del desafío, en durazno, nunca roja. Para "logrado": el desafío se cierra, el personaje celebra y el juguete se abre.
- El personaje es un personaje vivo en la escena. Los mockups son cuadros congelados (ojos abiertos, de pie, sin pose fija).
- Joystick y botón de salto se ocultan mientras hay un dock abierto.
- Salir de un desafío: botón X redondo de 56 px, sin confirmación.
- Cámara: mientras hay un dock abierto, la cámara 3D sube al personaje a la zona libre sobre el dock.

### 1.4 Referencia mobile (teléfono horizontal)

Todo PROPUESTO. Validar en un dispositivo real (iPhone 8 y Android 12 son el mínimo).

| Elemento | Valor |
| --- | --- |
| Canvas | 915 x 412 dp |
| Botón principal | 56 dp, texto de 18 sp en negrita |
| Título de dock | 20 sp en negrita, línea de 16 sp |
| Dock | 883 x 112 dp en x=16, y=284 (sin decidir 112 o 96) |
| Relleno y radio del dock | 20 y 24 |
| Columna de ícono | 80 dp |
| Joystick, salto, botones redondos superiores | 120, 72, 48 |
| Área táctil mínima | 48 dp |

Stitch fuerza un marco de 1280 px de ancho para las referencias mobile. El contenido a 915 queda correcto y se recorta al exportar.

## 2. Panel de moderators y administrators

Proyecto de Stitch aparte del juego, reutilizando paleta y fuente del juego. Los textos son provisorios.

### 2.1 Sistema de diseño (PROPUESTO)

- Escritorio 1440 x 900. Lexend: título 24, sección 20, cuerpo 16, tabla 14, ayuda 13.
- Fondo #FFF9EE, tarjetas blancas con borde de 1 px #E5DAC2, primario #35599D.
- Radio 16 en tarjetas y 12 en campos y botones. Barra lateral de 240 px, barra superior de 64 px. Botones de 44 px, campos de 48 px, filas de 56 px.
- Rojo solo para acciones destructivas y errores del sistema, siempre con texto. Los estados llevan texto, no solo color.
- Verificar que el azul que generó Stitch coincida con #35599D.

### 2.2 Pantallas

1. Ingreso.
2. Aceptar invitación.
3. Panel principal: jugadores y grupos, tres tarjetas de resumen, con "por revisar" en lavanda.
4. Desafíos: tabla y tarjeta lateral de 320 px con el conjunto del día.
5. Editor de desafíos: tres tarjetas de mecánica (arrastrar, número, palabra), enunciado, campos por pasos, mensaje amable, vista previa de lo que ve el player y lista de validación.
6. Métricas: agregadas. Jugadores activos, tasa de logro por mecánica, desafíos con menor logro, mediana de duración de sesión como contrapeso de bienestar. Sin retención ni rachas. Rankings y nivel por player viven en Jugadores y en una vista de Rankings, no aquí.

Navegación propuesta: Jugadores, Rankings, Desafíos, Métricas, Moderadores, Ajustes (Rankings es nuevo respecto del prototipo en Stitch).

Stitch inventó una pantalla "Moderación y Actividad" con filas por player y marcas de hora. No se pidió: DECIDIDO borrarla del proyecto de Stitch y no implementarla.

## 3. Conflictos resueltos y abiertos

Resueltos por la persona responsable (ver `docs/memory/decisions.md`): invitación por correo dentro del MVP con Gmail SMTP; rankings y nivel visibles en el panel y no en el juego; i18n en juego y panel (español por defecto e inglés); borrar "Moderación y Actividad".

Abiertos (en `docs/memory/open-questions.md`):

- Las vistas listadas en `06` (Resumen, Jugadores, Grupos, Rankings, Desafíos, Días, Reglas, Palabras prohibidas, Cuentas) difieren de la navegación del prototipo.
- La métrica de mediana de duración de sesión necesita un dato que hoy el servidor quizá no guarda.
- Falta elegir la librería i18n y verificar el límite diario de Gmail SMTP.
- El tuteo del DESIGN.md exportado difiere del voseo de los prompts. Lo definirá la revisión de textos.

## 4. Pendientes

- Borrar a mano en Stitch la pantalla "Moderación y Actividad" del proyecto del panel (las herramientas disponibles no borran pantallas sueltas).
- Verificar el tablero de Stitch y borrar duplicados. Reencuadre del alien en la referencia mobile B aún en generación.
- Enviar a Stitch los arreglos del panel (navegación, desborde de la pantalla 4, espaciado de la pantalla 2) y las pantallas nuevas 5 y 6.
- Probar los valores en dp en un dispositivo real. Falta el modelo Android más modesto. iOS máximo en iPhone 8 sin verificar.
- Confirmar licencia OFL de Lexend.
- Completar los prompts de la base del juego y de las pantallas 1 a 6.
