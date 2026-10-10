# Visión y alcance

Fuente: documento de diseño del sistema (`documentation/Patio_diseno_sistema_mvp.docx`) y documento de investigación. Si algo de aquí contradice a `docs/memory/decisions.md`, gana el registro de decisiones.

## Qué es Patio

Juego 3D para web y móviles, para niños de 6 a 10 años (caso de uso Uruguay, proyección LATAM). El jugador es un extraterrestre que explora el patio de una escuela. Los juguetes que encuentra esconden desafíos interactivos definidos por un moderador desde un panel web. Entre 3 y 5 por día como referencia, a criterio del moderador. El día termina de forma explícita. El jugador acumula puntaje y el moderador sigue su evolución.

Eslogan: "Un recreo para pensar."

## Criterio de éxito

Evidenciar que el niño puede comprender y resolver mejor ciertos tipos de problemas. NO se mide éxito por tiempo de uso ni por cantidad de sesiones.

## Decisiones de producto cerradas

| Tema | Decisión |
| --- | --- |
| Público | 6 a 10 años, sin separación por edad. Todos empiezan en nivel 0. |
| Plataforma | Web y móviles con un solo código. Android primero, iOS al final. Requiere conexión: no hay modo offline. |
| Escenario | Patio de escuela 3D al atardecer. Movimiento libre, salto y cámara en tercera persona. La escuela se ve pero no se entra. |
| Juguetes | Uno por desafío, posición e imagen aleatorias (semilla: hash de playerId + fecha). El moderador no define posiciones ni imágenes. |
| Mecánicas | Exactamente tres, conjunto cerrado: `dragDrop` (arrastrar objetos), `numberInput` (entrada numérica), `wordDrop` (arrastrar palabras). No se prevén mecánicas nuevas. |
| Tiempo | Día de 24 h, de 00:00 a 00:00, zona America/Montevideo (configurable). La hora la da el servidor. Tolerancia de medianoche: 30 min por defecto, editable por el administrador. |
| Puntaje | Puntos fijos por dificultad (o por desafío). Se suma al lograr. Sin rachas, sin puntos variables, sin penalidades. El jugador ve los puntos ganados, el total en el cierre y en el perfil. No hay contador permanente. |
| Nivel | De 0 a N, configurable. Solo sube. El jugador NO ve su nivel. Lo ven moderadores y administradores. |
| Resultado | Solo "logrado" o "no logrado". No se cuentan ni se guardan intentos, errores ni abandonos. |
| Datos | ID aleatorio generado por el servidor + apodo moderado. Sin email, sin ubicación, sin nombre real, sin fecha de nacimiento. |
| Acceso | Casilla de términos y condiciones. No se valida presencia de adulto, no hay consentimiento parental. |
| Grupo | Código opcional de 6 caracteres. El jugador entra directo, sin aprobación. No puede cambiar de grupo: solo unirse si no tiene. Moderadores y administrador lo mueven. |
| Panel | Dos roles: administrator y moderator. Crear desafíos, armar sets por grupo y día, organizar jugadores arrastrando, tableros de progreso. |
| Rankings | Solo en el panel (compromiso y avance). El jugador nunca ve rankings. |

## Dentro del MVP

1. App web y móvil con onboarding mínimo: términos, apodo validado con lista de palabras prohibidas, código de grupo opcional.
2. Patio 3D con movimiento libre, salto, colisiones, objetos decorativos que se mueven, juguetes aleatorios y reloj.
3. Tres mecánicas de desafío.
4. Desafíos configurables desde el panel sin programar.
5. Día definido por el moderador: cantidad, dificultad y texto.
6. Puntaje, dificultades y niveles configurables.
7. Panel con dos roles: desafíos, sets por grupo y día, grupos con códigos, asignación por arrastre, moderación de apodos y palabras prohibidas.
8. Tableros: registros en el tiempo, logro por desafío y día, rankings, ficha del jugador.
9. Código de recuperación (8 caracteres) visible en el perfil, reemitible por moderador o administrador.
10. Cierre explícito de la sesión ("Terminaste tu recreo").

## Fuera del MVP (no implementar, no proponer)

Modo offline. Cuentas o email para niños. Chat y contenido generado por usuarios. Rankings o rachas visibles al jugador. Publicidad y compras. Mecánicas nuevas (la de inclinar el celular se descartó). Posicionar juguetes a mano. Registro de intentos, errores y abandonos. Notificaciones push. Selector automático de desafíos. IA que publique desafíos. Mostrar el nivel al jugador. Publicación en iOS (después). Entrada alternativa a caminar (decidido: fuera de alcance, no se persigue).

## Versión 2 (no construir ahora)

Sala de eventos del colegio: el jugador ve en vivo a compañeros de su grupo, con gestos fijos (sonrisa, saludo, cara de loco, guiño), sin chat. Colyseus en un proceso aparte (`apps/realtime`), una sala por grupo, hasta 50, en una VM siempre encendida (Oracle Always Free, a verificar). Los gestos no se guardan. El MVP no debe cerrar esa puerta pero tampoco prepararla con código.

## Primera tarea de código

Prueba de rendimiento del patio 3D (skill `perf-gate-3d`). Es el punto de decisión del stack: si no cumple en Android de gama baja dentro del WebView, plan B con Unity (API, contratos, base y panel se mantienen; escena y mecánicas se reimplementan).
