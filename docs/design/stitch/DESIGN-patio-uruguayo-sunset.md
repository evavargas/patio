---
name: Patio Uruguayo Sunset
colors:
  surface: '#fff9ee'
  surface-dim: '#e1d9c8'
  surface-bright: '#fff9ee'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fbf3e1'
  surface-container: '#f5eddb'
  surface-container-high: '#efe8d6'
  surface-container-highest: '#eae2d0'
  on-surface: '#1f1b11'
  on-surface-variant: '#434750'
  inverse-surface: '#343024'
  inverse-on-surface: '#f8f0de'
  outline: '#747782'
  outline-variant: '#c4c6d2'
  surface-tint: '#395da1'
  primary: '#35599d'
  on-primary: '#ffffff'
  primary-container: '#4f72b8'
  on-primary-container: '#fbf9ff'
  inverse-primary: '#aec6ff'
  secondary: '#2c6b31'
  on-secondary: '#ffffff'
  secondary-container: '#acf0a7'
  on-secondary-container: '#316f35'
  tertiary: '#894a0f'
  on-tertiary: '#ffffff'
  tertiary-container: '#a76227'
  on-tertiary-container: '#fff9f6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#aec6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#1c4588'
  secondary-fixed: '#aff3aa'
  secondary-fixed-dim: '#93d790'
  on-secondary-fixed: '#002105'
  on-secondary-fixed-variant: '#10521b'
  tertiary-fixed: '#ffdcc4'
  tertiary-fixed-dim: '#ffb780'
  on-tertiary-fixed: '#2f1400'
  on-tertiary-fixed-variant: '#6f3800'
  background: '#fff9ee'
  on-background: '#1f1b11'
  surface-variant: '#eae2d0'
typography:
  display-hero:
    fontFamily: Lexend
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Lexend
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: 0em
  headline-md:
    fontFamily: Lexend
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: 0em
  headline-sm:
    fontFamily: Lexend
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: 0.01em
  body-lg:
    fontFamily: Lexend
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 30px
    letterSpacing: 0.01em
  body-md:
    fontFamily: Lexend
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Lexend
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 26px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Lexend
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0.02em
  label-hud:
    fontFamily: Lexend
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.03em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-safe: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
  space-2xl: 3rem
---

## Brand & Style

This design system powers an educational 3D exploration and play environment set in a welcoming Uruguayan backyard ("el patio") under a calm sunset sky. The brand tone is intrinsically gentle, encouraging, and emotionally safe. It replaces typical high-energy, hyper-stimulating mobile gaming conventions with a slow-paced, tactile, and nurturing atmosphere.

### Target Audience & Psychology
- **Primary Audience:** Children aged 6 to 10 in Uruguay (native Spanish, Rioplatense regional idiom: "mirá", "tocá", "jugá").
- **Cognitive & Motor Capabilities:** Emerging readers (grades 1–4) with developing fine motor skills requiring oversized touch targets, distinct silhouette clarity, and non-punitive feedback.
- **Emotional Stance:** Calm immersion. Strictly no urgency indicators, flashing alarms, ticking red clocks, or aggressive failure screens. Errors are treated as playful deviations with warm suggestions rather than penalties.

### Design Movement: Tactile Soft-Poly
A fusion of low-poly physical toy aesthetics and soft skeuomorphism:
- **Plump surfaces:** Cards and panels evoke sculpted clay, rounded beach stones, and smooth matte plastic toys.
- **Atmospheric Warmth:** UI elements inherit the diffuse glow of a golden-hour sky, blending soft peach, gentle coral, and calm lavender into soothing ambient gradients.
- **Tactile Affordance:** Buttons feature substantial physical depress states, thick friendly borders, and organic depth that invite eager hands.

## Colors

The palette mirrors the warm, dusty twilight of an afternoon in Montevideo or the interior countryside. Colors are low-saturation, creamy, and daylight-balanced to preserve focus and minimize visual fatigue during extended tablet and landscape phone play.

### Color Tokens & Roles

