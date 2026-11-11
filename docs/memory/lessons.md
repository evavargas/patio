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
