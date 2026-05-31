---
name: Trader's Edge
colors:
  surface: '#101415'
  surface-dim: '#101415'
  surface-bright: '#363a3b'
  surface-container-lowest: '#0b0f10'
  surface-container-low: '#191c1e'
  surface-container: '#1d2022'
  surface-container-high: '#272a2c'
  surface-container-highest: '#323537'
  on-surface: '#e0e3e5'
  on-surface-variant: '#d1c5b4'
  inverse-surface: '#e0e3e5'
  inverse-on-surface: '#2d3133'
  outline: '#9a8f80'
  outline-variant: '#4e4639'
  surface-tint: '#e9c176'
  primary: '#e9c176'
  on-primary: '#412d00'
  primary-container: '#c5a059'
  on-primary-container: '#4e3700'
  inverse-primary: '#775a19'
  secondary: '#b9c7e4'
  on-secondary: '#233148'
  secondary-container: '#3c4962'
  on-secondary-container: '#abb9d6'
  tertiary: '#c0c6de'
  on-tertiary: '#2a3043'
  tertiary-container: '#9fa4bc'
  on-tertiary-container: '#343a4e'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdea5'
  primary-fixed-dim: '#e9c176'
  on-primary-fixed: '#261900'
  on-primary-fixed-variant: '#5d4201'
  secondary-fixed: '#d6e3ff'
  secondary-fixed-dim: '#b9c7e4'
  on-secondary-fixed: '#0d1c32'
  on-secondary-fixed-variant: '#39475f'
  tertiary-fixed: '#dce1fb'
  tertiary-fixed-dim: '#c0c6de'
  on-tertiary-fixed: '#151b2d'
  on-tertiary-fixed-variant: '#40465a'
  background: '#101415'
  on-background: '#e0e3e5'
  surface-variant: '#323537'
typography:
  display-lg:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: 0.01em
  headline-sm:
    fontFamily: Montserrat
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: 0.01em
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
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.1em
  data-mono:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style

The design system is built on the philosophy of "Quiet Authority." It targets high-net-worth individuals and serious traders who prioritize mental clarity over market noise. The aesthetic is a **Luxury Trading Terminal**—a fusion of elite wealth management and precision aerospace instrumentation.

The visual style is **Sophisticated Minimalism** with a **Corporate Modern** foundation. It leverages deep obsidian tones to reduce eye strain, punctuated by surgical gold accents that denote value and success. The UI should feel like a custom-built tool: intentional, high-contrast, and impeccably organized. We avoid the frantic "gamer" aesthetic of retail trading apps, opting instead for the hushed, high-stakes atmosphere of a private family office.

## Colors

The palette is anchored in a monochromatic dark range to establish depth and prestige. 

- **Primary (Gold - #C5A059):** Reserved strictly for high-value actions, achievement states, and critical focal points. It should be used sparingly to maintain its "precious" feel.
- **Secondary (Deep Navy - #0A192F):** Used for surface containers and subtle UI layering. It provides a softer alternative to the true black.
- **Tertiary (Near Black - #020617):** The fundamental background color. It creates an infinite depth that allows content to "float."
- **Neutral (Crisp White - #F8FAFC):** Used for primary data points and high-readability text.

Status colors are modified to fit the luxury theme: Success is a desaturated Gold, and Warnings are muted Copper. Avoid standard bright greens and reds.

## Typography

This design system utilizes a high-contrast typographic pairing to balance technical precision with editorial luxury.

**Montserrat** is used for headlines and display text. Its geometric structure feels architectural and confident. It should be set with tight tracking in large sizes to create a "terminal" impact.

**Inter** is the workhorse for all functional data, body copy, and labels. It provides the neutral, systematic clarity required for complex financial information. 

For all numerical data, use the `data-mono` style to ensure tabular alignment, allowing users to scan figures with mathematical precision.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy on desktop (12 columns, 1200px max-width) to maintain the feel of a controlled dashboard. On mobile, it shifts to a single-column fluid layout with generous vertical breathing room.

Spacing is governed by a strict **8px linear scale**. To evoke a sense of luxury, we prioritize "negative space" over density. Information should be grouped into logical modules separated by wide margins (`lg` or `xl`). 

Margins are generous to ensure the content never feels crowded against the edge of the device, reinforcing the "calm" mindset of the brand.

## Elevation & Depth

Depth in this design system is achieved through **Tonal Layering** rather than traditional shadows. Since the background is Near Black (#020617), we use progressively lighter shades of Navy to indicate elevation.

- **Level 0 (Base):** #020617
- **Level 1 (Cards/Modules):** #0A192F
- **Level 2 (Modals/Popovers):** #16243A

For interactive elements, we use **Low-Contrast Outlines**. A 1px border of #C5A059 at 20% opacity is used to define boundaries without adding visual clutter. When an element is focused, the border opacity increases to 100%. No heavy blurs or ambient shadows are permitted, keeping the interface "hard-edged" and technical.

## Shapes

The shape language is **Sharp (0px)**. 

To maintain the "Trading Terminal" and "High-End Watch" aesthetic, we avoid rounded corners. Sharp 90-degree angles communicate precision, discipline, and structural integrity. This applies to buttons, input fields, cards, and images. 

The only exception to this rule is circular avatars or specialized status pips, which should remain perfect circles to contrast against the rigid rectangular grid.

## Components

### Buttons
- **Primary:** Solid Gold (#C5A059) with Black text. Sharp corners. No gradient.
- **Secondary:** Transparent background with a 1px Gold border.
- **Tertiary:** Text-only, uppercase with letter spacing, using the `label-caps` style.

### Input Fields
Inputs are bottom-bordered only (terminal style) or fully outlined with a 1px border in Deep Navy. Labels should always use the `label-caps` style and sit above the field.

### Cards
Cards use the Secondary color (#0A192F) with 0px border-radius. They should feature a "Corner Detail"—a 4px vertical gold line in the top-left corner to denote the module's importance.

### Chips & Tags
Small, rectangular boxes with a subtle Navy fill. Text is always uppercase. These are used for categorization (e.g., "EQUITIES", "MINDFULNESS", "STRATEGY").

### Checkboxes & Radios
Custom-built square boxes. When selected, they fill with Gold. No "ticks"—use a solid Gold square inset for a more technical look.

### Mindset Tracker (Specialty Component)
A horizontal "Precision Bar" that replaces standard progress bars. It should be a thin 2px line, with the completed portion in Gold and the remainder in a desaturated Navy.