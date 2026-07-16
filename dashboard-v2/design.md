# Manifesto Theme — Design Specification (Clean White)

## Overview

Apply the Hallmark **Manifesto** theme to the dashboard-v2 SPA. Clean white background, gray-scale accent, no dark mode.

---

## 1. Typography

| Role | Face | Source | Weights |
|------|------|--------|---------|
| Display (headings, nav labels) | **Space Grotesk** | Google Fonts | 500, 600, 700 |
| Body (content text, buttons) | **Space Grotesk** | Google Fonts | 400, 500 |
| Mono (code, numbers) | **JetBrains Mono** | Google Fonts | 400, 500 |

**index.html changes:**
- Remove Inter import
- Re-add JetBrains Mono: `400,500`
- Add Space Grotesk: `300,400,500,600,700`
- Set `font-family: 'Space Grotesk', sans-serif`

---

## 2. Color Palette

### Light Mode Only (no dark theme)

| Token | Value | Notes |
|-------|-------|-------|
| `--background` | `#ffffff` | Clean white |
| `--foreground` | `oklch(15% 0.005 260)` | Near-black with trace |
| `--card` | `#ffffff` | Clean white |
| `--card-foreground` | `oklch(15% 0.005 260)` | Near-black |
| `--border` | `oklch(88% 0.003 260)` | Light gray hairline |
| `--muted` | `oklch(96% 0.003 260)` | Subtle gray tint |
| `--muted-foreground` | `oklch(58% 0.005 260)` | Secondary text |
| `--muted-foreground-light` | `oklch(73% 0.004 260)` | Captions |
| `--accent` | `oklch(93% 0.003 260)` | Hover surface |
| `--accent-foreground` | `oklch(15% 0.005 260)` | Ink |
| `--primary` | `oklch(30% 0.005 260)` | Ink-as-accent (neutral gray) |
| `--primary-foreground` | `#ffffff` | White |
| `--primary-light` | `oklch(94% 0.005 260)` | Light gray active/unread bg |
| `--destructive` | `oklch(52% 0.180 25)` | Red for errors |
| `--ring` | `oklch(70% 0.005 260)` | Focus ring |

### Sidebar Tokens

| Token | Value |
|-------|-------|
| `--sidebar-bg` | `oklch(97% 0.003 260)` |
| `--sidebar-fg` | `oklch(15% 0.005 260)` |
| `--sidebar-muted` | `oklch(55% 0.005 260)` |
| `--sidebar-border` | `oklch(88% 0.003 260)` |
| `--sidebar-hover` | `oklch(93% 0.003 260)` |
| `--sidebar-active-bg` | `oklch(92% 0.005 260)` |
| `--sidebar-active-fg` | `oklch(15% 0.005 260)` |

---

## 3. Shadows

Minimal.

```css
--shadow-sm: 0 1px 2px oklch(0% 0 0 / 0.04);
--shadow-md: 0 2px 4px oklch(0% 0 0 / 0.06);
--shadow-lg: 0 4px 12px oklch(0% 0 0 / 0.08);
```

---

## 4. Border Radius

| Token | Value |
|-------|-------|
| `--radius` | `0.375rem` (6px) |

Cards: `rounded-lg` (8px). Buttons/inputs/sidebar items: `rounded-md` (6px). Dropdowns: `rounded-md`.

---

## 5. Component Changes

### Card (`card.tsx`)
- `rounded-xl` → `rounded-lg`
- Remove `shadow-[var(--shadow-sm)]`

### Button (`button.tsx`)
- `transition-all` → `transition-colors`
- Default: solid `var(--primary)` bg, white text
- Outline: border only
- Ghost: hover `var(--accent)`
- No scale/transform on hover

### Sidebar (`sidebar.tsx`)
- `rounded-lg` → `rounded-md` on nav items
- Active left bar indicator kept
- Hover only `hover:bg-[var(--sidebar-hover)]`

### Topbar (`topbar.tsx`)
- Remove dark mode toggle button entirely
- Dropdown panels: `rounded-md`, thin border
- Clean white dropdown bg

### Dark mode removal
- Remove the `useDark` / `dark` state from app shell
- Remove theme toggle button from `Topbar`
- Remove `.dark` class CSS block from `index.css`
- Remove any dark-mode-related logic

---

## 6. Font Loading (`index.html`)

```html
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

---

## 7. Base CSS (`index.css`)

- `font-family: 'Space Grotesk', sans-serif`
- `font-family: 'JetBrains Mono', monospace` for code
- Replace all color tokens with values from section 2
- Replace radius tokens
- Remove `.dark` block
- Remove any literal color overrides
