# Bulk Color Token Migration — Claude Code Prompt

Paste everything below the line into Claude Code (start a fresh session with /clear first):

---

## Task: Replace all hardcoded colors with orbit-* theme tokens across the active codebase

This is a bulk migration. Every component that uses hardcoded Tailwind colors, legacy palette classes, or inline rgba() values needs to be updated to use the orbit-* theme system so all colors respond to theme switching.

### Read first:
1. CLAUDE.md in the project root
2. `src/app/globals.css` — understand the orbit-* CSS variable system and semantic utility classes

### The replacement rules

Follow these mappings exactly. When in doubt about which orbit token to use, consider the element's role (is it primary text? muted? a background? a border?) and pick accordingly.

**Modal backdrops:**
- `bg-black/50`, `bg-black/60`, `bg-black bg-opacity-40`, `bg-black bg-opacity-50`, `bg-black bg-opacity-60` → `bg-orbit-canvas/80`

**Modal cards:**
- `bg-white` (when used as a modal/card background) → replace the entire card wrapper classes with the `orbit-card` semantic class where possible. If orbit-card doesn't fit the context, use `bg-orbit-surface-2`
- `bg-white/95 border border-white/20` → `orbit-card`
- `bg-background-card border border-white/20` (legacy) → `orbit-card`
- `bg-background-card` (legacy, standalone) → `bg-orbit-surface-2`

**Legacy palette classes — direct replacements:**
- `text-primary-blue` → `text-orbit-canvas` (when used on gold/accent buttons as foreground text)
- `text-primary-blue` → `text-orbit-gold` (when used as an accent/link color, NOT on a button)
- `text-primary-blue-light` → `text-orbit-gold`
- `bg-primary-blue` → `bg-orbit-surface-3`
- `border-border-light` → `border-orbit-border`
- `bg-background-card` → `bg-orbit-surface-2`
- `bg-background-main` → `orbit-canvas`
- `text-text-dark` → `text-orbit-text`
- `text-text-light` → `text-orbit-muted`
- `text-accent-teal-light` → `text-orbit-gold`
- `text-accent-teal` → `text-orbit-goldDark`
- `border-accent-teal-light` → `border-orbit-gold`
- `bg-accent-teal-light/10` → `bg-orbit-gold/10`
- `ring-primary-blue/50` → `ring-orbit-gold/30`
- `focus:ring-primary-blue` → `focus:ring-orbit-gold/30`
- `focus:ring-primary-blue/30` → `focus:ring-orbit-gold/30`
- `focus:border-accent-teal-light` → `focus:border-orbit-gold/50`
- `bg-status-in-motion/20` → `bg-orbit-gold/20`
- `border-status-in-motion/50` → `border-orbit-gold/50`

**White text opacity variants → orbit text tokens:**
- `text-white` (heading/primary text context) → `text-orbit-text`
- `text-white/95` → `text-orbit-text`
- `text-white/90` → `text-orbit-text`
- `text-white/80` (body/secondary context) → `text-orbit-text2`
- `text-white/70` (muted/subtitle context) → `text-orbit-muted`
- `text-white/60` (very muted, placeholder-like) → `text-orbit-muted`
- `text-white/50` → `text-orbit-muted`
- `text-white/30` → `text-orbit-muted`
- `hover:text-white` → `hover:text-orbit-text`
- `hover:text-white/90` → `hover:text-orbit-text`
- `hover:text-white/80` → `hover:text-orbit-text2`
- `placeholder-white/50` → `placeholder:text-orbit-muted`

**White background opacity variants → orbit surface tokens:**
- `bg-white/5` → `bg-orbit-surface-1/20`
- `bg-white/10` → `bg-orbit-surface-1/40`
- `bg-white/20` → `bg-orbit-surface-1/60`
- `bg-white/30` → `bg-orbit-surface-1/80`
- `hover:bg-white/5` → `hover:bg-orbit-surface-1/20`
- `hover:bg-white/10` → `hover:bg-orbit-surface-1/40`
- `hover:bg-white/30` → `hover:bg-orbit-surface-1/80`

