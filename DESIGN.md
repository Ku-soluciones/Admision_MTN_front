---
name: MTN Admission System
description: School admission management platform with role-based portals for students, guardians, professors, admins, and coordinators
colors:
  azul-monte-tabor: "#1e3a8a"
  dorado-nazaret: "#f59e0b"
  blanco-pureza: "#ffffff"
  gris-piedra: "#6b7280"
  verde-esperanza: "#059669"
  rojo-sagrado: "#dc2626"
  gray-100: "#f3f4f6"
  gray-300: "#d1d5db"
  gray-400: "#9ca3af"
  gray-500: "#6b7280"
typography:
  display:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "clamp(1.5rem, 3vw, 2rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Montserrat, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Lato, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.dorado-nazaret}"
    textColor: "{colors.azul-monte-tabor}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "#d97706"
  button-secondary:
    backgroundColor: "{colors.azul-monte-tabor}"
    textColor: "{colors.blanco-pureza}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-secondary-hover:
    backgroundColor: "#1e40af"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.gris-piedra}"
    rounded: "{rounded.md}"
    shadow: "none"
  card:
    backgroundColor: "{colors.blanco-pureza}"
    rounded: "{rounded.lg}"
    shadow: "0 10px 15px -3px rgba(0,0,0,0.1)"
  card-hover:
    shadow: "0 20px 25px -5px rgba(0,0,0,0.1)"
  badge-success:
    backgroundColor: "{colors.verde-esperanza}"
    textColor: "{colors.blanco-pureza}"
    rounded: "{rounded.full}"
  badge-warning:
    backgroundColor: "{colors.dorado-nazaret}"
    textColor: "{colors.azul-monte-tabor}"
    rounded: "{rounded.full}"
  badge-error:
    backgroundColor: "{colors.rojo-sagrado}"
    textColor: "{colors.blanco-pureza}"
    rounded: "{rounded.full}"
  badge-info:
    backgroundColor: "{colors.azul-monte-tabor}"
    textColor: "{colors.blanco-pureza}"
    rounded: "{rounded.full}"
  input:
    borderColor: "{colors.gray-300}"
    rounded: "{rounded.md}"
    focusBorderColor: "{colors.azul-monte-tabor}"
    focusRingColor: "{colors.azul-monte-tabor}"
---

# Design System: MTN Admission System

## 1. Overview

**Creative North Star: "The Institutional Gate"**

The MTN Admission System feels like passing through the entrance of a prestigious educational institution — dignified, serious, and authoritative. The deep blue and gold palette evokes trust and prestige, while the clean interface communicates competence and clarity. Every interaction reinforces that MTN is an established, thoughtful school making rigorous admission decisions.

This is not a consumer app and not a generic SaaS dashboard. The visual language draws from institutional architecture: the gravitas of a university portal, the clarity of official forms, the trustworthiness of an academic record. Users should feel they are engaging with a serious institution, not a startup product.

