# Recursos y assets

## Catálogo cerrado

Las imágenes de juguetes y de desafíos y los audios viven en `packages/assets` y se empaquetan con la app. El moderador elige por `assetId` desde un selector y NO sube archivos. Agregar una imagen requiere publicar la app. (Propuesta pendiente de confirmación: subir archivos exigiría almacenamiento y revisión de imágenes.)

`manifest` por asset: `id`, `name`, `category`, `file`. Un `assetId` que no existe en el manifiesto es un error de validación del desafío.

## Modelos 3D

GLB comprimidos con Draco o Meshopt, texturas KTX2, optimizados con gltf-transform en un paso de build. Pocos polígonos, pocas luces, un solo mapa de sombras, instancias para objetos repetidos. Presupuesto inicial sin medir en `05-juego-frontend.md`.

## Audio

Sin definir qué audio hay (música, efectos, lectura de la consigna). Decisión de producto pendiente. Audio siempre opcional y liviano. La lectura de la consigna en voz alta ayudaría a la accesibilidad.

## Fuentes tipográficas

Autoalojadas, sin CDN. Familia de lectura clara por elegir (candidatas: Atkinson Hyperlegible, Lexend). Confirmar licencia OFL antes de incluir. Subconjunto de caracteres para español (incluye ñ, tildes, ¿ ¡) y `font-display: swap`.

## Íconos

Siempre acompañados de texto o `aria-label`. Biblioteca de íconos sin seguimiento y que se empaqueta (por ejemplo la que usa shadcn/ui). Elegir al implementar.

## Licencias y origen

Todo asset, fuente o modelo registra su licencia y origen en el manifiesto o en un archivo `ASSETS.md`. No incluir material con licencia incompatible con una app para niños en tiendas. Sin imágenes que identifiquen a personas reales.

## Presupuesto de peso

Pocas decenas de MB de texturas en GPU. Descarga inicial del juego web lo más liviana posible: es el primer contacto del niño y corre en Android de gama baja.