- **Base Surfaces (`#F2EAD8` - Crema Sol):** Warm cream with a yellow-wheat undertone. Used for panel backings, dialogue slates, and modal containers. Far gentler on young eyes than stark white.
- **Primary Interactive (`#4F72B8` - Celeste Profundo):** Muted sky-cobalt blue. Anchors primary actions, jump triggers, progress confirmation, and active navigation rings.
- **Secondary Discovery (`#8FD28C` - Pasto Dulce):** Soft, soothing pasture green. Highlights completed tasks, toy achievements, discovered bugs/plants, and positive state changes.
- **Sunset Accents (Sky Tones):**
  - **Coral Tibio (`#E78878`):** Gentle companion accent for badges, secondary interaction rings, and warm hints. Never used as an error state.
  - **Dusk Lavender (`#B8A4C9`):** Soft framing tone used for joystick surrounds, HUD backdrops, and peaceful ambient glows.
  - **Atardecer Peach (`#FBD6B5`):** Ambient card highlight and fill for interactive slots.
- **Text & Reading Contrast:**
  - **Tinta Mate (`#2E3239`):** Slate coal with warm brown cast for 100% WCAG AA / AAA compliance across both light cream surfaces and tinted chips.
  - **Tierra Suave (`#544D45`):** Secondary instructional microcopy, hints, and passive counters.
- **Supportive Feedback (Non-Punitive):**
  - **Try Again / Attention (`#E8A058` - Durazno Cálido):** Soft golden-amber for hints and re-attempts. Vibrant neon reds and punishing deep crimsons are explicitly prohibited.

## Typography

Lexend was chosen for its research-proven reading ease for early and developing readers. Its loose character spacing, distinct apertures, and low visual crowding assist 6-to-10-year-olds in decoding words quickly without mistaking similar letterforms (e.g., 'd' vs 'b', 'q' vs 'p').

### Typographic Principles for Children in Landscape View
- **Minimum Body Size:** Never drop text below 18px on handheld landscape screens. Dialogue and story text must maintain 20px (`body-lg`) to accommodate varied reading speeds and posture shifts.
- **Line Length:** Kept intentionally short (under 42 characters per line) to eliminate line-tracking difficulties while holding the device with two hands.
- **Case Selection:** Title Case and Sentence Case only. Never use ALL-CAPS for paragraphs or dialog, as block capitals impede silhouette-based word recognition for early learners.
- **Rioplatense Phrasing:** Microcopy employs standard Uruguayan tuteo with open, friendly phrasing: "¡Vamos!", "¿Probamos de nuevo?", "Guardar en la mochila".

## Layout & Spacing

The game operates exclusively in **Fixed Mobile Landscape**. UI layouts adopt a dual-zone ergonomic architecture: the perimeter is reserved for two-thumb interaction zones, leaving the middle 60% of the screen unobstructed for 3D world interaction.

### Screen Layout Architecture
- **Safe Area Insets (`margin-safe`):** Outer boundaries enforce a 48px (3rem) clear area on left and right borders to bypass device notches, camera punch-holes, and the physical palm rests of young players.
- **Thumb Reach Zones:** 
  - **Left Primary (Movement):** Lower-left corner anchors the dynamic virtual joystick, centered within an 88px inset.
  - **Right Primary (Actions):** Lower-right corner accommodates the action/jump cluster with a 72px–88px radius arc.
- **Top HUD Strip:** Centered along the top edge, floating 16px down, arranged as a horizontal stack of pill chips housing toy progress and scene state.
- **Dynamic Content Modals:** Popups and puzzle trays center horizontally with a maximum width of 680px and max height of 85% viewport, leaving the atmospheric 3D sunset backdrop visible through blurred perimeters.

## Elevation & Depth

To match low-poly tactile toys, visual depth is achieved through **ambient warm shadows** and **under-edge bevel extrusions** rather than crisp digital drop shadows.

### Elevation Levels

1. **Flat Ground Layer (Base HUD Canvas):**
   - No elevation shadow. Translucent overlays at 85% opacity with gentle backdrop blur (8px) using `#F2EAD8` (Crema Sol).

2. **Raised Panels & Cards (Level 1):**
   - For item drawers, dialogue boxes, and level summaries.
   - Dual-shadow formula:
     - `0px 4px 12px -2px rgba(84, 77, 69, 0.12)` (Warm ambient ground contact)
     - `0px 2px 0px 0px rgba(255, 255, 255, 0.60) inset` (Sunlit top highlight rim)