**Key Characteristics:**
- **Noble Authority** — Deep blue (#1e3a8a) conveys institutional trust; gold (#f59e0b) adds prestigious accent
- **Structured Clarity** — Card-based layouts with clear hierarchy, generous whitespace, and scannable content
- **Functional Dignity** — Professional without being cold; serious without being oppressive
- **Tactile Confidence** — Buttons have weight and response; cards lift on hover to confirm interactivity

## 2. Colors

The palette draws from institutional architecture: deep navy blues like a university's stone facade, warm gold accents like brass fixtures, and clean whites that suggest academic records and official documents.

### Primary
- **Institutional Blue** (`azul-monte-tabor`, #1e3a8a): Primary brand color. Used for buttons, navigation backgrounds, and key interactive elements. Conveys authority, trust, and academic seriousness.
- **Prestigious Gold** (`dorado-nazaret`, #f59e0b): Secondary accent. Used sparingly for primary CTAs, highlights, and emphasis. Adds warmth and prestige without overwhelming.

### Semantic
- **Success Green** (`verde-esperanza`, #059669): Positive states — completed evaluations, successful submissions, approved status.
- **Error Red** (`rojo-sagrado`, #dc2626): Destructive actions, validation errors, rejected states. The "sacred" red connotes irreversible decisions.
- **Caution Gold** (`dorado-nazaret`, #f59e0b): Warning states share the gold accent, linking warnings to the primary call-to-action color.

### Neutral
- **Pure White** (`blanco-pureza`, #ffffff): Card backgrounds, input fields, content areas. Clean and official.
- **Stone Gray** (`gris-piedra`, #6b7280): Secondary text, labels, muted content. Solid without being cold.
- **Gray-300** (#d1d5db): Borders, dividers, subtle separators.
- **Gray-100** (#f3f4f6): Page background, subtle section differentiation.

### Named Rules

**The 10% Rule.** Gold appears on ≤10% of any given screen. Its rarity is the point — when gold appears, it signals importance.

**The Hierarchy Rule.** Blue is the default interactive color. Gold is reserved for primary CTAs. Green and red are purely semantic (success/error). Never use these colors decoratively.

## 3. Typography

**Display Font:** Montserrat (700 weight) — Bold, confident headlines that command attention.
**Body Font:** Montserrat (400/500 weight) — Clean, highly readable interface text.
**Serif Accent:** Lato — Used for labels and supporting text, adding a subtle academic touch.

**Character:** The Montserrat + Lato pairing balances modern clarity with traditional gravitas. Montserrat's geometric precision reads as contemporary and efficient; Lato's humanist warmth adds approachability without undermining authority.

### Hierarchy

- **Display** (700, clamp 2–3.5rem, line-height 1.1): Page titles, hero headlines. Used sparingly — only where a statement needs to be made.
- **Headline** (600, clamp 1.5–2rem, line-height 1.2): Section headers, card titles. The primary structural heading level.
- **Title** (600, 1.25rem, line-height 1.3): Component titles, subsection headers, modal headings.
- **Body** (400, 1rem, line-height 1.6): Primary content text. Max line length 65–75ch for readability.
- **Label** (500, 0.875rem, Lato): Field labels, captions, metadata. Smaller supporting text that guides without competing.

### Named Rules

**The Contrast Rule.** Body text is always at least 4.5:1 contrast against its background. Never sacrifice readability for aesthetics.

## 4. Elevation

The system uses **shadow-based elevation** — cards and modals lift from the surface using box shadows, creating clear depth hierarchy. Shadows are functional, not decorative: they confirm interactivity and establish z-index relationships.

### Shadow Vocabulary

- **Card Rest** (`0 10px 15px -3px rgba(0,0,0,0.1)`): Cards at rest have subtle shadow suggesting paper on a desk.
- **Card Hover** (`0 20px 25px -5px rgba(0,0,0,0.1)`): Cards lift on hover, confirming they are interactive.
- **Modal** (`0 25px 50px -12px rgba(0,0,0,0.25)`): Modals use deeper shadow to separate from the page.
- **Button** (`0 4px 6px -1px rgba(0,0,0,0.1)`): Buttons have subtle shadow suggesting press-ready state.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only on hover or as a response to state (modals, dropdowns, active elements). A card that isn't interactive shouldn't have shadow.

**The One-Elevation Rule.** Only one element should be elevated at a time (the modal, the topmost card, the active dropdown). Multiple simultaneous shadows create visual confusion.

## 5. Components

### Buttons

- **Shape:** Rounded corners (8px radius, `rounded-lg`). Soft but not playful — institutional without being sharp.
- **Primary (Gold):** Gold background, blue text. Used for primary CTAs that need to stand out. Padding: 10px 20px.
- **Hover:** Darker gold (#d97706), slight scale (1.02), shadow deepens.
- **Active:** Scale down (0.97), shadow reduces — button feels pressed.
- **Secondary (Blue):** Blue background, white text. Standard interactive buttons.
- **Ghost:** Transparent background, gray text. For secondary actions that don't compete with primary CTA.
- **Focus:** Visible ring (2px offset) in the brand color — keyboard navigation is first-class.

### Cards

- **Corner Style:** Rounded-xl (12px radius) — softer than buttons, suggesting card-like containers.
- **Background:** Pure white, full bleed to edges.
- **Shadow Strategy:** `shadow-lg` at rest, `shadow-2xl` on hover. Cards feel substantial at rest, lift confidently on hover.
- **Border:** None. Depth is conveyed through shadow, not stroke.
- **Internal Padding:** Consistent 24px padding on card content.

### Badges / Status Pills

- **Style:** Full pill shape (`rounded-full`). Communicates "status" not "action."
- **Variants:**
  - Success (green background, white text)
  - Warning (gold background, blue text)
  - Error (red background, white text)
  - Info (blue background, white text)
  - Neutral (gray-200 background, gray text)

### Inputs

- **Style:** Light gray border (gray-300), white background. Clean, official form fields.
- **Focus:** Border shifts to blue with matching ring. Clear focus state.
- **Error:** Red border and ring, red error text below.
- **Height:** Minimum 44px touch target for accessibility.
- **Corner Style:** Rounded-lg (8px) to match buttons.

### Navigation

- **Background:** Institutional blue (`azul-monte-tabor`).
- **Text:** White, Montserrat medium weight.
- **Hover:** Slight background lighten, underline indicator.
- **Active:** Gold underline accent, bold weight.

## 6. Do's and Don'ts

### Do:

- **Do** use gold sparingly. When gold appears, it signals importance. If gold appears everywhere, it means nothing.
- **Do** use card shadows to confirm interactivity. A card that triggers an action should feel liftable.
- **Do** maintain high contrast. Body text ≥4.5:1, large text ≥3:1.
- **Do** use the institutional blue for primary actions and navigation. It conveys trust.
- **Do** use semantic colors (green/red) consistently for status: green = approved/done, red = rejected/error.
- **Do** use Montserrat for all UI text. The consistency builds institutional voice.

### Don't:

- **Don't** use generic SaaS dashboard aesthetics — gray backgrounds, tiny icons, corporate blandness. This is a school, not a software product.
- **Don't** use playful elements: cartoon mascots, bouncy animations, bright gradients. The school is an institution, not an app.
- **Don't** use decorative gold. Gold is for CTAs and accents only — never for backgrounds or borders.
- **Don't** use glassmorphism, blur effects, or transparency as decoration. Functional depth only.
- **Don't** use more than one elevation level per screen section. Multiple raised cards create visual noise.
- **Don't** use thin or light body text. Gray text must maintain 4.5:1 contrast.
