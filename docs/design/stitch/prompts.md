# Prompts usados en Stitch

Registro de los mensajes que se pegaron en Stitch para armar el prototipo visual. Sirve para rehacer o ajustar una pantalla si el proyecto de Stitch se pierde. No es documentación del producto: lo decidido está en `docs/design/prototipo-pantallas.md` y en `docs/memory/decisions.md`.

Cómo leerlo:

- Los prompts están en inglés porque así se pegaron en Stitch. Los títulos son nuestros.
- Los textos entre comillas dentro de los prompts son provisorios (muchos son "Lorem ipsum" a propósito). Los textos finales los revisa la persona responsable pantalla por pantalla.
- Cada prompt termina con la regla de no agregar textos ni íconos no pedidos. Stitch tiende a inventar elementos, y esa línea lo frena. Hay que repetirla en cada mensaje.
- Las pantallas se piden de a una y en orden. Si se piden varias juntas, Stitch pierde reglas.
- Faltan en este archivo el prompt base del juego y los de las pantallas 1 a 6 (HUD, desafíos, logrado y no logrado). Se pegaron al principio del trabajo y su texto no se conservó. El resultado vive en el proyecto de Stitch del juego. A completar si hace falta rehacerlos.
- Los tamaños en px de la sección mobile son propuestas, no decisiones (ver el documento de diseño).


## Juego

### Pantalla 7, Fin del día (reemplazo)

```
Replace Screen 7 (End of day). Same design system and same screen size. The 3D Uruguayan school yard at sunset, lavender and coral sky. The alien is STANDING in the middle of the yard, three-quarter view, eyes wide open and bright, relaxed smile, an alert idle pose as if he could walk at any moment. The 4 toy boxes are in the yard, all closed and dim, with no glow.

Use the same fixed Message Dock as the other screens (1232 x 220 px, x=24, y=780, cream, 32px radius, button 72px). Texts: title "Terminaste tu recreo", line "Hoy lograste 3 juguetes y 30 puntos. Podés seguir practicando la próxima.", button "Listo". The alien must be fully visible above the dock. Do not show the joystick or the jump button on this screen.

Do not add any text, chip, label or icon that I did not write explicitly. No "play again", no stars, streaks, rankings, timers, hints, solutions, attempt counters or red error states.
```

### Pantalla 8, Sin desafíos hoy (reemplazo)

```
Replace Screen 8 (No challenges today). Same design system and screen size. The same sunset yard, with NO toy boxes. The alien is STANDING, three-quarter view, eyes wide open and bright, looking curiously at the sky, alert idle pose.

Use the same fixed Message Dock as Screens 5 and 7 (1232 x 220 px, x=24, y=780). Texts: title "Volvé pronto", line "Hoy el patio está tranquilo. Podés pasear todo lo que quieras.", button "Listo". Top-right, the same small round profile button used in Screen 1. No hour chip or countdown. Do not show the joystick or the jump button on this screen.

Do not add any text, chip, label or icon that I did not write explicitly. No streaks, rankings, timers, hints, solutions, attempt counters or red error states.
```

### Message Dock: superficie translúcida (pantallas 5, 7 y 8)

```
Update the Message Dock component in ALL screens where it appears (Screens 5, 7 and 8). Keep the exact same size and position (1232 x 220 px, x=24, y=780, 32px radius, 40px padding). Change only the surface: translucent warm cream (about 90% opacity) with a soft background blur of 16px and a thin 1px light border. Text must stay dark and fully legible (contrast at least 4.5:1). Do not change any text, button or layout.

Do not add any text, chip, label or icon that I did not write explicitly.
```

### Pantalla 7: íconos de juguetes logrados en el dock

```
Update Screen 7 (End of day). In the Message Dock, add on the left side, before the title, a row of exactly 3 small open toy-box icons (about 48 px each, soft peach and gold, no glow, no sparkles). No empty slots, no numbers beside them. Add a thin peach accent line at the top edge of the dock. Keep every text and the "Listo" button as they are.

Do not add any other text, chip, label or icon. No stars, streaks, rankings, timers, hints, solutions, attempt counters or red or green states.
```

### Pantalla 8: ícono de luna en el dock

