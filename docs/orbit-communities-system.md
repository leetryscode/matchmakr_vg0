# Orbit Communities System

**Internal Product & Engineering Reference**

This document is the source of truth for the Orbit Communities feature. Future implementation prompts should reference this spec to ensure consistency and avoid re-explaining the concept each time.

---

## 1. Feature Context

### Current State

- During onboarding, users are assigned to a **geographic community** based on location.
- These geographic communities are used for matchmaking context and filtering.

### The Problem

Pure geolocation is too limiting for the Orbit model. Real matchmaking happens through **trusted social networks**, not just physical proximity.

Example contexts that matter more than location:

- Harvard alumni
- Military spouse networks
- Church communities
- Tech founder circles
- Friend-of-friend networks

### The Solution

The new system **replaces the rigid geolocation-only model** with a flexible **Communities system** that can represent both geographic and social networks.

Examples of communities:

- San Diego
- North County
- Harvard alumni
- Military spouses
- Church community

Users may belong to multiple real-world contexts simultaneously.

### What the New System Enables

- Multiple communities per user
- Communities founded by sponsors
- Open or restricted membership
- Community-based filtering in the matchmaking pond

**Important:** This system replaces the old geolocation-only community model used during onboarding.

---

## 2. Migration Strategy

The existing geolocation-based community system will be fully replaced.

Because Orbit currently has no production user base, we will use a direct replacement strategy.

Migration approach:

- The old geographic community assignment will be removed.
- The new `communities` and `community_members` tables will become the source of truth.
- Existing development or test profiles may be manually reassigned if needed.

No backward compatibility layer is required.

---

## 3. Product Philosophy

Communities are **NOT social groups**.

Communities are **context layers for trust and discovery**.

They should help answer: *"How do these people know each other?"*

### Communities Should

- Organize the matchmaking pool
- Provide social trust signals
- Elevate sponsor status

### Communities must NOT

- Become content spaces
- Have feeds
- Support posts or comments
- Behave like Facebook groups

They are **context objects**, not destinations.

---

## 4. Core Product Rules

| # | Rule |
|---|------|
| 1 | Sponsors can found communities. |
| 2 | Singles cannot found communities. |
| 3 | Singles can search for and join communities. |
| 4 | Both user types can belong to multiple communities. |
| 5 | Initial membership cap: **3 communities per user (enforced at join time).** |
| 6 | Communities must never hard-block matches. They are filters only. |
| 7 | Sponsor invites can preselect a community during onboarding. |
| 8 | The invited user confirms membership rather than being silently auto-added. |
| 9 | Users can browse and join communities later via a **Find a Community** flow. |
| 10 | A user cannot join more than 3 communities simultaneously. |
| 11 | Users may leave communities in order to join different ones later. |
| 12 | Leaving a community removes the corresponding row from community_members. |

---

## 5. Model Decision: `join_mode` (Not Community Type)

We are **intentionally not introducing a "community type" field** (e.g., geographic vs social).

**Reason:** Many communities overlap categories.

Examples:

- "Harvard in San Diego"
- "Military spouses in Austin"

A strict classification would become messy quickly.

Instead, communities use **`join_mode`**.

### `join_mode` Values

| Value | Meaning |
|-------|---------|
| `open` | Anyone can discover and join the community. |
| `sponsor_invite_only` | Users must be invited by a sponsor who is already a member of the community. |

This preserves both:

- Broad communities (San Diego, Harvard alumni)
- Tighter sponsor-led networks

---

## 6. Database Model Direction

*No code or migrations yet. Conceptual only.*

### Communities Table

| Field | Notes |
|-------|-------|
| `id` | Primary key |
| `name` | Community name |
| `description` | Optional / nullable |
| `created_by` | FK to profiles.id — Must reference a profile with user_type = sponsor |
| `join_mode` | `open` \| `sponsor_invite_only` |
| `created_at` | Timestamp |

**Note:** `created_by` represents the **founding sponsor**. The founding sponsor must also have a corresponding row in `community_members` with `role = founder`.

### Community Members Table

