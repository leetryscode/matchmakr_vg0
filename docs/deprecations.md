# Deprecations and Frozen Features

This document tracks deprecated or frozen features that remain in the codebase for reversibility or future strategy.

---

## Vendor V1 (Frozen)

**Status:** Frozen as of 2026-02-15

Auto-creation of `vendor_profiles` on `auth.users` INSERT has been frozen via a database feature flag.

- **Trigger:** `on_auth_user_created_vendor` remains attached to `auth.users` (cannot be dropped due to Supabase restrictions).
- **Function:** `public.handle_new_vendor()` now checks `public.feature_flags.enable_vendor_v1` before inserting. When the flag is `false` (default), the function exits early and performs no side effects.
- **Re-enable:** Run `SELECT public.set_feature_flag('enable_vendor_v1', true);` to restore auto-creation behavior.
- **Schema:** `vendor_profiles`, `offers`, and `claimed_offers` tables remain intact for future V2 rebuild strategy.

**Migration:** `20260215100000_freeze_vendor_v1_feature_flag.sql`

### Repo Audit (2026-02-15)

| Table / Concept | Usage | Depends on Auto-Creation? |
|-----------------|-------|---------------------------|
| `vendor_profiles` | AuthContext (user type lookup), PhotoGallery (photo updates), profile page (current user check), ensure-nudges API | **No** — all flows read/update existing rows. No flows create new vendor_profiles. |
| `offers` | VendorProfileClient (CRUD), CreateOfferModal, API routes | **No** — requires existing `vendor_id` in vendor_profiles. Existing vendors continue to work. |
| `claimed_offers` | Migrations, database types only | **No** — no app flows depend on vendor auto-creation. |

**Conclusion:** No active flows depend on vendor auto-creation. The freeze is safe. Existing vendor_profiles rows continue to function; only new VENDOR signups will not receive auto-created profiles.

---

## Vendor V1 Tables (Relocated to legacy schema)

**Date of relocation:** 2026-02-15 (Project Cleanup)

As part of Project Cleanup, Vendor V1–related tables were relocated from `public` into a dedicated `legacy` schema to reduce dashboard clutter and prevent accidental use. **This was intentional. This was not deletion.**

### Tables moved

| From | To |
|------|-----|
| `public.vendor_profiles` | `legacy.vendor_profiles` |
| `public.offers` | `legacy.offers` |
| `public.claimed_offers` | `legacy.claimed_offers` |

Forum tables were previously relocated as well.

### Why

- Vendor V1 is frozen. Auto-creation is guarded by `public.feature_flags` → `enable_vendor_v1 = false`.
- The trigger on `auth.users` still exists, but `handle_new_vendor()` exits early unless the feature flag is enabled. The system is fully reversible.
- Relocation reduces schema clutter, prevents accidental new development on V1 structures, keeps schema intact for potential V2 migration strategy, and improves mental clarity when viewing Supabase.

### Important notes

- **No compatibility views were created.** Any future use must reference `legacy.*` explicitly.
- **Do not use `legacy` tables for new development.** If Vendor V2 is built, it should use new tables in `public`, not resurrect legacy ones.
