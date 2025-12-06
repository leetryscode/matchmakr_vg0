# Orbit Refactor - Codebase Map

This document maps all files and components related to the three categories that need to be addressed in the Orbit refactor.

---

## 1. USER ROLES (Sponsor, Single, Vendor)

### Role Definitions & Type System

**`src/lib/database.types.ts`**
- Defines `user_role` enum: `["SINGLE", "MATCHMAKR", "VENDOR"]`
- Database type definitions for all user roles

**`supabase/migrations/20250622022756_remote_schema.sql`**
- Creates `user_role` enum type in database
- Defines `profiles` table with `user_type` column

**`src/components/profile/types.ts`**
- TypeScript interfaces for `Profile` and `VendorProfile` types

### Authentication & Role Management

**`src/contexts/AuthContext.tsx`**
- Fetches and caches user type from `profiles` or `vendor_profiles` tables
- Provides `userType` to components via context
- Handles role-based redirects on sign-in

**`middleware.ts`**
- Route protection based on user type
- Redirects authenticated users to appropriate dashboard (`/dashboard/${user_type.toLowerCase()}`)
- Checks `profiles.user_type` to determine dashboard route

**`src/components/dashboard/DashboardWrapper.tsx`**
- Wraps dashboard pages with role verification
- Accepts `expectedUserType?: 'SINGLE' | 'MATCHMAKR' | 'VENDOR'`
- Redirects if user type doesn't match expected type

**`src/components/dashboard/DashboardLayout.tsx`**
- Layout component that accepts `userType?: 'SINGLE' | 'MATCHMAKR' | 'VENDOR'`
- Renders role-appropriate navigation and UI

### Sponsor/MatchMakr Role Files

**`src/app/dashboard/matchmakr/page.tsx`**
- Main Sponsor dashboard page
- Displays sponsored singles, chat list, Singles Pond button
- Server component that verifies `user_type === 'MATCHMAKR'`

**`src/components/dashboard/SponsoredSinglesList.tsx`** & **`SponsoredSinglesListClient.tsx`**
- Lists singles sponsored by the current MatchMakr
- Displays single profiles with chat previews

**`src/components/dashboard/MatchMakrChatList.tsx`** & **`MatchMakrChatListClient.tsx`**
- Chat list component for Sponsor-to-Sponsor conversations
- Shows conversations about specific singles

**`src/components/dashboard/InviteSingle.tsx`**
- Component for Sponsors to invite new singles

**`src/components/dashboard/InviteMatchMakr.tsx`**, **`InviteMatchMakrModal.tsx`**, **`InviteOtherMatchMakrs.tsx`**
- Components for inviting other Sponsors/MatchMakrs

**`src/components/dashboard/SponsorDisplay.tsx`**
- Displays sponsor information in UI

**`supabase/functions/sponsor-single/index.ts`**
- Edge function to create sponsorship relationship
- Verifies user is MATCHMAKR before allowing sponsorship

**`supabase/functions/sponsor-user/index.ts`**
- Edge function for user sponsorship operations

**`supabase/functions/end-sponsorship/index.ts`**
- Edge function to end sponsorship relationships

### Single Role Files

**`src/app/dashboard/single/page.tsx`**
- Main Single dashboard page
- Shows "sneak peek" matches for approval/denial
- Server component that verifies `user_type === 'SINGLE'`

**`src/components/dashboard/SingleDashboardClient.tsx`**
- Client component for Single dashboard functionality
- Handles match approval/denial UI

### Vendor Role Files

**`src/app/dashboard/vendor/page.tsx`**
- Main Vendor dashboard page
- Server component that fetches from `vendor_profiles` table
- Redirects if no vendor profile found

**`src/components/dashboard/VendorProfileClient.tsx`**
- Client component for Vendor dashboard
- Displays business info, photos, offers management
- Handles offer creation, editing, activation/deactivation

**`src/app/onboarding/vendor/page.tsx`**
- Vendor-specific onboarding flow
- Creates vendor profile in `vendor_profiles` table

**`src/app/onboarding/page.tsx`**
- Main onboarding page with user type selection
- Includes Vendor option that redirects to `/onboarding/vendor`