3. **Floating Controls & Action Buttons (Level 2):**
   - For virtual joysticks, action pedals, and floating status bubbles.
   - Physical tactile 3D extrusion: A solid 4px base border at the bottom edge (`#3A5791` for blue buttons, `#6EAB6B` for green buttons) simulating a compressible rubber toy.
   - Soft drop cast: `0px 8px 18px 0px rgba(79, 114, 184, 0.20)`.

4. **Speech & Action Bubbles (Level 3):**
   - For contextual helpers like "Tocá para abrir".
   - Subtle pulse bounce (transform translateY: -2px to 2px over 2.4s).
   - Elevated warm halo: `0px 6px 20px 0px rgba(231, 136, 120, 0.25)`.

## Shapes

The shape system is hyper-rounded (`roundedness: 3`), ensuring that no interactive or visual surface presents sharp vertices or acute angles. This conveys softness, bounce, and physical safety.

### Geometric Rules
- **Pill Primitives (`border-radius: 9999px`):** HUD indicators, text chips, action prompts, and small toggles are strictly pill-shaped.
- **Panels & Dialogue Trays:** Standard minimum corner radius is 28px to 32px.
- **Strokes & Borders:** Structural containers use a 3px to 4px boundary line rendered in soft, tinted borders (`#E5DAC2` on cream; `#D4C4E2` on lavender) to impart a clay-molded quality.
- **Interactive Proportions:** Circular shapes dominate thumb regions (joystick, jump) to allow omnidirectional targeting without edge bias.

## Components

### 1. Interactive Action Buttons (Jump / Interact)
- **Dimensions:** 72px x 72px minimum circular diameter (touch footprint extends to 80px invisible hit region).
- **Styling:** Base fill `#4F72B8`, inner crisp white icon (stroke width: 3px), bottom physical bevel of 5px (`#38548A`).
- **Pressed State:** Bevel reduces from 5px to 1px with immediate `scale(0.94)` compression; icon dips by 3px. Haptic tick accompanies the press.

### 2. Virtual Joystick
- **Base Ring:** 120px diameter, semi-transparent warm dusk lavender `#B8A4C9` at 40% opacity with a 3px border in `#F2EAD8` (60% opacity).
- **Knob:** 64px diameter, full pill/circle, solid `#F2EAD8` with an embossed tactile thumb-well (`#E2D5BE` concentric circle), soft warm drop shadow.
- **Behavior:** Floating or docked to bottom-left safe quadrant. Returns smoothly to center with elastic damping.

### 3. Top HUD Status Pill Chips
- **Container:** Height 44px, pill-shaped (`radius: 9999px`), background `rgba(242, 234, 216, 0.88)` with backdrop blur.
- **Content Structure:** Left icon badge (32px circle) + spacing (8px) + `label-hud` text (e.g., "Juguetes 3/5") + 12px right padding.
- **Border:** 2px solid `#E3D7BF`.

### 4. Toy Status Indicator Row
- **Visual Presentation:** A horizontal array of rounded toy silhouette badges embedded in the HUD.
- **Lit State (Completed):** Soft pastel green fill (`#8FD28C`), bright cream toy icon, surrounded by an ambient sunny yellow-green pulse (`rgba(143, 210, 140, 0.45)`).
- **Dim State (Pending):** Translucent cream fill (`rgba(242, 234, 216, 0.45)`), toy icon outlined at 35% opacity in `#544D45`. Zero visual aggression.

### 5. Action Bubble Prompts ("Tocá para abrir")
- **Layout:** Floating pill badge with a rounded downward triangle pointing toward the 3D target.
- **Styling:** Background `#F2EAD8`, 3px border `#F4A261` (warm coral-peach), text `label-md` in `#2E3239`.
- **Icon Accent:** Leading animated hand icon (24px) gently bouncing in sync with the prompt.

### 6. Cards & Inventory Panels
- **Structure:** `#F2EAD8` body, 28px rounded corners, 4px inset shadow top, 24px inner padding.
- **Grid Layout:** 2 rows of square slots (each 76px x 76px, radius 20px) with `#E6DCB8` recessed wells.

### 7. Child-Friendly Input Fields & Drag Chips
- **Drag Chips:** Sized at 80px x 48px minimum, bold text (`label-lg`), thick solid outlines, tactile shadow that lifts (`translateY(-4px)`) when picked up by the child's finger.
- **Text & Number Selectors:** Stepper buttons (+ / -) replacing raw numeric keyboards. Stepper icons are 56px square circles with oversized symbols.