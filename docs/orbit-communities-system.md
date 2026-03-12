# Orbit Communities System

**Internal Product & Engineering Reference**

This document is the source of truth for the Orbit Communities feature. Future implementation prompts should reference this spec to ensure consistency and avoid re-explaining the concept each time.

**Document structure:** Sections 1–5 define product specification (stable design intent). Section 6 defines implementation specification (how the system works in code). Section 13 provides the current implementation snapshot (what is built vs not yet implemented).

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
| 13 | Sponsors cannot create communities during onboarding; creation happens from the dashboard. |
| 14 | Organic singles do not see a community step during onboarding. |

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

## 6. Implementation Specification

*Technical details for how the system works in code. Product rules and philosophy are defined above.*

### Invite Community Context (Architecture Decision)

Invites should support an **optional explicit community context**.

Invites are intended to carry:

- `community_id` (nullable)

**Interpretation:**

- `community_id = NULL` → general Orbit invite, not tied to a specific community
- `community_id = some community` → invite into Orbit with a specific community context

This replaces the earlier inference approach where invite community context was not explicitly stored on the invite row.

**Why this change:** Inferred community context is ambiguous and can be wrong. A sponsor may belong to multiple communities, and an inferred choice may not be the intended context for the invite. Explicit invite community context is more trustworthy, more flexible, and more secure.

*Example:* A sponsor in the San Diego community may invite someone in Nashville for a profession-based reason (for example, both are accountants). Inferring "San Diego" as the invite context may be arbitrary or wrong. The invite should either carry a specific intended community or no community at all.

---

### Current API Surface

The Communities system currently exposes the following endpoints:

**GET /api/communities**  
Public browse endpoint returning safe metadata only.

Response fields:
- id
- name
- description
- join_mode
- created_at

**POST /api/communities/[id]/join**  
Authenticated endpoint to join a community.

Behavior:
- Enforces membership cap (3 communities)
- Allows joining open communities without invite token
- Requires valid invite token for sponsor_invite_only communities
- For invite-only: requires invite status `PENDING`
- For invite-only: validates that the invite's explicit `community_id` matches the target community

---

### Database Model

*Implemented. See migration `20260308000000_create_communities_tables.sql`.*

#### Communities Table

| Field | Notes |
|-------|-------|
| `id` | Primary key |
| `name` | Community name |
| `description` | Optional / nullable |
| `created_by` | FK to profiles.id — Must reference a profile with user_type = sponsor |
| `join_mode` | `open` \| `sponsor_invite_only` |
| `created_at` | Timestamp |

**Note:** `created_by` represents the **founding sponsor**. The founding sponsor must also have a corresponding row in `community_members` with `role = founder`.

#### Community Members Table

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

#### Indexes (Implemented)

- `idx_community_members_profile_id`
- `idx_community_members_community_id`
- Uniqueness constraint on `(community_id, profile_id)` already exists.

**Likely access patterns:**

- Query communities for a given profile
- Query members of a community
- Filter profiles by community membership

Indexes should support these patterns.

---

### Join Logic

Joining requires authentication. Membership cap (3 per user) is enforced at join time.

#### Invite-Only Community Join Logic

**Invite-bound community authorization model:** Invite-only (`sponsor_invite_only`) communities can be joined only when:

- A valid invite token is present in the join request
- The invite is still valid / pending
- The invite's explicit `community_id` matches the target community

Otherwise the join API returns 403. Open communities do not require an invite token.

The implemented model uses invite-bound community authorization with explicit `invite.community_id`.

---

### Public Community Browsing Requirement

Community browsing must be possible **before signup** for onboarding use cases. Therefore lightweight community discovery must be available **pre-authentication**.

Public browse is primarily used during onboarding and early discovery flows. Authenticated users will later discover communities through dashboard features.

- **Joining** still requires authentication.
- **Creating** still requires authentication.

Public community browse must expose **only safe metadata**, such as:

- id
- name
- description
- join_mode
- created_at

Public browse must **not expose**:

- member lists
- founder identity
- detailed network structure
- any sensitive information

---

### Onboarding Join Mechanics

Community join occurs **after signup** via API call. During onboarding, the user selects a community to join; the actual join is performed after successful account creation when a session exists. The onboarding flow stores a `communityIntent`; if the user selected a community and a session exists post-signup, the client calls `POST /api/communities/[id]/join`.

---

### Next Implementation Direction (UI Surface)

The next intended implementation surface is the sponsor dashboard community UI, specifically the **My Communities** section.

