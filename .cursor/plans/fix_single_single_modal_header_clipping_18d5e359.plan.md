# Fix Single↔Single Modal Header Clipping + Align Avatar/Name

## Overview
Fix the single↔single ChatModal header that's getting clipped at the top and has inconsistent spacing between avatar and name.

## Current Issues

**Line 409-438**: The sticky header has:
- Double padding: `px-4 py-3` on both outer and inner divs
- No safe-area-inset-top padding
- No minimum height
- Inconsistent button sizing

## Changes Required

### 1. Fix Header Container (Line 409)

**Current**:
```tsx
<div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
  <div className="flex items-center gap-3 px-4 py-3">
```

**Replace with**:
```tsx
<div 
  className="sticky top-0 z-10 bg-white border-b border-gray-100 min-h-[56px]"
  style={{ paddingTop: `max(0.75rem, env(safe-area-inset-top))` }}
>
  <div className="flex items-center gap-3 px-4 py-3">
```

### 2. Fix Back Button Sizing (Line 411-417)

**Current**:
```tsx
<button
  onClick={onClose}
  className="text-primary-blue font-semibold text-base"
  aria-label="Close"
>
  &larr; Back
</button>
```

**Replace with**:
```tsx
<button
  onClick={onClose}
  className="h-9 w-9 flex items-center justify-center text-primary-blue font-semibold text-base flex-shrink-0"
  aria-label="Close"
>
  &larr; Back
</button>
```

### 3. Fix Avatar Size Consistency (Line 421)

**Current**: `w-10 h-10`

**Keep as**: `w-10 h-10` (or change to `w-9 h-9` to match button if preferred)

Actually, let's keep `w-10 h-10` for avatar as it's standard, but ensure button is `h-9 w-9`.

### 4. Fix Name Block Styling (Line 430-434)

**Current**:
```tsx
<div className="flex-1 min-w-0">
  <div className="font-semibold text-gray-900 truncate">
    {clickedSingle.name || 'Chat'}
  </div>
</div>
```

**Replace with**:
```tsx
<div className="flex-1 min-w-0 flex flex-col leading-tight">
  <div className="font-semibold text-gray-900 truncate text-[16px]">
    {clickedSingle.name || 'Chat'}
  </div>
</div>
```

## Summary

- ✅ Add safe-area-inset-top padding via inline style
- ✅ Add min-h-[56px] to header container
- ✅ Remove double padding (keep only on inner div)
- ✅ Fix Back button sizing (h-9 w-9, flex items-center justify-center)
- ✅ Ensure consistent avatar/name spacing (gap-3)
- ✅ Add leading-tight and text-[16px] to name for consistency

