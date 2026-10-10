# Nomenclatura

Regla central: en toda la documentación técnica y en el código se usan SIEMPRE tres roles con un único nombre.

| Español | Identificador | Quién es |
| --- | --- | --- |
| jugador | `player` | Quien juega. Se identifica con ID público + token, sin contraseña. |
| moderador | `moderator` | Quien usa el panel con acceso a sus propios grupos. Tiene cuenta con contraseña. |
| administrador | `administrator` | Quien tiene acceso a todas las funciones del panel. Tiene cuenta con contraseña. |

Equivalencias que se leen así pero NO se escriben en documentos técnicos ni en código:

- niño, niña, usuario, usuaria, chico = jugador
- docente, encargado, encargada, maestro, maestra = moderador
- admin = administrador

`moderator` y `administrator` son los dos valores del campo `role` de la colección `accounts`. No existe un tercer rol.

## Dónde sí se puede decir "niño" y "docente"

Solo en texto pensado para personas no técnicas: documento de diseño del producto, textos de la interfaz del juego (lo que lee el niño) y copy del panel si se decide hablarle al docente en su lenguaje. Los identificadores, rutas, valores y colecciones nunca.

## Glosario

| Término | Significado |
| --- | --- |
| desafío (`challenge`) | Unidad de contenido interactiva creada por un moderador. Tiene mecánica, configuración, regla de logro, dificultad, puntos, familia, assets. |
| mecánica (`mechanic`) | Tipo de interacción: `dragDrop`, `numberInput`, `wordDrop`. Conjunto cerrado. |
| familia (`family`) | Etiqueta opcional: `resolver`, `descubrir`, `crear`. No son materias. |
| set del día (`daySet`) | Lista de desafíos publicada para un grupo y una fecha. Sin grupo = set general (lo arma el administrador). |
| juguete (`toy`) | Objeto 3D del patio que abre un desafío. Uno por desafío del set. |
| logro (`result`) | Registro de un desafío logrado. Solo se guarda cuando se logra. |
| acceso (`dayAccess`) | Constancia de que el jugador recibió el set de una fecha. Fija el set de ese día para él. |
| nivel (`level`) | Propiedad derivada del jugador, de 0 a N. Se calcula en el servidor. No viaja al juego. |
| compromiso / avance | Las dos listas de ranking. Compromiso: días que entró y desafíos logrados sobre los disponibles. Avance: nivel y puntaje. |
| cierre diario (`dailyStats`) | Métricas de un día cerrado, calculadas de forma perezosa. |
| código de grupo (`group code`) | 6 caracteres, alfabeto de 31 símbolos. |
| código de recuperación (`recovery code`) | 8 caracteres, mismo alfabeto. Funciona como contraseña del jugador. |
| ID público | 12 caracteres. Lo ven moderadores y administradores. No es credencial. |
| tolerancia de medianoche | Minutos (30 por defecto) tras 00:00 durante los que se acepta un logro del día anterior para el desafío que estaba abierto. |
| tema (`theme`) | Archivo de datos con tokens en modo claro y oscuro. |
| modo (`mode`) | `light`, `dark` o `system`. |

## Alfabeto de códigos

31 símbolos sin los ambiguos 0, O, 1, I, L. Misma definición para código de grupo y de recuperación, en un solo lugar (`auth`).

## Nombres de módulos y renombres ya hechos

`users` pasó a `accounts` (solo cuentas del panel). `admin` pasó a `panel` (superficie HTTP `/v1/panel`, app `apps/panel`). `moderation` pasó a `word-filter`. Los documentos de diseño antiguos pueden usar los nombres viejos: el nombre vigente es el de esta página.