Likely data source:

- `GET /api/communities/me` for the authenticated sponsor's current memberships / affiliations

Planned integration direction (later phases):

- Connect to **Explore / Find Communities** flow
- Connect to **Create Community** flow

---

## 7. User Experience Direction

### Sponsor Dashboard Primary Entry Point

The sponsor dashboard should include a dedicated **My Communities** section.

This is the **primary entry point** for sponsor community visibility and lightweight management.

Communities should not primarily live in Settings.

**Entry hierarchy:**

- **Primary:** Sponsor dashboard **My Communities** section
- **Secondary (later):** invite modals, managed singles surfaces, single profile labels

---

### Sponsor Dashboard UI Framing

The **My Communities** section should reinforce sponsor status and affiliation.

Communities should feel like **networks / affiliations**, not preferences or filters.

The section should visually differ from the dashboard's normal vertical card stack by using a **horizontal row / carousel** of sleek community tiles.

---

### Community Tile Direction

Community tiles should remain simple, sleek, and theme-consistent.

- Accent color may be used to differentiate communities
- Community visual identity should remain lightweight and elegant
- Do **not** commit to emoji-style icons

---

### Lightweight Community Detail Surface (Early Scope)

Clicking a community may open a lightweight detail surface.

Early detail surface should remain minimal, for example:

- name
- founder
- member count
- description
- invite CTA

Do **not** add heavy social-network behavior in this early surface:

- full member directory
- feed
- posts
- community chat

---

### Community Onboarding Visibility by User Type / Entry Mode

| Entry mode | Community step during onboarding? | Behavior |
|------------|-----------------------------------|----------|
| **Organic sponsor** | Yes | Sees community browse step; may join or skip; cannot create community during onboarding |
| **Invited sponsor** | Yes | Same as organic sponsor; suggested community shown only when invite carries explicit `community_id` |
| **Invited single** | Yes | Sees community step; suggested community shown only when invite carries explicit `community_id` |
| **Organic single** | No | Does NOT see community step |

**Invite community suggestion:** Invited users may see a suggested community during onboarding **only when the invite itself carries an explicit `community_id`**. If the invite has no `community_id`, onboarding behaves as a normal invite flow without community preselection.

**Reasoning:** Communities are powerful when they represent real trust networks. For invited users, "join someone's community" is meaningful context. For organic singles, forcing community browsing during onboarding can feel empty, exclusionary, or irrelevant. Organic singles should instead discover communities later through dashboard features such as **Find a Community**.

---

### Sponsor Onboarding / Usage

**Sponsors cannot create communities during onboarding.** Community creation happens **later from the dashboard** once the user has completed onboarding.

**Reasoning:** Allowing community creation during onboarding would encourage fragmentation and duplicate communities (e.g., multiple "San Diego" communities). By delaying creation until after onboarding, users see existing communities first, the network graph remains more coherent, and communities remain meaningful trust structures.

During onboarding, sponsors may:

- Join an existing community
- Skip for now

The **Skip** option should be presented clearly and non-judgmentally. The UI should communicate that the sponsor can "Create or join a community later from the dashboard." This keeps onboarding friction low while still emphasizing the importance of communities.

Sponsors can optionally invite users into Orbit with a **specific community context**.

---

### Single Onboarding

Singles cannot found communities.

- **Invited singles** may join a suggested community during onboarding when the invite carries an explicit `community_id`.
- **Organic singles** skip community onboarding entirely.
- Communities can be discovered later via dashboard features such as **Find a Community**.

If a sponsor invites a user with an explicit community context, that community will be suggested during onboarding but the user must confirm membership.

- Singles may join **open communities** themselves.
- Invite-only communities require sponsor invitation. Invite-only communities remain non-selectable during onboarding unless the invite carries an explicit `community_id` matching that community and a valid invite token is present.

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

- Sponsor dashboard **My Communities** tile enhancements
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
- Community ranking or popularity signals
- Moderation/admin tools
- Possible future roles beyond founder
- Whether communities ever appear on public profiles

**Architectural status:** Invite community context is now explicitly carried on invites via nullable `community_id`, and is used by onboarding suggestion and invite-only join authorization.

---

## 11. Implementation Principles

1. The system should remain simple and legible.
2. Communities should remain lightweight context objects, not social spaces.
3. Avoid adding moderation, ranking, or reputation systems during initial implementation.
4. Prefer small, incremental schema and UI changes rather than a single large migration.

---

## 12. Phased Implementation Plan