**White border opacity variants → orbit border tokens:**
- `border-white/10` → `border-orbit-border/30`
- `border-white/20` → `border-orbit-border/40`
- `border-white/25` → `border-orbit-border/40`
- `border-white/30` → `border-orbit-border/50`
- `border-t-white` → `border-t-orbit-text`
- `border border-white/10` → `border border-orbit-border/30`
- `border border-white/20` → `border border-orbit-border/40`

**Gray Tailwind classes → orbit tokens:**
- `text-gray-900` → `text-orbit-text`
- `text-gray-800` → `text-orbit-text`
- `text-gray-700` → `text-orbit-text2`
- `text-gray-600` → `text-orbit-muted`
- `text-gray-500` → `text-orbit-muted`
- `text-gray-400` → `text-orbit-muted`
- `text-gray-300` → `text-orbit-muted`
- `bg-gray-50` → `bg-orbit-surface-1`
- `bg-gray-100` → `bg-orbit-surface-1`
- `bg-gray-200` → `bg-orbit-surface-2`
- `bg-gray-200/70` → `bg-orbit-border/40`
- `border-gray-200` → `border-orbit-border`
- `border-gray-300` → `border-orbit-border`
- `hover:bg-gray-50` → `hover:bg-orbit-surface-1`
- `hover:bg-gray-100` → `hover:bg-orbit-surface-1`
- `hover:bg-gray-200` → `hover:bg-orbit-surface-2`
- `hover:bg-gray-300` → `hover:bg-orbit-surface-2`
- `hover:text-gray-600` → `hover:text-orbit-text2`
- `hover:text-gray-700` → `hover:text-orbit-text2`
- `hover:text-gray-800` → `hover:text-orbit-text`
- `hover:border-gray-300` → `hover:border-orbit-border`
- `placeholder-gray-400` → `placeholder:text-orbit-muted`
- `text-slate-800` → `text-orbit-text`

**Status/danger colors → orbit status tokens:**
- `text-red-300` → `text-orbit-warning`
- `text-red-400` → `text-orbit-warning`
- `text-red-500` → `text-orbit-warning`
- `text-red-600` → `text-orbit-warning`
- `text-red-700` → `text-orbit-warning`
- `bg-red-50` → `bg-orbit-warning/10`
- `bg-red-100` → `bg-orbit-warning/20`
- `bg-red-500` → `bg-orbit-warning`
- `bg-red-500/20` → `bg-orbit-warning/20`
- `bg-red-500/90` → `bg-orbit-warning/90`
- `bg-red-600` → `bg-orbit-warning`
- `border-red-200` → `border-orbit-warning/30`
- `border-red-400` → `border-orbit-warning/50`
- `border-red-400/30` → `border-orbit-warning/30`
- `border-red-500/30` → `border-orbit-warning/30`
- `hover:bg-red-100` → `hover:bg-orbit-warning/20`
- `hover:bg-red-600` → `hover:bg-orbit-warning/90`
- `hover:bg-red-700` → `hover:bg-orbit-warning/90`
- `hover:text-red-400` → `hover:text-orbit-warning`
- `text-green-400` → `text-orbit-success`
- `text-green-600` → `text-orbit-success`
- `text-green-800` → `text-orbit-success`
- `bg-green-50` → `bg-orbit-success/10`
- `bg-green-100` → `bg-orbit-success/20`
- `bg-green-500/90` → `bg-orbit-success/90`
- `border-green-400` → `border-orbit-success/50`
- `hover:bg-green-100` → `hover:bg-orbit-success/20`
- `text-orange-600` → `text-orbit-warning`
- `bg-orange-50` → `bg-orbit-warning/10`
- `hover:bg-orange-100` → `hover:bg-orbit-warning/20`

