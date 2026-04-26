# Design System — Sistema de Admisión MTN

## Contexto del Producto

- **Qué es:** Portal en línea para que apoderados postulen a Colegio Monte Tabor y Nazaret. Flujo de 9 pasos con verificación de email, recopilación de datos familiares y documentos, seguimiento de evaluaciones.
- **A quién le sirve:** Apoderados/guardians de estudiantes (edades 6-18) durante proceso de admisión
- **Sector:** Educación privada, colegio en Chile, positioning premium pero accesible
- **Tipo de proyecto:** Portal de aplicación multi-paso + dashboard de seguimiento

## Dirección Estética

**Nombre:** Editorial Moderno + Institutional Trust  
**Sensación:** Un colegio que respeta tu tiempo. Profesional pero cálido. Moderno sin ser impersonal.  
**Valores reflejados:**
- 🤝 **Cuidado:** el colegio se preocupa de nosotros
- 🗽 **Libertad:** nos da la libertad de elegir cuándo trabajar y postular
- ⚡ **Moderno:** es contemporáneo, no dated

**Decoración:** Minimalismo intencional
- El contenido es el protagonista, no la decoración
- Espacios generosos (respeto por la atención del usuario)
- Pequeños detalles: gradientes sutiles en tarjetas, transiciones suaves, sin jarring visuals
- Densidad cómoda (no apretada, no dispersa)

## Tipografía

### Fuentes

| Rol | Fuente | Por qué | Cargas |
|-----|--------|--------|-------|
| Display, encabezados principales | **Geist** (700, 600) | Moderna, amigable pero seria. Transmite confianza. Diferencia a MTN de "Inter/Roboto default". | https://vercel.com/font |
| Body, texto en formularios, labels | **Plus Jakarta Sans** (400, 500, 600) | Clara, excelente kerning, accesible. Óptima para lectura en inputs. | https://fonts.google.com |
| Code/datos tabulares | Futura: Geist Mono o "JetBrains Mono" | Monospace limpio para números y estructuras | Si necesitas |

### Escala Tipográfica

```
12px (small)  → labels, ayuda, descripciones menores
14px (small+) → placeholder text, hints
16px (body)   → párrafos, inputs, labels principales ← ANCHOR
20px (lg)     → subheadings, field groups
24px (xl)     → section headings (paso 2 de 9)
28px (2xl)    → page title (formulario principal)
32px (3xl)    → hero/banner text
```

**Implementación en Tailwind:**
```css
text-xs:   12px
text-sm:   14px
text-base: 16px (default body)
text-lg:   20px
text-xl:   24px
text-2xl:  28px
text-3xl:  32px
```

## Color

### Paleta Semántica

| Color | Hex | Uso | Notas |
|-------|-----|-----|-------|
| **Primary** | #1e40af | CTAs, acciones, progress, active states | Azul Monte Tabor. Mantener exacto. |
| **Primary Light** | #3b82f6 | Hover states, second-level CTAs | Para transiciones suaves |
| **Secondary** | #d4a574 | Acentos, highlights, sostenedor role | Dorado suave. Si es muy saturado, ajustar a #c9985f |
| **Success** | #10b981 | Checkmarks, éxito, pasos completados | Verde claro |
| **Warning** | #f97316 | Advertencias, campos inválidos | Naranja suave |
| **Error** | #ef4444 | Errores, validación fallida | Rojo suave (no sangre) |
| **Info** | #06b6d4 | Información, tips, contexto | Cian claro |
| **White** | #ffffff | Fondos principal | Blanco puro |
| **Surface** | #f9fafb | Cards, paneles secundarios, fondos elevados | Gris ultra claro |
| **Border** | #e5e7eb | Bordes inputs, separadores | Gris claro |
| **Text Primary** | #111827 | Body text, headings | Casi negro, no pure black (accessibility) |
| **Text Secondary** | #6b7280 | Labels, hints, descripciones | Gris medio |

### Dark Mode

Para dark mode (futuro):
- Invertir fondos: #0f172a (bg), #1e293b (surface)
- Text primary: #f1f5f9, Text secondary: #cbd5e1
- Reducir saturación de colores semánticos en 10-20%
- Primary permanece #1e40af