### Phase 1: Foundation

**Phase 1 implementation now includes:**

- `communities` table
- `community_members` table
- Sponsor validation trigger
- Founder membership trigger
- Public community browse endpoint (`GET /api/communities`, no auth required)
- Join endpoint (`POST /api/communities/[id]/join`) with membership cap (3)
- Onboarding integration with community selection
- Invite-based community suggestion using invite `community_id`
- Invite-only join validation using invite tokens

Invite-based onboarding suggestion and invite-only join logic are now driven by explicit `invite.community_id`.

**Not yet implemented in Phase 1:**

- Community creation remains dashboard-only (not onboarding); **dashboard community creation UI is not yet implemented**
- Dashboard community UI is not yet implemented
- Pond filtering by communities is not yet implemented

**Phase 1 DB foundation completed (2026-03-08):** `communities` and `community_members` created; sponsor-validation trigger added; founder-membership trigger added; RLS enabled without policies. Old geolocation system (`orbit_community_slug`) still present in profiles; onboarding no longer writes to it.

### Phase 2: Discovery & Membership

- Community discovery ("Find a community" flow)
- Joining communities (open and invite-only) — **join API implemented**
- Membership limits (3 per user) — **implemented**
- Sponsor invite flow with optional community preselection — **implemented** (writes nullable `invite.community_id`)
- Invite community suggestion for invited sponsors and singles — **implemented** (uses invite's explicit `community_id`)

### Phase 3: Pond Integration

- Community filter option in the pond
- Multi-select community filtering
- Ensure communities narrow pool without hard-blocking matches

### Phase 4: Dashboard & Polish

- Sponsor dashboard **My Communities** section as primary community surface (horizontal row / carousel tile UI)
- Lightweight community detail surface (name, founder, member count, description, invite CTA only)
- Community-based reputation signals (if applicable)
- Community activity indicators (if applicable)
- Secondary entry points later (invite modals, managed singles surfaces, profile labels)
- UX polish and edge-case handling

---

## 13. Current Implementation Snapshot

*What is already built vs not yet implemented.*

**Implemented:**

- Community data model (communities, community_members)
- Public browse (`GET /api/communities`, safe metadata only)
- Join API with membership cap (3)
- Onboarding integration with community selection
- Invite community suggestion based on invite `community_id`
- Invite-only join validation requiring valid invite token, `PENDING` status, and matching invite `community_id`

**Not Yet Implemented:**

- Community creation UI (dashboard)
- Community discovery/search
- Pond community filtering
- Sponsor dashboard **My Communities** primary UI surface
- Lightweight community detail surface
- Community dashboard signals

---

## Document History

| Date | Change |
|------|--------|
| 2026-03-08 | Initial spec created. Documentation only; no implementation. |
| 2026-03-08 | Phase 1 DB foundation completed. communities and community_members created; sponsor-validation trigger added; founder-membership trigger added; RLS enabled without policies. Old geolocation system still present temporarily until app migration. |
| 2026-03-08 | Onboarding refinement: community visibility by entry mode (organic vs invited); sponsors cannot create during onboarding; public browse requirement; organic singles skip community step; rules 13–14 added. |
| 2026-03-10 | Implementation slices completed: Community browse API (public, safe metadata); join API with membership cap; invite preselection support; invite-only join allowed when valid invite token present; onboarding refactor removing orbit_community_slug writes; communityIntent state; public community browsing during onboarding; sponsors cannot create during onboarding; organic singles skip community step; invite-based community suggestion support added. |
| 2026-03-10 | Document restructure: Added Implementation Specification section (Database Model, Join Logic, Public Browse, Onboarding Join Mechanics); moved implementation details from User Experience; renamed Implementation Status to Current Implementation Snapshot; added document structure note. No product rules or meaning changed. |
| 2026-03-10 | Architecture decision: Invites should carry optional explicit `community_id`; replaces inferred invite community context. Updated invite-only join logic, onboarding suggestion assumptions, phased plan, and implementation snapshot to reflect invite-bound community authorization. |
| 2026-03-11 | Invite Explicit Community Context slices completed: invite creation writes nullable `invites.community_id`, invite read API sources community context from invite row, and invite-only join authorization requires matching `invite.community_id`. |
| 2026-03-12 | UX direction clarified: sponsor dashboard **My Communities** is the primary communities entry point (not Settings), with horizontal tile/carousel framing, lightweight tile identity, and constrained early detail surface scope. Added entry-point hierarchy and implementation direction for next dashboard UI slice. |