```
Update Screen 8 (No challenges today). In the Message Dock, add on the left side, before the title, one small crescent moon icon (about 48 px, soft lavender, flat style). Add a thin lavender accent line at the top edge of the dock. Keep every text and the "Listo" button as they are.

Do not add any other text, chip, label or icon. No stars, streaks, rankings, timers, hints, solutions, attempt counters or red or green states.
```

### Message Dock: columna fija para el ícono (pantallas 7 y 8)

```
Fix the leading icon slot in the Message Dock of Screens 7 and 8 so that the message text starts at EXACTLY the same x position in both.

Rule: the dock has a fixed leading slot that is always 160 px wide, regardless of its content. Layout, from left to right inside the dock (1232 x 220 px, 40 px padding):
- Leading slot: 160 px wide, full dock height, its content centered both horizontally and vertically inside the slot.
  - Screen 7: the row of 3 small open toy-box icons (48 px each, 8 px gap) centered in the slot.
  - Screen 8: the crescent moon inside its 80 px soft lavender circle, centered in the slot.
- 24 px gap.
- Text column: title and line, both left-aligned to the same left edge, vertically centered. This left edge must be at the same x in Screen 7 and Screen 8 (40 px + 160 px + 24 px from the left edge of the dock).
- "Listo" button: 72 px high, aligned to the right, vertically centered.
Icons must never change the start of the text column.

Keep the text, the translucent surface, the accent lines, and the dock size and position unchanged. In Screen 7, make sure the line "Hoy lograste 3 juguetes y 30 puntos. Podés seguir practicando la próxima." fits without making the dock taller.

Do not add any text, chip, label or icon that I did not write explicitly. No streaks, rankings, timers, hints, solutions, attempt counters or red or green states.
```

### Pantalla 9, Arranque

```
Create Screen 9 (Splash). Same design system, same screen size and same sunset yard background as Screen 1. The alien is STANDING in the middle of the yard, three-quarter view, eyes wide open, a small wave with one hand. Centered above the alien, the word "Patio" as a logo in the same rounded font, large, cream with a soft shadow. Below the alien, one primary pill button 72 px high, blue, text "Lorem ipsum". No other elements.

Do not add any text, chip, label or icon that I did not write explicitly. No streaks, rankings, timers, hints, solutions, attempt counters or red error states.
```

### Pantalla 10, Términos

```
Create Screen 10 (Terms). Same design system and screen size. Background: the same sunset yard, slightly blurred, no alien. A centered cream panel about 70% of the screen width, 32 px radius. Inside: a title "Lorem ipsum dolor", three short paragraphs of "Lorem ipsum dolor sit amet, consectetur adipiscing elit." (large readable text, at least 24 px), then a large checkbox (56 px) with the label "Lorem ipsum dolor sit amet", and below it a primary pill button 72 px high, text "Lorem ipsum", disabled look until the checkbox is on.

Do not add any text, chip, label or icon that I did not write explicitly. No streaks, rankings, timers, hints, solutions, attempt counters or red error states.
```

### Pantalla 11, Registro

```
Create Screen 11 (Register). Same design system, screen size and blurred yard background as Screen 10. Centered cream panel, 32 px radius. Inside, from top to bottom: title "Lorem ipsum"; a text field with label "Lorem ipsum" and placeholder "Lorem ipsum dolor" (nickname, 64 px high); a second text field with label "Lorem ipsum" and the small note "Lorem ipsum dolor sit amet" (optional group code, 6 characters, shown as 6 empty boxes); and a primary pill button 72 px high with text "Lorem ipsum". Small alien head icon (48 px, same character) at the top-left of the panel.

Do not add any text, chip, label or icon that I did not write explicitly. No streaks, rankings, timers, hints, solutions, attempt counters or red error states.
```

### Pantalla 12, Código secreto

```
Create Screen 12 (Secret code). Same design system, screen size and blurred yard background. Centered cream panel, 32 px radius. Inside: title "Lorem ipsum dolor"; one line "Lorem ipsum dolor sit amet, consectetur adipiscing elit."; the code "A7K2-M9QX" in very large bold letters, inside a soft lavender rounded box with generous padding; one secondary pill button "Lorem ipsum" (copy) and one primary pill button "Lorem ipsum" (continue), both 72 px high, side by side.

Do not add any text, chip, label or icon that I did not write explicitly. No streaks, rankings, timers, hints, solutions, attempt counters or red error states.
```