## Layout

### Grid & Breakpoints

| Breakpoint | Ancho | Columnas | Uso |
|------------|-------|----------|-----|
| Mobile (xs) | 320px | 4 | Phones |
| Tablet (sm) | 640px | 8 | iPads, small tablets |
| Desktop (md+) | 768px+ | 12 | Laptops, desktops |

### Contenedor Principal

- **Max-width para formularios:** 600px (enfoque total, respeto por atención)
- **Max-width para dashboards:** 1200px (más respirado)
- **Padding lateral:** 16px mobile, 24px+ desktop

### Espaciado Base: 8px

| Escala | Valor | Uso |
|--------|-------|-----|
| xs | 4px | Espacios micro (gaps entre inline elements) |
| sm | 8px | Espacios pequeños (form gaps) |
| md | 16px | Espacios regulares (padding standard) |
| lg | 24px | Espacios grandes (section margins) |
| xl | 32px | Espacios muy grandes (top-level sections) |
| 2xl | 48px | Espacios extra (hero/footer) |

**Density:** Cómoda (no apretada, no dispersa)

### Border Radius

| Nombre | Valor | Uso |
|--------|-------|-----|
| sm | 4px | Inputs, pequeños elementos |
| md | 8px | Cards, tarjetas, paneles |
| lg | 12px | Botones, componentes CTA |
| full | 9999px | Pills, avatares circulares |

## Motion & Transiciones

### Enfoque: Intencional (no spam)

| Elemento | Tipo | Duración | Easing | Por qué |
|----------|------|----------|--------|---------|
| Cambio de paso | Fade-in | 250ms | ease-out | Suave, no jarring |
| Input focus | Border + shadow | 150ms | ease-in-out | Feedback táctil claro |
| Button hover | Color + lift | 200ms | ease-out | Invitador, no agresivo |
| Progress bar | Width fill | 800ms | ease-out | Celebración, momentum visual |
| Page load | Fade-in completo | 300ms | ease-out | Presencia sin agresividad |

**No hacer:**
- Animaciones en hover que no agreguen información
- Múltiples animaciones simultáneas (sobrecarga)
- Velocidades < 150ms (sienten robóticas)
- Velocidades > 1000ms (se siente lenta)

## Componentes Clave

### 1. Input Fields

```
Border: 1px solid #e5e7eb
Border-radius: 4px
Padding: 8px 12px
Font: Plus Jakarta Sans, 16px
Focus: border-color → #1e40af, box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1)
Background: white (#ffffff)
```

### 2. Buttons

```
Primary (CTA):
  Background: #1e40af → hover #1e3a8a
  Color: white
  Padding: 8px 24px
  Border-radius: 12px
  Font: Plus Jakarta Sans 600, 16px
  Transition: all 200ms ease-out
  Hover: transform: translateY(-2px), box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3)

Secondary:
  Background: #d4a574 → hover #b8925d
  Color: white

Ghost:
  Background: transparent
  Color: #1e40af
  Border: 2px solid #1e40af
  Hover: background-color: rgba(30, 64, 175, 0.05)
```

### 3. Progress Bar

```
Height: 8px
Background: #e5e7eb
Fill color: linear-gradient(90deg, #1e40af 0%, #3b82f6 100%)
Border-radius: 4px
Animation on change: 800ms ease-out
```

### 4. Step Indicator

```
Current step: filled circle #1e40af, white number/icon
Completed step: filled circle #10b981, checkmark icon
Upcoming step: empty circle #e5e7eb, muted text
```

### 5. Card / Tarjeta

```
Background: #f9fafb (surface)
Border: 1px solid #e5e7eb
Border-radius: 8px
Padding: 24px
Box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) (subtle, no drama)
```

### 6. Alert / Notification