| Field | Notes |
|-------|-------|
| `id` | Primary key |
| `community_id` | FK to communities |
| `profile_id` | FK to profiles |
| `role` | `founder` \| `member` |
| `joined_at` | Timestamp |

**Notes:**

- Each profile may only have one membership per community. Engineering translation: `UNIQUE (community_id, profile_id)`.
- The founding sponsor will also have a membership row with `role = founder`.
- `community_members` will likely grow large. This is expected.
- It is a standard join table.

### Future DB Considerations (Do NOT Implement Yet)

- Unique constraint on `(community_id, profile_id)`
- Index on `profile_id`
- Index on `community_id`

**Likely access patterns:**

- Query communities for a given profile
- Query members of a community
- Filter profiles by community membership

Indexes should support these patterns.

---

## 7. User Experience Direction

### Sponsor Onboarding / Usage

Sponsors may:

- Found a new community
- Join existing communities

Sponsors can invite users into Orbit with a **community preselected**.

---

### Single Onboarding

Singles cannot found communities.

If a sponsor invites a user through a community, that community will be preselected during onboarding but the user must confirm membership.

During onboarding they may:

- Accept the sponsor's suggested community
- Skip for now

Later, from dashboard, they can use **"Find a community"** to search and join communities.

- Singles may join **open communities** themselves.
- Invite-only communities require sponsor invitation.

---

### Pond / Match Pool

Community will become a **filter option** in the pond.

Users will be able to select **multiple communities** when filtering.

**Example:**

```
Community filters:
☑ San Diego
☑ North County
☐ Harvard alumni
```

Communities narrow the matchmaking pool but **do not restrict matching**.

---

## 8. Dashboard Signals (Future)

Later phases may include:

- Community labels on profiles
- Display of founding sponsor
- Community-based reputation signals
- Community activity indicators

These are **future enhancements**, not required for the first build.

---

## 9. Guardrails

To prevent this system from becoming Facebook-like:

| Prohibited | Reason |
|------------|--------|
| Communities cannot have posts | Keeps them as context objects |
| Communities cannot have feeds | Not social hubs |
| Communities cannot have comment threads | Not content spaces |
| Communities must not become engagement hubs | Stays focused on trust/discovery |

Communities exist only to provide **context and filtering**.

**Membership cap (3)** helps prevent identity sprawl.

**Community names:** Community names should be globally unique or enforced via slug uniqueness to avoid duplicate communities (e.g., multiple "San Diego" groups) unless explicitly intended. Not enforced in initial build; document for future consideration.

---

## 10. Open Questions / Deferred Items

Unresolved design questions to revisit during implementation:

- Exact UI for "Find a community"
- Community discovery (search vs recommendations)
- Dashboard placement of community labels
- Community ranking or popularity signals
- Moderation/admin tools
- Possible future roles beyond founder
- Whether communities ever appear on public profiles

---

## 11. Implementation Principles

1. The system should remain simple and legible.
2. Communities should remain lightweight context objects, not social spaces.
3. Avoid adding moderation, ranking, or reputation systems during initial implementation.
4. Prefer small, incremental schema and UI changes rather than a single large migration.

---

## 12. Phased Implementation Plan

### Phase 1: Foundation

- Database model (communities, community_members)
- Basic community creation (sponsors only)
- Onboarding support (sponsor preselection, single confirmation)
- Deprecate/remove old geolocation-only community assignment

### Phase 2: Discovery & Membership

- Community discovery ("Find a community" flow)
- Joining communities (open and invite-only)
- Membership limits (3 per user)
- Sponsor invite flow with community preselection

### Phase 3: Pond Integration

- Community filter option in the pond
- Multi-select community filtering
- Ensure communities narrow pool without hard-blocking matches

### Phase 4: Dashboard & Polish

- Dashboard signals (community labels, founding sponsor display)
- Community-based reputation signals (if applicable)
- Community activity indicators (if applicable)
- UX polish and edge-case handling

---

## Document History

| Date | Change |
|------|--------|
| 2026-03-08 | Initial spec created. Documentation only; no implementation. |