### Pantalla 13, Recuperar acceso

```
Create Screen 13 (Recover access). Same design system, screen size and blurred yard background. Centered cream panel, 32 px radius. Inside: title "Lorem ipsum"; one line "Lorem ipsum dolor sit amet."; a code field made of 8 empty boxes, each 56 px, with a dash after the fourth; a primary pill button 72 px high with text "Lorem ipsum"; and below, a small text link "Lorem ipsum".

Do not add any text, chip, label or icon that I did not write explicitly. No streaks, rankings, timers, hints, solutions, attempt counters or red error states.
```

### Pantalla 15, Error amable

```
Create Screen 15 (Friendly error). Same design system, screen size and sunset yard background as Screen 7. The alien STANDING in the yard, three-quarter view, eyes open, calm and slightly puzzled expression (a small head tilt). No toy boxes.

Use the same Message Dock as Screens 7 and 8 (1232 x 220 px, x=24, y=780, translucent cream, 32 px radius, 40 px padding), with a fixed 160 px leading slot, a 24 px gap and the text column starting at the same x as in those screens. In the leading slot, centered: a small cloud icon (about 44 px) inside a soft lavender circle of 80 px. Text: title "Lorem ipsum dolor", line "Lorem ipsum dolor sit amet, consectetur adipiscing elit.". Button "Listo", 72 px high, right, vertically centered. A thin lavender accent line on the top edge.

Do not add any text, chip, label or icon that I did not write explicitly. No streaks, rankings, timers, hints, solutions, attempt counters, and never red or green states.
```

### Pantalla 16a, Tutorial: moverse

```
Create Screen 16a (First-time tutorial, step 1). Same design system, screen size and sunset yard as Screen 1, with the full HUD visible (joystick bottom-left, jump button bottom-right, profile button top-right, no hour chip). The alien STANDING in the yard, three-quarter view, eyes open, small wave. Around the joystick, a soft pulsing ring in warm peach (about 40 px wider than the joystick), like a highlight. Everything else in the HUD is slightly dimmed.

Use the same Message Dock as Screens 7 and 8 (1232 x 220 px, x=24, y=780, translucent cream, 32 px radius, 160 px leading slot, 24 px gap, text column at the same x). Leading slot: a small hand icon in a soft lavender circle of 80 px. Text: title "Lorem ipsum dolor", line "Lorem ipsum dolor sit amet.". Button "Lorem ipsum", 72 px, right, centered vertically. Thin peach accent line on the top edge. The joystick must stay fully visible above the dock.

Do not add any text, chip, label or icon that I did not write explicitly. No step counters, streaks, rankings, timers, hints, solutions, attempt counters or red or green states.
```

### Pantalla 16b, Tutorial: saltar

```
Create Screen 16b (First-time tutorial, step 2). Copy Screen 16a exactly, but the pulsing peach ring is now around the jump button (bottom-right) instead of the joystick, and the alien is mid-jump, feet off the ground, eyes open, arms up. Dock leading slot: a small up-arrow icon in the same lavender circle. Same dock texts and layout. The jump button must stay fully visible above the dock.

Do not add any text, chip, label or icon that I did not write explicitly. No step counters, streaks, rankings, timers, hints, solutions, attempt counters or red or green states.
```

### Pantalla 16c, Tutorial: tocar un juguete

```
Create Screen 16c (First-time tutorial, step 3). Copy Screen 16a, but add one open-ready toy box in the yard, glowing softly, with a soft pulsing peach ring around it, and the alien standing next to it. The joystick and jump button are visible but dimmed. Dock leading slot: a small toy-box icon in the same lavender circle. Same dock texts and layout, but the button text is "Lorem ipsum".

Do not add any text, chip, label or icon that I did not write explicitly. No step counters, streaks, rankings, timers, hints, solutions, attempt counters or red or green states.
```

### Pantalla 17, Carga

```
Create Screen 17 (Loading). Same design system and screen size. The sunset yard background, slightly blurred. In the center, the alien seen from the side, mid-stride in a walking pose, eyes open, smiling. Below him, a thin soft indeterminate loading bar (about 320 px wide, lavender track, peach moving segment), with no percentage. Under the bar, one small line "Lorem ipsum dolor". Top-center: the word "Patio" as a logo, cream, with a soft shadow.

Do not add any text, chip, label or icon that I did not write explicitly. No percentages, countdowns, tips, streaks, rankings, timers, hints, attempt counters or red or green states.
```