**`src/components/onboarding/AccountCreationStep.tsx`**
- Handles account creation for all user types including Vendor

### Role References in Other Files

**`src/components/dashboard/BottomNavigation.tsx`**
- Navigation component that uses `userType` from AuthContext
- Routes to `/dashboard/${userType.toLowerCase()}`

**`src/components/profile/PhotoGallery.tsx`**
- Accepts `userType` prop including "VENDOR" option

**`src/app/api/messages/chat-context/route.ts`**
- API route that handles role-based chat context

**`src/app/api/matches/route.ts`**, **`status/route.ts`**, **`can-chat/route.ts`**
- Match-related API routes that work with SINGLE and MATCHMAKR roles

---

## 2. FORUM / GREENROOM FEATURES

### Forum Pages & UI

**`src/app/forum/page.tsx`**
- Main forum page component ("THE GREEN ROOM")
- Displays categories, posts, replies, likes
- Full forum UI with posting, replying, deleting functionality
- Contains "Green Room" branding in header

**`src/components/dashboard/BottomNavigation.tsx`**
- Contains "Green Room" button linking to `/forum`
- Line 177-187: Green Room navigation button with chat icon

### Forum API Routes

**`src/app/api/forum/categories/route.ts`**
- GET endpoint for forum categories

**`src/app/api/forum/posts/route.ts`**
- GET/POST endpoints for forum posts
- Handles post creation and listing

**`src/app/api/forum/posts/[id]/route.ts`**
- GET/PUT/DELETE endpoints for individual posts

**`src/app/api/forum/posts/[id]/replies/route.ts`**
- GET endpoint for replies to a specific post

**`src/app/api/forum/replies/route.ts`**
- POST endpoint for creating replies

**`src/app/api/forum/likes/`** (directory)
- Likely contains like/unlike functionality

**`src/app/api/forum/debug/route.ts`**
- Debug endpoint for forum functionality

**`src/app/api/forum/test/route.ts`**, **`test-post/route.ts`**, **`test-users/route.ts`**
- Test endpoints for forum features

**`src/app/api/forum-delete/[id]/route.ts`**
- Delete endpoint for forum posts/replies

### Forum Database Migrations

**`supabase/migrations/20250720000000_create_forum_tables.sql`**
- Creates `forum_categories`, `forum_posts`, `forum_replies`, `forum_likes`, `forum_rate_limits` tables

**`supabase/migrations/20250720010000_forum_rls.sql`**
- Row Level Security policies for forum tables

**`supabase/migrations/20250721000000_create_forum_posts_with_counts_view.sql`**
- Creates performance view for forum posts with aggregated counts

**`supabase/migrations/20250722000000_temporarily_disable_forum_rls.sql`**
- Temporarily disables RLS (likely for debugging)

**`supabase/migrations/20250722010000_add_user_photos_to_forum_view.sql`**
- Adds user photos to forum view

**`supabase/migrations/20250722020000_add_parent_post_id_to_forum_posts.sql`**
- Adds parent post ID for nested replies

**`supabase/migrations/20250723000000_fix_forum_posts_view_reply_count.sql`**
- Fixes reply count in forum posts view

---

## 3. VENDOR DASHBOARDS & VENDOR-SPECIFIC COMPONENTS

### Vendor Dashboard Pages

**`src/app/dashboard/vendor/page.tsx`**
- Main Vendor dashboard route
- Server component that fetches vendor profile and renders `VendorProfileClient`

**`src/components/dashboard/VendorProfileClient.tsx`**
- Complete Vendor dashboard UI component
- Displays business info, photo gallery, offers list
- Handles offer creation, editing, activation/deactivation
- Uses `PhotoGallery` with `userType="VENDOR"`

### Vendor Onboarding

**`src/app/onboarding/vendor/page.tsx`**
- Vendor-specific onboarding flow
- Creates vendor profile in `vendor_profiles` table
- Collects business information (name, industry, address, etc.)

**`src/app/onboarding/page.tsx`**
- Main onboarding page with Vendor option (lines 64-72)
- Redirects to `/onboarding/vendor` when Vendor is selected

### Vendor Offers System