**Blue Tailwind classes (non-legacy) → orbit tokens:**
- `bg-blue-50` → `bg-orbit-gold/10`
- `text-blue-800` → `text-orbit-text2`
- `border-blue-200` → `border-orbit-border`
- `hover:bg-blue-100` → `hover:bg-orbit-gold/15`
- `bg-primary-blue text-white border-primary-blue` (selected tag pattern) → `bg-orbit-gold text-orbit-canvas border-orbit-gold`

**Inline style hardcoded values in TrustLockup.tsx:**
- `borderColor: 'rgba(255, 255, 255, 0.15)'` → `borderColor: 'rgb(var(--orbit-border) / 0.3)'`
- `'0 8px 24px rgba(0, 0, 0, 0.22)'` → `'0 8px 24px rgb(var(--orbit-shadow) / 0.22)'`
- `'0 6px 18px rgba(0, 0, 0, 0.18)'` → `'0 6px 18px rgb(var(--orbit-shadow) / 0.18)'`
- `backgroundColor: palette.border.light` → `backgroundColor: 'rgb(var(--orbit-border))'`
- Any `radial-gradient` using `rgba(255, 255, 255, ...)` → use `rgb(var(--orbit-text) / N)` equivalents
- Remove the `palette` import from TrustLockup.tsx if it becomes unused after these changes

**Inline style hardcoded values in OrbitCarouselHeader.tsx:**
- `ORBIT_BACK_STROKE = 'rgba(195, 205, 222, 0.42)'` → `'rgb(var(--orbit-border) / 0.42)'`
- `ORBIT_FRONT_STROKE = 'rgba(210, 218, 232, 0.52)'` → `'rgb(var(--orbit-text-2) / 0.52)'`
- Any inline `rgba(15, 23, 42, ...)` → `rgb(var(--orbit-canvas) / N)`
- Any inline `rgba(255, 255, 255, ...)` → `rgb(var(--orbit-text) / N)`
- `boxShadow` with hardcoded rgba → use `rgb(var(--orbit-shadow) / N)`

**Semantic button patterns — use existing utility classes where possible:**
- Gold/accent primary buttons: use `orbit-btn-primary` class
- Secondary/cancel buttons: use `orbit-btn-secondary` class
- Ghost/text-only buttons: use `orbit-btn-ghost` class

### Files to skip entirely (deprecated features):
- `src/app/forum/page.tsx` — Forum is deprecated
- `src/components/dashboard/VendorProfileClient.tsx` — Vendor is deprecated
- `src/components/dashboard/CreateOfferModal.tsx` — Vendor feature
- `src/components/dashboard/OfferCard.tsx` — Vendor feature
- `src/components/dashboard/OfferList.tsx` — Vendor feature

### Files to be careful with:
- `src/components/dashboard/TrustLockup.tsx` — Has inline styles, not just className. Handle the style={{}} props too.
- `src/components/dashboard/OrbitCarouselHeader.tsx` — Same, has constants and inline styles.
- `src/components/onboarding/*` — Do NOT touch. Onboarding has its own intentional style system.
- `text-on-dark-overlay` class — This is intentionally theme-independent. Leave it wherever it appears.

### Implementation approach:
- Work through files one at a time
- For each file, apply ALL the relevant replacement rules
- If a file imports `palette` from palette.ts and you remove all uses of it, remove the import too
- If you see `orbit-btn-primary`, `orbit-btn-secondary`, or `orbit-btn-ghost` semantic classes that could replace a complex set of button classes, use them
- Do not create any new CSS variables or utility classes
- Do not change any theme values in globals.css

### Before writing any code:
Confirm you understand the replacement rules and list the files you plan to modify in order.

### After completing all changes:
Give me a summary: how many files changed, approximately how many replacements made, and any files where you had to make judgment calls about which token to use.