### Pantalla 18, Patio con los juguetes apagados

```
Create Screen 18 (Yard after the day ends). Copy Screen 1 exactly (same sunset yard, same HUD with joystick bottom-left, jump button bottom-right and round profile button top-right), with these changes: the 4 toy boxes in the yard are all closed and dim with no glow; the hour chip at the top is REMOVED; there is no speech bubble and no Message Dock. The alien STANDING in the middle of the yard, three-quarter view, eyes open, relaxed.

Do not add any text, chip, label or icon that I did not write explicitly. No streaks, rankings, timers, hints, solutions, attempt counters or red or green states.
```

### Pantalla 14, Perfil con tema, sonido, idioma y tutorial (reemplazo)

```
Replace Screen 14 (Profile). Same design system, screen size and blurred yard background. A cream panel about 90% of the screen, 32 px radius, in TWO columns. Top-right of the panel, a round close button of 64 px.
Left column: the alien head (80 px) in a soft green circle next to the nickname "Lorem ipsum" in large bold letters. Below, two rows with a small label and a value: "Lorem ipsum" / "ABC123" and "Lorem ipsum" / "A7K2-M9QX".
Right column, from top to bottom: a section "Lorem ipsum" with 3 theme cards of 96 px (each a small rounded swatch in a different soft palette), the middle one selected with a thick blue ring and a check; a section "Lorem ipsum" with two rows, each with a label "Lorem ipsum" and a switch of 56 px (music on, effects on); a section "Lorem ipsum" with a segmented control with two options, "Español" selected and "English"; and at the bottom one secondary pill button 72 px high, "Lorem ipsum" (see tutorial).

Do not show any level, points, history, ranking, badge or stats. Do not add any text, chip, label or icon that I did not write explicitly. No streaks, timers, hints, solutions, attempt counters or red error states.
```

### Desafíos: botón para salir (las tres mecánicas y el estado no logrado)

```
Update the three challenge screens (drag and drop, number input, word drop) and the "not achieved" state. In each challenge panel, add one round close button of 56 px at the top-right corner of the panel, 16 px from the edges, with a simple "x" icon in dark blue on a soft peach circle. Do not add any text next to it, no confirmation dialog and no warning. The "Listo" button and the inline message strip stay exactly where they are. Make sure the close button does not overlap the panel title.

Do not add any other text, chip, label or icon. No streaks, rankings, timers, hints, solutions, attempt counters or red or green states.
```

### Referencia mobile A: HUD

```
Create a new reference screen "Phone reference HUD" in landscape at exactly 915 x 412 px (a real phone, not a tablet). The sunset yard, the alien STANDING in the middle (three-quarter view, eyes open) and one glowing toy box next to him. HUD with these exact sizes:
- Joystick: 120 px, bottom-left, 24 px from the left and bottom edges.
- Jump button: 72 px, bottom-right, 24 px from the right and bottom edges, with the same up-arrow icon as the main game HUD.
- Round profile button: 48 px, top-right, 16 px from the edges.
- Hour chip: top-center, 40 px high, text "Lorem ipsum" at 16 px.
No Message Dock on this screen.

Do not add any text, chip, label or icon that I did not write explicitly. No streaks, rankings, timers, hints, solutions, attempt counters or red or green states.
```

### Referencia mobile B: dock

```
Create a new reference screen "Phone reference dock" in landscape at exactly 915 x 412 px. Same sunset yard and the alien STANDING in the middle (three-quarter view, eyes open). No joystick and no jump button on this screen. Round profile button: 48 px, top-right, 16 px from the edges.
A Message Dock at the bottom: 883 x 112 px, x=16, y=284, translucent warm cream with a soft 16 px blur, 24 px radius, 20 px padding, thin lavender line on the top edge. Inside, left to right: a fixed 80 px leading slot with a small toy-box icon (32 px) inside a soft lavender circle of 56 px, centered; a 16 px gap; a text column with the title "Lorem ipsum dolor" at 20 px bold and the line "Lorem ipsum dolor sit amet." at 16 px, both left-aligned and vertically centered; a pill button 56 px high with text "Lorem ipsum" at 18 px bold, aligned to the right and vertically centered. The alien must be fully visible above the dock.

Do not add any text, chip, label or icon that I did not write explicitly. No streaks, rankings, timers, hints, solutions, attempt counters or red or green states.
```