```
Padding: 16px 16px 16px 16px (left border replaces left padding)
Border-left: 4px solid [color según tipo]
Border-radius: 8px
Background: [color]-10% opacity

Success: border #10b981, bg rgba(16, 185, 129, 0.1), text #10b981
Warning: border #f97316, bg rgba(249, 115, 22, 0.1), text #f97316
Error: border #ef4444, bg rgba(239, 68, 68, 0.1), text #ef4444
Info: border #06b6d4, bg rgba(6, 182, 212, 0.1), text #06b6d4
```

## Guía de Implementación

### Para el Formulario de 9 Pasos

1. **Encabezado:** "Paso X de 9" — Geist 28px bold, primary color
2. **Descripción paso:** "Información del Postulante" — Plus Jakarta Sans 16px, text-secondary
3. **Progress bar:** Animar al llegar a cada paso
4. **Inputs:** 16px, padding 8px 12px, focus state con shadow
5. **Botones:** "Siguiente" (primary), "Volver" (ghost)
6. **Step indicator:** Mostrar pasos completados, actual, siguientes

### Código Base (Tailwind)

```tsx
// Variables personalizadas en tailwind.config.ts
theme: {
  colors: {
    'mtn-primary': '#1e40af',
    'mtn-primary-light': '#3b82f6',
    'mtn-secondary': '#d4a574',
    'mtn-success': '#10b981',
    'mtn-warning': '#f97316',
    'mtn-error': '#ef4444',
    'mtn-info': '#06b6d4',
  },
  fontFamily: {
    'geist': ['Geist', 'sans-serif'],
    'jakarta': ['Plus Jakarta Sans', 'sans-serif'],
  },
  spacing: {
    'xs': '4px',
    'sm': '8px',
    'md': '16px',
    'lg': '24px',
    'xl': '32px',
    '2xl': '48px',
  },
}

// Componentes
<input 
  className="px-3 py-2 border border-gray-300 rounded-sm focus:outline-none focus:border-mtn-primary focus:ring-2 focus:ring-mtn-primary/10"
/>
<button className="px-6 py-2 bg-mtn-primary text-white rounded-lg hover:bg-blue-900 transition-all">
  Siguiente
</button>
```

## Decisiones Clave

### 1. Geist para Display

**Decisión:** Usar Geist en lugar de Inter/Roboto  
**Por qué:** Todos los colegios usan sans-serif "default". Geist es moderna pero no trendy. Ganamos personalidad sin parecer dated.  
**Trade-off:** Necesita carga de fuente externa, pero vale la pena.

### 2. Formulario Centrado (max-width 600px)

**Decisión:** No full-width como otros portales educativos  
**Por qué:** Dice "esto es para ti, no es un sistema masivo." Respeta tu atención.  
**Trade-off:** En desktop quedan espacios en blanco, pero es intencional (respeto).

### 3. Progress Visual Celebrada

**Decisión:** Animar la progress bar, no ocultarla  
**Por qué:** Otros portales esconden el progreso. MTN lo muestra y lo anima. Refuerza: "vamos avanzando juntos, confía."  
**Trade-off:** Requiere transiciones CSS, pero vale por el UX.

### 4. Espacios Generosos

**Decisión:** Density cómoda, no apretada  
**Por qué:** El blanco respira. Señal: "respetamos tu tiempo, tu espacio, tu experiencia."  
**Trade-off:** Menos contenido visible por viewport, pero scroll es barato en 2025.

## Cambios Futuros

- **Dark mode:** Implementar cuando sea solicitado (paleta invertida, saturación reducida)
- **Gamification:** Badges de pasos completados si se desea engagement adicional
- **Responsive improvements:** A/B test mobile density vs. desktop generosity

## Log de Decisiones

| Fecha | Decisión | Rationale | Por |
|-------|----------|-----------|-----|
| 2025-04-25 | Crear DESIGN.md | Sistema visual coherente necesario para mantener consistencia. | Jorge Gangale |
| 2025-04-25 | Geist + Plus Jakarta Sans | Modernidad + accesibilidad sin parecer dated. | design-consultation |
| 2025-04-25 | Max-width 600px formulario | Respeto por usuario, no sistema masivo. | design-consultation |

---

**Sistema de Diseño creado con /design-consultation**  
**Valores:** Cuidado • Libertad • Moderno
