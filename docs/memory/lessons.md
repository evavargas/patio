# Aprendizajes

Vacío al empezar. Agrega una entrada cuando algo falle, sorprenda o cueste más de lo esperado. Formato:

```
## AAAA-MM-DD, tema corto
- Qué pasó:
- Causa:
- Qué hacer la próxima vez:
- Dónde quedó reflejado (regla, skill, prueba):
```

## Stitch, límites al prototipar
- Qué pasó: Stitch dimensiona los componentes al contenido, regenera el fondo en cada pantalla, no borra versiones por prompt, pierde reglas en prompts largos, filtra su prompt interno de imagen, fuerza 1280 px de ancho en referencias mobile y a veces dice que arregló algo que no arregló. En el panel inventó una pantalla y etiquetas de navegación.
- Causa: es un generador, no un editor de diseño.
- Qué hacer la próxima vez: dar medidas exactas en px, repetir las reglas al final de cada prompt, pedir una pantalla por vez, verificar cada arreglo en la captura y borrar sobrantes a mano.
- Dónde quedó reflejado: `docs/design/stitch/prompts.md`.

## Pruebas intermitentes bajo carga paralela
- Qué pasó: con `pnpm test` completo fallaron al azar pruebas de concurrencia, de límites y de `tools/` (timeouts de 5 s en pruebas con Mongo y ESLint, y una sobre el índice TTL). Pasaban solas y en la corrida siguiente. Subió la frecuencia al sumar las pruebas de `argon2` (CPU) y llegó a 3 fallos en una corrida.
- Causa: límite de 5 s por defecto de vitest, todos los núcleos en paralelo, un solo Mongo compartido y pruebas que consumen CPU. Una de las fallas (límite de registro, 521 ms) no fue de timeout y su causa no está confirmada.
- Qué hacer la próxima vez: ante un rojo intermitente, guardar el mensaje de error completo antes de repetir; no declarar "ruido" sin medir. Revisar bases `patio_test_*` sueltas si una corrida se corta.
- Dónde quedó reflejado: `apps/api/vitest.config.ts` y `tools/vitest.config.ts` (timeouts de 30 s, 4 workers en la API). Cinco corridas seguidas en verde después, sin garantía de que no reaparezca.