### Referencia mobile: intento de corregir el marco (Stitch no lo respetó)

```
In "Phone reference HUD", the design fills only 915 px of a 1280 px wide canvas and the rest is empty dark purple. Remove the empty area: the screen frame must be exactly 915 x 412 px and contain only the yard scene and the HUD. Do not change any sizes, positions, texts or icons inside the scene.
```

### Referencia mobile B: reencuadre del alien

```
In "Phone reference dock", the alien is cut off: his antennas are clipped by the top edge and the dock covers his legs. Re-frame the scene so the WHOLE alien, from the tips of his antennas to his feet, is fully visible in the area above the dock (the top 284 px of the frame). Make the alien about 220 px tall, standing on the yard floor, centered horizontally. Remove the loose cardboard boxes from the yard. Do not change the dock, the profile button, any size or any text.
```

## Panel de moderación y administración

Proyecto de Stitch aparte del juego, con tipo de dispositivo escritorio (1440 x 900).

### Panel, mensaje 1: base y sistema de diseño (se pega primero)

```
This is a new project: the ADMIN PANEL of "Patio", a children's educational game. The users of this panel are adults (moderators and administrators, invited by email), on desktop. Design 1440 x 900 px screens. Do NOT design the children's game here.

Reuse the brand of the game, adapted for adults:
- Font: Lexend everywhere. Scale: page title 24 px bold (line 32), section title 20 px semibold, body 16 px regular (line 24), table and label text 14 px medium (line 20), small helper text 13 px. Never use all caps for paragraphs.
- Colors: background #FFF9EE; cards #FFFFFF with 1px border #E5DAC2; secondary surfaces #F5EDDB; text #2E3239; secondary text #544D45; primary blue #35599D (buttons, links, active navigation) with hover #4F72B8; accent lavender #B8A4C9 and peach #FBD6B5 for soft highlights; green #8FD28C and amber #E8A058 for status chips. Error red #BA1A1A is allowed ONLY for destructive actions and system errors, always with text, never alone.
- Shape: friendly but denser than the game. Cards 16 px radius, inputs and buttons 12 px radius, status chips fully rounded (pill, 28 px high). No thick 3D bevels, no blur, no sunset gradients, no 3D art. Soft warm shadow: 0 4px 12px rgba(84,77,69,0.12).
- Layout: left sidebar 240 px wide (cream #F5EDDB), top bar 64 px, content area with 32 px padding and maximum width 1200 px, 24 px gaps between cards.
- Controls: buttons 44 px high (primary blue filled with white text, secondary outlined), inputs 48 px high with 1px border #C4C6D2 and a visible blue focus ring, tables with 56 px rows, hover state on rows, clear empty states. All text contrast at least 4.5:1. Never convey status by color alone: every chip has a text label.
- Small brand touch: the alien's round green head as a 40 px logo next to the word "Patio" in the sidebar header. No other illustrations.

Hard rules of this panel: show only nicknames and anonymous short IDs, never real names or photos of children. No rankings, leaderboards, comparisons between children, charts of performance per child, attempt counts, time per child or levels. Results are only "logrado" or "no logrado". Placeholder texts can be "Lorem ipsum".

Do not add any text, chip, label or icon that I did not write explicitly.
```

### Panel, pantalla 1: Ingreso

```
Create Screen 1 (Login), 1440 x 900. Background #FFF9EE. A centered white card 440 px wide, 16 px radius, 40 px padding. At the top, the alien head logo (56 px) and the word "Patio". Below: title "Lorem ipsum" (24 px), one line "Lorem ipsum dolor sit amet." (16 px, secondary text). Two fields with labels: "Lorem ipsum" (email) and "Lorem ipsum" (password, with a show/hide icon). One full-width primary button "Lorem ipsum". Below, a small text link "Lorem ipsum". No sidebar and no top bar on this screen.

Do not add any text, chip, label or icon that I did not write explicitly.
```

### Panel, pantalla 2: Aceptar invitación

