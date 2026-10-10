# Tema, modos y accesibilidad

Aplica al juego Y al panel. Los dos comparten formato de tema y nombres de tokens.

## Reglas

1. NINGÚN color, tamaño de letra, radio ni sombra escrito dentro de un componente. Todo sale de tokens (variables CSS). Cambiar de tema no toca componentes.
2. Un tema es un archivo de datos con dos modos: claro y oscuro.
3. Preferencia de modo: `light`, `dark`, `system` (por defecto `system`). Con `system` se sigue al dispositivo y se cambia solo.
4. Se suma un tema nuevo con un archivo y sin cambiar código. El tema por defecto y el propio conviven y se alternan en ejecución.
5. El JUGADOR puede elegir entre temas (decidido), además del modo. El panel muestra el selector de tema solo si hay más de uno registrado.
6. La escena 3D NO cambia con el tema ni con el modo (decidido).
7. Meta de accesibilidad: WCAG 2.2 nivel AA en las dos apps. ARIA solo donde el HTML nativo no alcanza.
8. Estilos: Tailwind en el juego y en el panel, con el mismo preset de tokens (decidido). Fuentes AUTOALOJADAS, sin CDN (decidido).

## `packages/theme`

| Parte | Contenido |
| --- | --- |
| Esquema de tokens | Lista de tokens obligatorios. Un tema incompleto no pasa la validación. |
| Temas | `themes/default.json` y `themes/<nombre>.json`. Agregar un archivo basta. |
| Generador | Paso de compilación que lee `themes/` y produce CSS con variables por tema y modo, más un registro (id y nombre). |
| Validador de contraste | En compilación y CI. Falla si un par texto/fondo baja de 4,5:1 (3:1 para texto grande y componentes de interfaz) en cualquier modo. |
| Proveedor | `ThemeProvider` y `useTheme()`: tema activo, modo elegido, modo efectivo, cambiar tema, cambiar modo. |
| Preset de Tailwind | Mapea tokens a utilidades. shadcn/ui ya usa variables, el panel lo usa sin adaptaciones. |

## Tokens

| Grupo | Tokens |
| --- | --- |
| Superficie y texto | `background`, `surface`, `surface-raised`, `text`, `text-muted`, `border` |
| Acción y estado | `primary`, `primary-contrast`, `accent`, `success`, `warning`, `danger`, `info` (cada uno con variante suave para fondos) |
| Foco | `focus-ring` (contraste mínimo 3:1 contra fondo y elemento) |
| Datos (gráficos) | 6 colores categóricos y escala secuencial de 5 pasos, con valores propios por modo |
| Tipografía | familia, escala en rem, pesos, interlineado |
| Forma y espacio | radios, espaciados, sombras, blanco táctil mínimo (48 dp en el juego) |
| Movimiento | duraciones y curvas, con valor reducido bajo `prefers-reduced-motion` |
| Escena 3D | reservado (cielo y luces); en el MVP NO se aplica |

## Modo claro, oscuro y sistema

- Se guardan dos valores: id del tema y modo. Por defecto: tema por defecto y `system`.
- Modo efectivo: con `system` se lee `prefers-color-scheme: dark` y se ESCUCHA su cambio.
- Se aplica con atributos en el elemento raíz: `data-theme`, `data-mode` y `color-scheme`.
- Persistencia: `localStorage` (web y panel) o Preferences de Capacitor (móvil), con la abstracción de almacenamiento del juego. No se guarda en el servidor en el MVP.
- Sin parpadeo: `theme-init.js`, archivo EXTERNO del mismo origen, síncrono al inicio del `head`. No scripts en línea (la CSP del panel no los permite).
- Android: barra de estado con el plugin StatusBar.
- A verificar en un dispositivo: que `prefers-color-scheme` refleje el modo del sistema dentro del WebView de Capacitor; si no, leerlo del lado nativo.
- Dónde se elige: juego, pantalla Perfil (tres botones con ícono y texto para el modo, y selector de tema); panel, menú de la cuenta. En compilaciones que no son de producción, `?theme=id`. Tema por defecto del build: `VITE_DEFAULT_THEME`.

## Accesibilidad (reglas de implementación)

- HTML semántico primero: `button`, `label`, `fieldset`, `nav`, `main`, títulos en orden.
- Cada pantalla del juego es DOM con `h1` y `main`. Al cambiar de pantalla, el foco va al título (`tabindex="-1"`). Al cerrar un desafío, el foco vuelve al juguete que lo abrió.
- Canvas 3D: `role="img"` con etiqueta corta ("Patio de la escuela"). Joystick y salto son botones con etiqueta. Recorrer el patio con lector de pantalla NO es un caso soportado en el MVP; sí deben funcionar con teclado y lector: desafíos, registro, perfil y todo el panel.
- Arrastre: dnd-kit con sensor de teclado y anuncios. Entrada numérica con `input` nativo, `label` e `inputmode="numeric"`.
- Resultados en región `aria-live="polite"`: "probá otra estrategia" y puntos ganados. Ningún estado depende solo del color: siempre ícono y texto.
- Íconos sin texto con `aria-label`; decorativos con `aria-hidden`.
- Foco visible con `focus-ring`. Blancos táctiles de 48 dp.
- `prefers-reduced-motion`: reducir animaciones, suavizar cámara, detener movers.
- Texto en rem. El panel usable al 200 % de zoom. `<html lang="es-UY">`.
- Gráficos: color más etiqueta o patrón, resumen en texto y tabla.
- `forced-colors` respetado. Un tema de alto contraste se suma como un archivo más.

## Verificación

`eslint-plugin-jsx-a11y` en el lint de las dos apps. `axe-core` en Playwright (panel y pantallas DOM del juego) en claro y oscuro. Validador de contraste en CI para todos los temas. Pasada manual por versión: panel solo con teclado y desafíos y perfil con TalkBack en Android.

## Pendiente

Paleta, tipografía y temas finales sin definir (el tema por defecto parte de una paleta provisional). Fuentes candidatas: Atkinson Hyperlegible, Lexend. Confirmar licencia (OFL) antes de incluirlas.
