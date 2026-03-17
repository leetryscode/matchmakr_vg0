# Mobile Readiness Audit
**Project:** Orbit (MatchMakr_v0)
**Date:** 2026-03-16
**Scope:** `src/app`, `src/components`, `src/contexts` (excluding `onboarding`, `node_modules`, `.next`)

---

## 1. DESKTOP-ONLY FEATURES

Features wrapped in `hidden md:block` or similar that are invisible on mobile.

### 1.1 Profile Identity Block — `ProfileClient.tsx:290`
- **Pattern:** `<div className="hidden md:block">`
- **Impact:** The full identity block (name, age, location, occupation in a structured layout) is completely hidden on mobile. Mobile users get a minimal inline row instead. Critical profile identity information is degraded.

### 1.2 Chat Close Button — `ChatModal.tsx:723`
- **Pattern:** `className="absolute top-4 right-4 hidden sm:block ..."`
- **Impact:** The X close button is hidden on mobile. Mobile users must use the back arrow (line 710–712) to exit the chat. The alternative close mechanism is unavailable.

---

## 2. MOBILE EDITING GAPS

Edit/input interactions that rely on hover states and are inaccessible on touch devices.

### 2.1 Managed Single Card Chevron — `ManagedSingleCard.tsx:62`
- **Pattern:** `group-hover:text-orbit-gold transition-colors` on chevron icon
- **Impact:** The only visual affordance that the card is tappable is a hover color change. Mobile users see a static muted icon with no indication the card is interactive.

### 2.2 Template Managed Single Card Chevron — `TemplateManagedSingleCard.tsx:36–40`
- **Pattern:** Same `group-hover:text-orbit-gold` on chevron
- **Impact:** Same as 2.1. No visual feedback that the card is tappable.

### 2.3 Sponsor Display Link — `SponsorDisplay.tsx:62–72`
- **Pattern:** Three hover state classes: `group-hover:border-orbit-gold` (border), `group-hover:border-orbit-border/70` (avatar border), `group-hover:text-orbit-text2` (name)
- **Impact:** All visual cues that the sponsor profile link is interactive are hover-only. On mobile, the sponsor link looks like static text/avatar with no indication it is tappable.

### 2.4 Invite Row Card Chevron — `InviteRowCard.tsx:122–126`
- **Pattern:** `group-hover:text-orbit-gold transition-colors` on chevron
- **Impact:** Row tap affordance is hover-only. Mobile users have no visual feedback the row navigates anywhere.

### 2.5 Sneak Peek Dismiss Button — `SneakPeeksSection.tsx:183–190`
- **Pattern:** `hover:bg-orbit-border/20 hover:text-orbit-text` with no corresponding `active:` state beyond what is present
- **Impact:** Button is still tappable but lacks visual feedback on mobile. Partially mitigated by `active:bg-orbit-border/30`.

---

## 3. TOUCH TARGET ISSUES

Clickable elements below the 44×44px minimum recommended touch target.

### 3.1 Chat Modal Header Buttons — `ChatModal.tsx:717, 729`
- **Element:** Back arrow (`<`) and Close (X) SVG icons
- **Size:** `w-6 h-6` = 24×24px — **critical, these are primary navigation controls**
- **Severity:** HIGH — users cannot reliably close or navigate out of chat on mobile.

### 3.2 Photo Gallery Ellipsis Menu — `PhotoGallery.tsx:545, 682`
- **Element:** Ellipsis (`…`) menu trigger button on photos
- **Size:** `w-6 h-6` = 24×24px
- **Impact:** Editing or deleting photos requires hitting a 24px target. Expect frequent mis-taps.

### 3.3 Photo Upload Remove Button — `CreateOfferModal.tsx:244`
- **Element:** Red X button on uploaded photo preview
- **Size:** `w-6 h-6` = 24×24px, positioned at `-top-2 -right-2`
- **Impact:** Hard to hit. Also overlaps with the image corner, reducing effective tap area further.

### 3.4 Chat Message Avatars — `GroupedMessageList.tsx:92, 130`
- **Element:** Sender avatars in chat thread
- **Size:** `w-8 h-8` = 32×32px
- **Note:** Non-interactive display elements, lower priority. But if these become tappable (profile link), they will be undersized.

---

## 4. OVERFLOW / SCROLL ISSUES

Fixed widths, unwrapped flex rows, or layouts that can exceed 375px viewport width.

### 4.1 Chat Loading Modal Fixed Width — `ChatModal.tsx:420`
- **Pattern:** `w-[400px]` with no mobile override
- **Impact:** On 375px screens (iPhone SE, iPhone 12 mini) this modal is wider than the viewport. Content clips and horizontal scroll may appear.