**`src/components/dashboard/CreateOfferModal.tsx`**
- Modal for creating new vendor offers
- Handles photo upload for offers
- Creates offers via `/api/offers` endpoint

**`src/components/dashboard/OfferCard.tsx`**
- Card component displaying individual vendor offer
- Shows offer details, status, expiration, claim count
- Provides edit, delete, activate/deactivate actions

**`src/components/dashboard/OfferList.tsx`**
- Lists all offers for a vendor
- Uses `OfferCard` components

**`src/app/api/offers/route.ts`**
- POST: Create new offer (vendor-only)
- DELETE: Delete offer (vendor-only)
- Verifies user is vendor via `vendor_profiles` table

### Vendor Database Migrations

**`supabase/migrations/20250726000002_add_vendor_address_fields.sql`**
- Adds address fields to vendor profiles

**`supabase/migrations/20250726000003_create_offers_table.sql`**
- Creates `offers` table for vendor offers

**`supabase/migrations/20250726000004_create_claimed_offers_table.sql`**
- Creates `claimed_offers` table for tracking offer claims

**`supabase/migrations/20250726000023_add_vendor_profiles_table.sql`**
- Creates `vendor_profiles` table separate from `profiles`

**`supabase/migrations/20250726000024_add_photos_to_vendor_profiles.sql`**
- Adds photos array to vendor profiles

**`supabase/migrations/20250726000025_fix_offers_vendor_reference.sql`**
- Fixes foreign key reference from offers to vendors

**`supabase/migrations/20250726000026_fix_vendor_trigger_photos.sql`**
- Fixes trigger for vendor profile photos

**`supabase/migrations/20250726000027_fix_duplicate_vendor_profiles.sql`**
- Fixes duplicate vendor profile creation issue

**`supabase/migrations/20250726000022_revert_to_working_trigger.sql`**
- Reverts to working trigger (vendor-related)

### Vendor Type References

**`src/lib/database.types.ts`**
- Type definitions including vendor-related types

**`src/components/profile/types.ts`**
- `VendorProfile` interface definition
- `Offer` interface definition

**`src/contexts/AuthContext.tsx`**
- Checks `vendor_profiles` table when profile not found (lines 36-50)
- Sets `userType` to 'VENDOR' if vendor profile exists

**`src/components/profile/PhotoGallery.tsx`**
- Supports `userType="VENDOR"` for vendor photo galleries

---

## SUMMARY BY CATEGORY

### User Roles
- **Total files**: ~30+ files
- **Key locations**: 
  - Dashboards: `src/app/dashboard/{matchmakr,single,vendor}/`
  - Components: `src/components/dashboard/` (many files)
  - Auth: `src/contexts/AuthContext.tsx`, `middleware.ts`
  - Onboarding: `src/app/onboarding/`
  - Edge functions: `supabase/functions/sponsor-*/`

### Forum/Greenroom
- **Total files**: ~15+ files
- **Key locations**:
  - Page: `src/app/forum/page.tsx`
  - API routes: `src/app/api/forum/**`
  - Navigation: `src/components/dashboard/BottomNavigation.tsx` (Green Room button)
  - Migrations: `supabase/migrations/20250720*_forum*.sql` (8 migration files)

### Vendor-Specific
- **Total files**: ~15+ files
- **Key locations**:
  - Dashboard: `src/app/dashboard/vendor/`, `src/components/dashboard/VendorProfileClient.tsx`
  - Onboarding: `src/app/onboarding/vendor/`
  - Offers: `src/components/dashboard/{CreateOfferModal,OfferCard,OfferList}.tsx`, `src/app/api/offers/`
  - Migrations: `supabase/migrations/20250726*_vendor*.sql` (8 migration files)

---

## NOTES

- The term "MATCHMAKR" is used in the database and code, but should be displayed as "SPONSOR" in UI (see `src/app/forum/page.tsx` line 114-118)
- Vendor users are stored in separate `vendor_profiles` table, not `profiles` table
- Forum is branded as "THE GREEN ROOM" in the UI
- Bottom navigation includes "Green Room" button that must be removed
- Many components accept `userType` props that include 'VENDOR' option
- Middleware and routing logic redirects based on user type to appropriate dashboards

