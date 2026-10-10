# Contenido, reglas de juego y bienestar infantil

Esta página concentra las reglas de producto que el código debe respetar. Es el filtro del agente `wellbeing-reviewer` y del skill `wellbeing-check`.

## Principios de bienestar (marco RITEC)

| Principio | Cómo se aplica |
| --- | --- |
| Seguridad | Sin chat, sin contacto con desconocidos, sin contenido generado por usuarios salvo el apodo, sin publicidad. Apodo guardado en el servidor, moderado por lista de palabras, cambiable por el administrador. |
| Autonomía | Explora a su ritmo. Puede cambiar de estrategia y seguir probando sin que se cuenten intentos. |
| Competencia | Feedback claro que invita a probar otra estrategia. No lograr no resta puntos ni nivel. |
| Emociones | El error es información, no castigo. |
| Creatividad | Desafíos con más de una forma de resolver cuando sea pedagógicamente válido. |
| Identidad e inclusión | Representaciones diversas sin pedir datos personales. Textos breves, audio opcional, assets livianos. |
| Relaciones | Sin comparación entre jugadores en la pantalla del jugador. En V2, presencia cooperativa con gestos fijos, sin chat. |

## Lo que NO se optimiza (prohibido introducir)

Tiempo total de pantalla. Cantidad de sesiones como único indicador de éxito. Rachas y recompensas variables. Estímulos para "volver ahora". Cuentas regresivas con urgencia. Notificaciones para volver. Scroll o feed infinitos y autoplay. Rankings o comparación entre jugadores en la pantalla del jugador. Publicidad o compras dirigidas a niños.

Diseño de salida: la experiencia tiene un final explícito. "Terminaste tu recreo" es un cierre de producto: no bloquea volver, pero no intenta prolongar la sesión. No hay estímulos para seguir.

## Tono de los textos para el jugador

Breve, amable, sin lenguaje técnico. Nunca "respuesta incorrecta". Nunca da la solución. Ejemplos:

| En lugar de | Patio propone |
| --- | --- |
| "Resuelve 17 + 8." | "Tenemos 17 objetos y debemos repartirlos. ¿Cómo lo harías?" |
| "Respuesta incorrecta." | "Esa forma deja 2 sin repartir. ¿Qué otra estrategia podrías probar?" |
| "Juega otra vez para mantener tu racha." | "Terminaste tu recreo. Vuelve cuando haya otro desafío." |

Errores de red, servidor caído o demasiados intentos: mensajes simples y amables, sin pantallas técnicas. Los mensajes de apodo no dicen qué palabra falló.

## Reloj

Se muestra de forma tranquila (texto "El patio abre en 7 h" o un atardecer que avanza). Sin animaciones de urgencia. Sin penalidad por no completar el día. Los desafíos no logrados vencen al terminar el día: no se registran ni restan. Si no hay set del día siguiente: "Vuelve pronto", sin hora.

## El día y el set

- Un set por grupo y fecha, armado por su moderador. Sin grupo: set general del administrador. Precedencia: set del grupo, si no el general, si no "sin set".
- Referencia de 3 a 5 desafíos. Fuera de rango es un AVISO en el panel, nunca un error.
- Cada desafío del set es un juguete. Los desafíos son todos interactivos.
- Estados: Borrador, Publicado, Bloqueado (`lockedAt` al abrirlo el primer jugador), Cerrado (automático al terminar el día). El moderador edita solo antes de que lo abra el primer jugador.
- El set queda fijo desde el primer ingreso del jugador ese día, aunque lo muevan de grupo.
- El nivel NO decide qué desafíos ve el jugador. Un set distinto por nivel dentro de un grupo está fuera del MVP.
- Un mismo desafío puede usarse en varios días y grupos.

## Desafío: campos

`text` (consigna), `mechanic`, `config` (con la regla de logro), `difficulty` (1 a N), `points?` (por defecto el de la dificultad), `family?` (`resolver`, `descubrir`, `crear`), `learningObjectives[]`, `assets[]` (del catálogo cerrado), `audioAssetId?`, `authorId`, `version`, `status`. La biblioteca es común: todos ven y duplican, solo autor y administrador editan.

## Puntaje y nivel

- Puntos fijos por dificultad (o por desafío). Cada desafío logrado suma, incluso si apareció en otro día; dentro de un set una sola vez por jugador. No premia velocidad ni cantidad de sesiones.
- Nivel de 0 a N, solo sube. Para salir del nivel L deben cumplirse TODOS los requisitos: cada uno es un mínimo de desafíos logrados de dificultad D y opcionalmente de una familia; puede sumarse un puntaje mínimo. Los conteos son acumulados, así que un jugador puede subir varios niveles de una vez. Función pura y con pruebas, incluidos saltos múltiples.
- Regla de ejemplo (ilustrativa): de 3 a 4 = 3 desafíos de Resolver dificultad 3, 2 de Crear dificultad 3 y 350 puntos.
- Todos empiezan en nivel 0 sin preconfiguración. El jugador no ve su nivel.

## Moderación de apodos

Lista de palabras prohibidas administrada en el panel, siempre editable, ARRANCA VACÍA (advertir que conviene cargarla antes de abrir a niños). Comparación por palabra completa, solo se normalizan mayúsculas y tildes; también bloquea números y patrones de nombre completo. Se valida mientras el jugador escribe (lista descargada con versión) y el servidor repite la validación. Máximo 20 caracteres. El jugador no puede cambiar su apodo; lo hace el administrador.

## Grupos y códigos

Código de 6 caracteres. El jugador entra directo, sin aprobación. Errores amables si no existe, está inactivo o lleno. Máximo 50 por grupo (configurable). El moderador puede regenerar o desactivar el código y sacar a un jugador (vuelve a "Sin grupo"). El administrador mueve a un grupo lleno.

## Términos

Pantalla dentro de la app con casilla de aceptación antes de jugar. Se guarda versión y fecha. La redacción de los textos está pendiente.