### 4.2 Vendor Profile Stats Grid — `VendorProfileClient.tsx:165`
- **Pattern:** `grid grid-cols-3 gap-6 text-center` — no responsive breakpoint
- **Impact:** Three equal columns on mobile forces each stat cell to ~110px wide on a 375px screen with gap. Text inside (`font-light`, small size) becomes cramped or wraps awkwardly.
- **Fix:** `grid-cols-2 sm:grid-cols-3` or `grid-cols-1 sm:grid-cols-3`

### 4.3 Managed Singles Grid — `ManagedSinglesGrid.tsx:67, 71`
- **Pattern:** `grid grid-cols-2 gap-3` — no responsive breakpoint
- **Impact:** Two columns on all screen sizes. On phones narrower than 360px, card content (name, age, photo) becomes very tight. Most modern phones handle this fine at 375px, but edge case on smaller devices.

### 4.4 Pond Page Sponsor Name — `pond/page.tsx:933`
- **Pattern:** `whitespace-nowrap` on sponsor name inside a constrained card area
- **Impact:** Long sponsor names will not wrap and will overflow or push adjacent elements out of position.

---

## 5. TEXT TRUNCATION

Text that can overflow its container without proper truncation handling.

### 5.1 Sneak Peek Recipient Name — `SneakPeeksSection.tsx:149`
- **Pattern:** `whitespace-nowrap` but NO `truncate` and no `overflow-hidden`
- **Impact:** Names longer than ~15 characters will overflow the capsule pill and push the right avatar off-screen. Compare line 153 which correctly uses `truncate min-w-0`.

### 5.2 Profile Location Text (Desktop) — `ProfileClient.tsx:306–307`
- **Pattern:** Location string rendered without `truncate` or `overflow-hidden`
- **Impact:** Long location values (e.g., "San Francisco, California 94105") will wrap or overflow the layout. Low risk on mobile since this is in the `hidden md:block` section, but visible on tablets.

### 5.3 Pond Card Sponsor Name — `pond/page.tsx:933`
- **Pattern:** `whitespace-nowrap` with no `truncate`
- **Impact:** Already flagged in Issue 4.4. Overflow is both a width and a text-truncation problem here.

---

## SUMMARY

| # | Category | File | Line(s) | Severity |
|---|----------|------|---------|----------|
| 1 | Desktop-only feature | `ProfileClient.tsx` | 290 | HIGH |
| 2 | Desktop-only feature | `ChatModal.tsx` | 723 | MEDIUM |
| 3 | Mobile editing gap | `SponsorDisplay.tsx` | 62–72 | HIGH |
| 4 | Mobile editing gap | `ManagedSingleCard.tsx` | 62 | MEDIUM |
| 5 | Mobile editing gap | `TemplateManagedSingleCard.tsx` | 36–40 | MEDIUM |
| 6 | Mobile editing gap | `InviteRowCard.tsx` | 122–126 | MEDIUM |
| 7 | Mobile editing gap | `SneakPeeksSection.tsx` | 183–190 | LOW |
| 8 | Touch target | `ChatModal.tsx` | 717, 729 | HIGH |
| 9 | Touch target | `PhotoGallery.tsx` | 545, 682 | MEDIUM |
| 10 | Touch target | `CreateOfferModal.tsx` | 244 | MEDIUM |
| 11 | Touch target | `GroupedMessageList.tsx` | 92, 130 | LOW |
| 12 | Overflow | `ChatModal.tsx` | 420 | MEDIUM |
| 13 | Overflow | `VendorProfileClient.tsx` | 165 | MEDIUM |
| 14 | Overflow | `ManagedSinglesGrid.tsx` | 67, 71 | LOW |
| 15 | Overflow | `pond/page.tsx` | 933 | MEDIUM |
| 16 | Text truncation | `SneakPeeksSection.tsx` | 149 | MEDIUM |
| 17 | Text truncation | `ProfileClient.tsx` | 306–307 | LOW |

**Total issues:** 17 across 10 files
**HIGH severity:** 3
**MEDIUM severity:** 10
**LOW severity:** 4

---

## WHAT IS ALREADY WELL-HANDLED

- `BottomNavigation.tsx` — correctly uses `min-w-[44px] min-h-[44px]` on nav items
- `OfferList.tsx` — responsive grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- `ChatModal.tsx` (main modal) — responsive `w-full sm:w-[600px]`
- `pond/page.tsx` horizontal pill row — properly `overflow-x-auto` with hidden scrollbar
- Most chat/dashboard list items use `truncate` correctly
- `SneakPeeksSection.tsx` dismiss button uses `min-w-[44px] min-h-[44px]`
