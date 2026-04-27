# Design System Specification: The Academic Editorial

This design system moves away from the "industrial" feel of traditional Learning Management Systems, opting instead for a **High-End Editorial** experience. It treats educational content with the prestige of a high-end publication, utilizing sophisticated layering, "invisible" boundaries, and authoritative typography to create an environment of focus and intellectual clarity.

---

## 1. Creative North Star: The Digital Curator
The "Digital Curator" philosophy views every screen as a curated gallery of knowledge. Unlike standard platforms that clutter the interface with boxes and borders, this system uses **intentional asymmetry** and **tonal depth** to guide the eye. It is designed to feel like a premium physical workspace—clean, expansive, and thoughtfully organized.

- **Intentional Breathing Room:** We use aggressive white space to lower cognitive load during high-stakes exams.
- **Layered Sophistication:** Depth is created through stacking tonal surfaces, not through rigid outlines.
- **Authoritative Typography:** Large, editorial headlines create a sense of importance and structure.

---

## 2. Colors & Surface Logic

The palette is anchored in "Trustworthy Blues" and "Subtle Grays," but its application is non-standard. We utilize a "No-Line" rule to maintain a modern, fluid aesthetic.

### The Color Palette (Material Design Convention)
- **Primary (`#0040A1`):** The "Scholar Blue." Used for moments of high importance and brand authority.
- **Surface (`#F8F9FA`):** The primary canvas. A soft, off-white that reduces eye strain compared to pure `#FFFFFF`.
- **Secondary (`#48626E`):** A slate blue-gray used for utility and supportive interface elements.
- **Tertiary (`#822800`):** An "Oxblood" accent used sparingly for intellectual "heat" or critical alerts.

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders are prohibited for sectioning content. Boundaries must be defined through:
1.  **Background Shifts:** Placing a `surface-container-low` section against a `surface` background.
2.  **Vertical Rhythm:** Using exaggerated white space to imply a break in content.
3.  **Tonal Transitions:** Moving from `surface-container-lowest` to `surface-container-highest`.

### Glass & Gradient Rule
To add "soul" to the professional atmosphere:
- **Hero CTAs:** Use a subtle linear gradient from `primary` (#0040A1) to `primary-container` (#0056D2) at a 135-degree angle.
- **Floating Navigation:** Apply **Glassmorphism**. Use `surface-container-lowest` at 80% opacity with a `24px` backdrop blur to allow content to bleed through softly.

---

## 3. Typography: The Editorial Voice

We pair **Manrope** (Display/Headlines) with **Inter** (Body/Labels) to balance character with extreme readability.

| Role | Font | Size | Intent |
| :--- | :--- | :--- | :--- |
| **Display LG** | Manrope | 3.5rem | Impactful landing or milestone moments. |
| **Headline MD** | Manrope | 1.75rem | Section headers; implies editorial authority. |
| **Title LG** | Inter | 1.375rem | Exam question titles; high legibility. |
| **Body LG** | Inter | 1.0rem | Standard reading text; optimized for long-form content. |
| **Label MD** | Inter | 0.75rem | Meta-data; all-caps with 0.05em tracking for a premium feel. |

---

## 4. Elevation & Depth: Tonal Layering

Traditional shadows are often a crutch for poor layout. In this system, we use **The Layering Principle**.

### The Layering Principle
Hierarchy is achieved by "stacking" the surface tiers:
- **Level 0 (Base):** `surface` (#F8F9FA).
- **Level 1 (Sections):** `surface-container-low` (#F3F4F5).
- **Level 2 (Cards):** `surface-container-lowest` (#FFFFFF).

### Ambient Shadows
When an element must float (e.g., a modal or a floating action button):
- **Blur:** 32px to 64px.
- **Opacity:** 4% to 8%.
- **Color:** Use a tinted version of `on-surface` (`#191C1D`) to mimic natural light, never pure black.

### The "Ghost Border" Fallback
If a border is required for accessibility (e.g., an input field), use the `outline-variant` token at **15% opacity**. This creates a suggestion of a container without breaking the editorial flow.

---

## 5. Components

### Buttons
- **Primary:** Gradient-filled (`primary` to `primary-container`) with `lg` (0.5rem) roundedness. No border.
- **Secondary:** `surface-container-highest` background with `on-surface` text.
- **Tertiary:** Text-only with `primary` color; uses a 2px bottom margin on hover rather than an underline.

### Inputs & Exam Fields
- **Container:** Use `surface-container-low`. Transitions to `surface-container-lowest` on focus.
- **Focus State:** A soft 4px outer glow using `primary` at 20% opacity. Avoid heavy stroke changes.

### Minimalist Cards
- **Construction:** No borders. Background: `surface-container-lowest`. 
- **Spacing:** `xl` padding (1.5rem to 2rem) to ensure content breathes. 
- **Shadow:** Only apply on hover to indicate interactivity; use the **Ambient Shadow** spec.

### Progress & Navigation
- **The "Stealth" Divider:** Never use horizontal lines (`<hr>`). Separate list items using a `12px` gap and a subtle background shift on hover.
- **Progress Bars:** Use `primary-fixed-dim` for the track and `primary` for the fill. The transition should be an "ease-in-out" over 600ms to feel organic.

---

## 6. Do's and Don'ts

### Do
- **Do** use `display-sm` for question numbers in exams to give them "Object" status.
- **Do** allow content to align to a 12-column grid but break it intentionally with "pull quotes" or offset imagery.
- **Do** use `surface-dim` for disabled states to maintain the tonal harmony.

### Don't
- **Don't** use 100% black text. Always use `on-surface` (#191C1D) for a softer, premium contrast.
- **Don't** use "Card-in-Card" layouts with borders. Use shifts in surface brightness to denote nesting.
- **Don't** use standard blue for links. Use the `primary` token and ensure it is paired with an icon or weight change for accessibility.

---

## 7. Signature Interaction: The "Soft Focus"
In an exam context, when a user selects an answer or focuses on a specific task, use a `backdrop-blur` on the surrounding elements to gently recede the rest of the UI. This reinforces the "focused educational atmosphere" requested, turning the platform into a sanctuary for thought.