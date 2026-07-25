---
name: Buy-a-bit Core
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#434654'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737685'
  outline-variant: '#c3c6d6'
  surface-tint: '#0c56d0'
  primary: '#003d9b'
  on-primary: '#ffffff'
  primary-container: '#0052cc'
  on-primary-container: '#c4d2ff'
  inverse-primary: '#b2c5ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#00408f'
  on-tertiary: '#ffffff'
  tertiary-container: '#0057bc'
  on-tertiary-container: '#c1d3ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001848'
  on-primary-fixed-variant: '#0040a2'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#d8e2ff'
  tertiary-fixed-dim: '#adc6ff'
  on-tertiary-fixed: '#001a42'
  on-tertiary-fixed-variant: '#004395'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
  touch-target-min: 48px
---

## Brand & Style
The design system is built on a foundation of "Accessible Professionalism." It bridges the gap between high-security financial transactions and everyday retail convenience. The target audience includes small business owners and enterprise retailers who require a checkout solution that feels both innovative and deeply reliable.

The visual style is **Corporate Modern** with a focus on high-clarity and tactile reassurance. It utilizes expansive whitespace to reduce cognitive load during the payment process, ensuring the user feels in control at every step. The aesthetic avoids the coldness of traditional banking in favor of a polished, premium, and friendly atmosphere that emphasizes ease of use through large touch targets and intuitive hierarchy.

## Colors
The palette is led by **Merchant Blue**, a confident and saturated primary tone that signals trust and action. This is balanced by **Slate 900** for high-contrast typography, ensuring maximum legibility on various screen types.

- **Primary (Merchant Blue):** Used for primary actions, progress indicators, and key brand moments.
- **Secondary (Slate 900):** Reserved for primary headings and dense text to maintain a grounded, professional feel.
- **Background (Gray 50):** A soft, neutral foundation that reduces screen glare and differentiates content cards.
- **Stroke/Border (Gray 200):** Used for subtle containment and structural definition without adding visual noise.

## Typography
This design system utilizes **Inter** for its systematic, utilitarian nature and exceptional readability at small sizes—critical for transactional data and receipt views. 

The hierarchy is strictly enforced: **Bold (700)** or **SemiBold (600)** for headings to create an immediate focal point, and **Regular (400)** for body copy to ensure a comfortable reading rhythm. On mobile devices, headline sizes scale down to prevent awkward line breaks while maintaining weight to preserve the brand's confident tone.

## Layout & Spacing
The layout follows a **Fluid Grid** philosophy with fixed maximum widths for desktop viewing to prevent line lengths from becoming unreadable. A 12-column grid is used for the merchant dashboard, while a single-column centered layout is preferred for the checkout experience to minimize distractions.

- **Mobile:** 4-column grid with 16px margins.
- **Tablet/Desktop:** 12-column grid with 24px-32px margins.
- **Rhythm:** An 8px linear scale is used for all internal component spacing, while 4px increments are reserved for micro-adjustments in icons and labels. Generous vertical padding (minimum 24px) should be applied between sections to maintain the "premium and polished" feel.

## Elevation & Depth
Depth is conveyed through **Low-Contrast Outlines** and subtle tonal layering rather than heavy shadows. This keeps the interface feeling light and contemporary.

- **Level 0 (Background):** Surface color #F8FAFC.
- **Level 1 (Cards/Surface):** Pure White (#FFFFFF) with a 1px border of #E2E8F0 (Gray 200). 
- **Active State:** A very soft ambient shadow (0px 4px 12px rgba(0, 0, 0, 0.05)) is applied only to active or hovered elements to indicate interactivity.
- **Modals:** Use a heavy backdrop blur (8px) to isolate the checkout process from the background environment.

## Shapes
The shape language is defined by "Approachable Geometry." All interactive containers and cards use a **12px or 16px radius**, creating a soft, friendly appearance that feels safe to touch. 

- **Primary Buttons:** Utilize the `rounded-lg` (16px) setting to echo the card geometry.
- **Input Fields:** Use the `rounded-md` (8px) setting to provide a slightly sharper, more structured look for data entry points.
- **Small Components (Chips/Badges):** Use a full pill-shape for status indicators to distinguish them from actionable buttons.

## Components
- **Buttons:** Primary buttons use a solid Merchant Blue background with white text. They must have a minimum height of 52px for mobile accessibility. Secondary buttons use the Gray 200 border with Slate 900 text.
- **Cards:** The central container for all information. Cards are white with a 1px Gray 200 border and 12px-16px corner radius. Internal padding should be a minimum of 24px.
- **Input Fields:** Use a 1px border (#CBD5E1). On focus, the border transitions to Merchant Blue with a subtle 2px outer glow in a lighter blue tint.
- **QR/NFC Targets:** Distinctive, high-contrast areas. QR codes should be framed with generous white margins and the Merchant Blue as the focal frame color.
- **Lists:** Transaction lists use a 1px bottom border for separation, with high-contrast text for the amount and medium-contrast for the date/time.
- **Chips:** Small, pill-shaped indicators for "Paid," "Pending," or "Refunded," using low-saturation background tints (e.g., light green for Paid) to keep the UI clean.