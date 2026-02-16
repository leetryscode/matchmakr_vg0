# To Do

Technical debt and future improvements. Not urgent; document for when capacity allows.

---

## Sex / open_to Case Inconsistency

**Status:** Not a problem now; document for future cleanup

**Problem:** `profiles.sex` and `profiles.open_to` use inconsistent casing:

| Field     | Current values              | Source                          |
|----------|-----------------------------|----------------------------------|
| `sex`    | `'Male'` / `'Female'`       | Onboarding (`AccountCreationStep`) |
| `open_to`| `'men'`, `'women'`, `'both'`| DB constraint (lowercase)        |

Mixing case invites subtle bugs (e.g. `sex === 'male'` vs `sex === 'Male'`). The Pond RPC (`get_pond_candidates`) uses `LOWER(TRIM(...))` so comparisons work today, but the inconsistency remains.

**Recommendation:** Normalize to consistent lowercase across the board.

- **Option A — Consistent lowercase:** Change `sex` to `'male'` / `'female'` everywhere (onboarding, DB, RPC). Simpler; aligns with `open_to`.
- **Option B — Postgres enums:** Add `sex_enum` and `open_to_enum`; migrate columns. Stronger validation; more migration work.

**Places to update (if Option A):**

- `src/components/onboarding/AccountCreationStep.tsx` — `sex: 'Male' | 'Female'`
- `src/app/onboarding/page.tsx` — `sex: null as 'Male' | 'Female' | null`
- `supabase/migrations/20260215120000_get_pond_candidates.sql` — already uses `LOWER()`; no change needed
- Any code that compares `sex` directly (e.g. `sex === 'Male'`)

**Data migration:** If existing rows have `'Male'` / `'Female'`, add a migration to `UPDATE profiles SET sex = LOWER(sex) WHERE sex IS NOT NULL` before changing application code.