```
Create Screen 2 (Accept invitation), 1440 x 900. Same background and card style as Screen 1. Centered card 480 px wide. At the top, the alien head logo and "Patio". Title "Lorem ipsum", then a soft peach (#FBD6B5) info box with a mail icon and the text "lorem.ipsum@example.com" and the line "Lorem ipsum dolor sit amet." Fields: "Lorem ipsum" (full name), "Lorem ipsum" (password) with a 4-step strength indicator made of bars and a text label, "Lorem ipsum" (repeat password). A checkbox with "Lorem ipsum dolor sit amet". One full-width primary button "Lorem ipsum", disabled look until the checkbox is on. No sidebar and no top bar.

Do not add any text, chip, label or icon that I did not write explicitly.
```

### Panel, pantalla 3: Panel principal (jugadores)

```
Create Screen 3 (Main dashboard), 1440 x 900, with the sidebar and top bar of the base design. Sidebar items, each with an icon: "Lorem ipsum" (selected, with a blue pill background), "Lorem ipsum", "Lorem ipsum", "Lorem ipsum", and at the bottom the user's avatar with a name "Lorem ipsum". Top bar: page title "Lorem ipsum" on the left, a search field 320 px on the right.
Content: a row of three summary cards (each with a small label and a big number in 32 px bold): "Lorem ipsum" 12, "Lorem ipsum" 148, "Lorem ipsum" 3. The third card has a lavender background and a small "Lorem ipsum" link. Below, a card with a title "Lorem ipsum" and a filter row (a dropdown "Lorem ipsum" and a dropdown "Lorem ipsum"), then a table with columns: "Lorem ipsum" (nickname, with a small round avatar of the alien head), "Lorem ipsum" (short ID like "7F3A-92"), "Lorem ipsum" (group code like "ABC123"), "Lorem ipsum" (a status chip), and an actions column with a "more" icon. 6 rows. Status chips: "Lorem ipsum" in green #8FD28C, "Lorem ipsum" in amber #E8A058, "Lorem ipsum" in lavender #B8A4C9, all with dark text. Table footer with a simple pager.
No charts. No sorting by results.

Do not add any text, chip, label or icon that I did not write explicitly.
```

### Panel, pantalla 4: Desafíos

```
Create Screen 4 (Challenges), 1440 x 900, same sidebar and top bar as Screen 3, with the second sidebar item selected. Page title "Lorem ipsum" and, on the right, a primary button "Lorem ipsum" with a plus icon. Below the title, a filter row: a segmented control with three options "Lorem ipsum", "Lorem ipsum", "Lorem ipsum" (the first selected) and a dropdown "Lorem ipsum". Then a table in a white card with columns: "Lorem ipsum" (title), "Lorem ipsum" (mechanic, with a small icon and one of three labels), "Lorem ipsum" (a status chip, green for published and amber for draft, both with text), and an actions column with an edit icon and a "more" icon. 7 rows with placeholder titles. On the right of the table, a side card 320 px wide with the title "Lorem ipsum" and a vertical list of 4 small rows, each with a small toy-box icon in a lavender circle and the text "Lorem ipsum dolor", representing the set of the day.

Do not add any text, chip, label or icon that I did not write explicitly.
```

### Panel: navegación y limpieza (pantallas 3 y 4)

```
In Screens 3 and 4, replace the sidebar items with exactly these five, each with a simple line icon, in this order: "Jugadores" (users icon), "Desafíos" (puzzle icon), "Métricas" (bar chart icon), "Moderadores" (mail-shield icon), "Ajustes" (gear icon). Selected item: blue pill background with white text. Screen 3 has "Jugadores" selected, Screen 4 has "Desafíos" selected. At the bottom of the sidebar, a round avatar with the text "Lorem ipsum" (no ID). Remove the breadcrumb "Consola Institucional / Panel Central", the chip "Filtro Seguro Activo" and the text "Moderador Activo ID #MOD-2041". Keep everything else as it is.

Do not add any text, chip, label or icon that I did not write explicitly.
```

### Panel: arreglo del ancho de la pantalla 4

