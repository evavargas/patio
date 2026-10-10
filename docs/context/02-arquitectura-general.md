# Arquitectura general

Fuente: documento de arquitectura, partes 1 y 2 (`documentation/Patio_arquitectura.docx`).

## Mapa del sistema

```
apps/game (React + R3F + Rapier + Vite + Capacitor)  --HTTPS /v1-->  apps/api (NestJS, Cloud Run)  --> MongoDB Atlas M0
apps/panel (React + Vite + shadcn/ui)                --HTTPS /v1/panel-->  apps/api
apps/realtime (Colyseus, V2, proceso aparte, Oracle VM)  [no construir ahora]
Estáticos (game web + panel): Cloudflare Pages
```

Un solo servicio NestJS modular en un contenedor. Dos superficies HTTP con autenticación distinta y sin controladores compartidos: `/v1` (juego) y `/v1/panel` (panel).

## Repositorio

Monorepo privado, un solo repo, pnpm workspaces. Turborepo solo si las compilaciones se vuelven lentas.

```
apps/
  game/      src/{app,screens,scene,input,net,perf,lib}   + android/ ios/ (Capacitor)
  panel/     src/{app,features,components,lib}
  api/
  realtime/  (V2)
packages/
  contracts/   JSON Schema, tipos generados, validadores, ejemplos
  api-client/  cliente tipado de la API (juego y panel)
  challenges/  componentes de las 3 mecánicas + evaluación de la regla de logro
  assets/      catálogo cerrado de imágenes y audios + manifiesto
  theme/       tokens, temas claro/oscuro, generador CSS, validador de contraste, ThemeProvider
  config/      tsconfig, eslint, prettier
docs/          contexto, memoria y decisiones de este harness
documentation/ (fuera del repo o enlazada) los .docx originales
```

## Reglas de dependencia (se hacen cumplir con lint)

- Las apps usan paquetes. Los paquetes NUNCA importan de apps.
- `challenges` y `api-client` dependen de `contracts`.
- `assets` y `theme` no dependen de nada del repo.
- `config` es usado por todos.
- Entre apps no hay imports. Lo compartido sube a un paquete.

## Módulos del back (sin ciclos)

| Módulo | Responsabilidad | Depende de |
| --- | --- | --- |
| `auth` | Herramientas puras sin base de datos: argon2id, firmar y verificar JWT, generar tokens y códigos, SHA-256, HMAC. | ninguno |
| `players` | Alta, recuperación, apodo, contadores del jugador y guard por token del jugador. | auth, word-filter |
| `groups` | Grupos y códigos. Incluye el servicio de alcance (qué grupos ve una cuenta). | ninguno |
| `membership` | Todo lo que toca jugador y grupo a la vez: registro con código, unirse, mover, historial, máximo, efecto de borrar un grupo. | players, groups |
| `challenges` | Biblioteca de desafíos, autoría, versiones. | contracts |
| `day-sets` | Set por grupo y fecha: borrador, publicación, bloqueo, resolución del set de un jugador. | challenges, groups |
| `results` | Registro de logros, idempotencia, puntos. | players, day-sets, rules |
| `rules` | Puntos por dificultad, reglas de nivel, zona horaria, tolerancia. Cálculo de nivel = función pura. | ninguno |
| `word-filter` | Lista de palabras prohibidas y validación de apodos. | ninguno |
| `stats` | Cierre diario perezoso, consultas del panel, rankings. | results, groups, players |
| `accounts` | Cuentas del panel: login, refresh rotativo, cambio de contraseña, guard del panel. | auth |
| `platform` | Configuración, reloj, límites por IP, errores, logs, health. | ninguno |

Dentro de cada módulo: controlador (HTTP + validación con el schema) -> servicio (reglas) -> repositorio (MongoDB). Funciones puras con pruebas propias: cálculo de nivel, normalización de apodos, resolución del set del día.

`groups` NO conoce a `players`. `players` y `groups` NO conocen a `membership`. `auth` NO depende de nadie. `accounts` y `players` son independientes entre sí.

## Principios

1. Un solo servicio, escala a cero, se despliega en un paso.
2. Los contratos JSON Schema son la única fuente de verdad. De ellos salen tipos, validadores y cliente.
3. El servidor es la autoridad del tiempo, de las reglas de nivel y de los permisos. El cliente evalúa el logro, el servidor valida formato e idempotencia.
4. Los resultados son la fuente de verdad. Puntaje, conteos y nivel son contadores derivados y recalculables.
5. Pocas operaciones por pedido: Atlas gratuito admite 100 operaciones por segundo.
6. Sin servicios externos en el MVP: sin cola, sin correo, sin analítica. Lo único programado es el respaldo (GitHub Actions).
7. El 3D no toca el estado de React en el bucle de dibujo.
8. Lo que ve el jugador se renderiza SIEMPRE como texto plano, nunca HTML.
9. La API `/v1` solo cambia agregando campos (apps instaladas no se pueden forzar a actualizar).
10. Sin analítica, publicidad ni SDK de terceros en ninguna app.

## Orden de implementación

Back: 1 repo+contratos+platform, 2 reglas y nivel (puras), 3 word-filter y alta de jugadores, 4 grupos/códigos/membership, 5 desafíos y sets, 6 pedir el día y enviar logros, 7 auth del panel + accounts + alcance, 8 endpoints del panel, 9 cierre diario y rankings, 10 límites por IP, despliegue, respaldo, prueba de carga.

Front (numeración continúa): 11 repo+config+contracts, 12 `packages/theme`, 13 prueba de rendimiento 3D (decide el stack), 14 `challenges` y `assets`, 15 juego: arranque/términos/registro/recuperación, 16 juego: patio completo y desafíos, 17 api-client y panel (jugadores y grupos con arrastre), 18 panel: desafíos, calendario, reglas, palabras, 19 panel: resumen, gráficos, rankings, 20 Capacitor Android y pruebas en dispositivos.

La prueba de rendimiento 3D corre en paralelo con el back.
