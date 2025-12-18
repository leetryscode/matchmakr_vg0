# Modernize Profile Page Layout to Match Pond Feed Vibe

## Overview
Refactor the profile page to match the Pond feed aesthetic: edge-to-edge hero photo with overlays, minimal boxes, clean section dividers. This is a UI-only refactor - no changes to permissions, data loading, chat, or API logic.

## Current State
- PhotoGallery is inset with padding/margins and rounded corners
- Name, age, location, occupation are in a separate card section below photo
- Interests, endorsement, and sponsor sections use rounded cards with borders
- Edit buttons are prominent pills

## Target Design
- Edge-to-edge hero photo (full-width, touches screen edges on mobile)
- Name + age + top 3 interest chips overlaid on photo (bottom-left)
- Clean vertical sections below with dividers (no heavy rounded cards)
- Minimal edit controls (subtle, not prominent)

## Changes Required

### 1. PhotoGallery.tsx - Make Hero Edge-to-Edge

**Current container structure:**
- Wrapper has `px-2 sm:px-0` (inset padding)
- Photo container has `rounded-2xl` and `mx-auto max-w-md mt-6` (centered, rounded box)

**Changes needed:**
- Remove inset padding from wrapper: change `px-2 sm:px-0` to no padding
- Make container full-width: remove `mx-auto max-w-md`, use `w-screen` or `w-full` with negative margins if needed
- Remove rounded corners from main container: remove `rounded-2xl` (photos inside should still respect container)
- Keep `aspect-[4/5]` for mobile
- Remove `mt-6` margin top (photo should start at top)

**Dots overlay:**
- Currently dots are below photo in separate block (lines 431-440)
- Move dots to overlay on photo: absolute positioned at bottom-center
- Style: white dots with backdrop blur, positioned over gradient overlay

### 2. ProfileClient.tsx - Add Photo Overlays

**Move name/age/chips to photo overlay:**
- Remove the current identity block (lines 157-195) - this will be replaced by overlay
- Add overlay section that wraps PhotoGallery or is rendered within it
- Overlay structure:
  - Bottom gradient: `absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 to-transparent`
  - Name + age: `absolute bottom-4 left-4 z-10`
    - Text: `text-white text-2xl font-semibold` (matches pond: text-xl but profile can be text-2xl)
    - Format: `{profile.name}{age ? `, ${age}` : ''}`
  - Interest chips: below name, `flex flex-wrap gap-2`
    - Style: `bg-white/20 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs`
    - Show only top 3 interests: `interests.slice(0, 3)`

**PhotoGallery integration:**
- Option A: Pass overlay data to PhotoGallery and render overlays inside it
- Option B: Wrap PhotoGallery and render overlays as sibling with absolute positioning
- Recommendation: Option B (simpler, cleaner separation)

### 3. ProfileClient.tsx - Simplify Below-Photo Layout

**Current structure:**
- Wrapper has padding: `p-4 sm:p-6 md:p-8`
- Identity block with name/age/location/occupation (will be removed - moving to overlay)
- Helper note
- Interests block
- Endorsement block (rounded card)
- Sponsor block (rounded card)

**New structure:**
- Page wrapper: Keep gradient background, remove inset padding for hero section
- Content wrapper: `px-4 py-4` for sections below hero
- Remove helper note or make it very subtle (maybe remove entirely, or small text above first section)

**Details section (replaces identity block):**
- Show occupation and location in simple list format
- Use icons (same SVG icons as current)
- Style: clean list, no heavy containers
- Keep basic info edit button subtle (small icon button, not large pill)

**Section dividers:**
- Use `border-t border-white/10` between sections
- Add `pt-4` padding after each divider
- Remove rounded card containers

**Sections in order:**
1. Details (occupation, location) - simple list with icons
2. Interests block (chips + add interest UI)
3. Endorsement block (header + text + subtle edit button in header)
4. Sponsor block (avatar + name + "Message" primary + "View Sponsor Profile" secondary)

### 4. ProfileClient.tsx - Minimalize Edit Controls

**Basic info edit:**
- Current: Large "Edit" button pill in top-right of identity block
- New: Small icon button near details section, or remove entirely if too subtle
- Keep functionality, just make it less prominent

**Endorsement edit:**
- Current: Edit button in endorsement section header
- New: Keep in header but make it smaller/subtler (maybe icon-only or smaller text)
- Sponsor-only editing remains unchanged

**Photo edit:**
- Already handled via overlay affordance in empty state
- Existing edit/delete controls via three-dot menu remain unchanged

### 5. ProfileClient.tsx - Restructure Sponsor Section

**Current:**
- Uses rounded card with border
- "Message" button is secondary styled
- "View Sponsor Profile" is part of link text

**New:**
- Remove rounded card container
- Make "Message" button primary/clear CTA
- "View Sponsor Profile" as secondary text link
- Clean layout with avatar + name + buttons

## Implementation Steps

### Step 1: Make PhotoGallery Edge-to-Edge
- Remove padding from wrapper
- Make container full-width
- Remove rounded corners and centering
- Move dots to overlay on photo (bottom-center, absolute positioned)

### Step 2: Add Photo Overlays in ProfileClient
- Create overlay wrapper around PhotoGallery
- Add gradient overlay div
- Add name/age overlay (bottom-left)
- Add interest chips overlay (below name)
- Pass interests data (first 3) to overlay

### Step 3: Remove Identity Block, Create Details Section
- Remove current identity block (lines 157-195)
- Create new details section showing occupation and location
- Style as simple list with icons
- Add subtle edit button if needed

### Step 4: Simplify Section Containers
- Remove `bg-white/10 rounded-xl border border-white/20 shadow-card` from endorsement block
- Remove rounded card styling from sponsor block
- Add `border-t border-white/10 pt-4` dividers between sections
- Update content wrapper to `px-4 py-4`

### Step 5: Minimalize Edit Controls
- Reduce endorsement edit button size/styling
- Move or reduce basic info edit button prominence
- Keep all functionality intact

## Files to Modify

1. **src/components/profile/PhotoGallery.tsx**
   - Remove wrapper padding
   - Make container full-width (remove max-w-md, mx-auto)
   - Remove rounded corners from container
   - Move dots to overlay on photo (bottom-center)

2. **src/components/profile/ProfileClient.tsx**
   - Add photo overlay wrapper with gradient + name/age/chips
   - Remove identity block (lines 157-195)
   - Create details section (occupation, location)
   - Simplify endorsement block styling
   - Simplify sponsor block styling
   - Add section dividers
   - Minimalize edit controls

## Acceptance Criteria

- [ ] Photo is full-width edge-to-edge on mobile (touches screen edges)
- [ ] Name + age + top 3 interests appear as overlay on photo (bottom-left)
- [ ] Gradient overlay appears at bottom of photo
- [ ] Dots (if carousel) overlay on photo at bottom-center
- [ ] Below-photo sections use dividers, not rounded cards
- [ ] Details section shows occupation/location in clean list format
- [ ] Edit controls are subtle/minimal
- [ ] Sponsor section has clear "Message" primary button
- [ ] All permissions and functionality unchanged
- [ ] Layout matches Pond feed aesthetic

## Notes

- This is visual-only: no permission changes, no API changes, no data loading changes
- Maintain all existing functionality (edit, delete, upload, etc.)
- Keep aspect ratio `aspect-[4/5]` for mobile hero photo
- Overlay z-index hierarchy: photo < gradient < dots < name/chips < edit buttons
- Ensure overlays are readable over both photos and gradient fallback