```
Fix Screen 4 (Challenges): the content overflows the 1440 px width. The primary button at the top right and the side card on the right are cut off. Keep the sidebar at 240 px, the content with 32 px padding on both sides, and make the table take the remaining width minus the side card, which must be 320 px wide with a 24 px gap, fully inside the frame. The "Lorem ipsum" primary button with the plus icon must be fully visible at the top right of the content, 32 px from the right edge. All text in the side card must be fully visible.

Do not add any text, chip, label or icon that I did not write explicitly.
```

### Panel: arreglo de la pantalla 2 (invitación)

```
Fix Screen 2 (Accept invitation): the spacing is broken. Rebuild the card as 480 px wide with 40 px padding. Vertical layout, from top: logo (alien head 56 px) and "Patio" at 24 px, 24 px gap, title "Lorem ipsum" at 24 px bold, 16 px gap, the peach info box (padding 16 px, mail icon 24 px at the left, then the text lines "lorem.ipsum@example.com" and "Lorem ipsum dolor sit amet." in 16 px and 14 px), 24 px gap, then three fields. Each field: label at 14 px medium, 8 px gap, input 48 px high. 20 px gap between fields. Under the password field, the strength indicator: four bars of 8 px height with a 14 px label. Then the checkbox with its text, 24 px gap, and a full-width primary button 44 px high. Nothing may touch or overlap.

Do not add any text, chip, label or icon that I did not write explicitly.
```

### Panel, pantalla 5: Editor de desafíos

```
Create Screen 5 (Challenge editor), 1440 x 900, with the same sidebar (Desafíos selected) and top bar. Content, 32 px padding:
Header row: a small back link with an arrow "Lorem ipsum", the page title "Lorem ipsum" (24 px bold), a status chip "Borrador" in amber with text, and on the right a secondary button "Lorem ipsum" and a primary button "Lorem ipsum".
Below, two columns with a 24 px gap.
Left column (about 700 px), a white card with sections:
1) Label "Lorem ipsum" and three selectable cards side by side (each with an icon and a short label): "Lorem ipsum" (drag and drop, selected, blue ring and check), "Lorem ipsum" (number input), "Lorem ipsum" (word drop).
2) Label "Lorem ipsum" and a text area with the placeholder "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
3) A two-column group: "Lorem ipsum" with a stepper showing 17, and "Lorem ipsum" with a stepper showing 3. Next to them, a dropdown "Lorem ipsum" showing "Lorem ipsum".
4) Label "Lorem ipsum" and a text area for the friendly message, with a helper line "Lorem ipsum dolor sit amet." underneath.
Right column (about 560 px): a card titled "Lorem ipsum" containing a landscape phone preview (aspect 915:412, 32 px radius, darker border) that shows the child's challenge in the game style: a cream panel with a title line, a grid of red apples on the left, three empty baskets on the right, and a small blue "Listo" pill at the bottom right. Below it, a card titled "Lorem ipsum" with a checklist of 3 rows: two with a green check icon and text, one with an amber warning icon and text.

Do not add any text, chip, label or icon that I did not write explicitly.
```

### Panel, pantalla 6: Métricas

```
Create Screen 6 (Metrics), 1440 x 900, with the same sidebar (Métricas selected) and top bar. Content, 32 px padding:
Title "Lorem ipsum" (24 px bold). On the right, a segmented control with three options "Lorem ipsum" (first selected) and a dropdown "Lorem ipsum".
Row of 4 stat cards, each with a 14 px label, a 32 px bold number and a 13 px helper line: "Lorem ipsum" 148, "Lorem ipsum" 62%, "Lorem ipsum" 4, "Lorem ipsum" 12 min. The fourth card has a soft lavender background and a small info icon.
Next row, two cards: on the left (about 2/3 width) a line chart titled "Lorem ipsum" showing 30 days, a single blue line (#35599D), light grid, labeled axes with 13 px text, no area fill; on the right (about 1/3) a bar chart titled "Lorem ipsum" with three bars (one per mechanic) in blue, lavender and peach, each with its percentage label above it.
Bottom: a full-width card titled "Lorem ipsum" with a table of 5 rows. Columns: "Lorem ipsum" (title), "Lorem ipsum" (mechanic), "Lorem ipsum" (opened count), "Lorem ipsum" (a thin progress bar with its percentage as text), and a text link "Lorem ipsum".
Show NO data per child, no rankings, no names, no retention, no streaks.

Do not add any text, chip, label or icon that I did not write explicitly.
```
