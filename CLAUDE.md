# CLAUDE.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical Context

- **Orbit is an introductions platform, not a dating app.** Sponsors (typically married friends) create profiles for singles they know and introduce them to other sponsors' singles. Singles never swipe or browse. Key positioning: "I'm not on the apps — I have an Orbit."
- **"MatchMakr" in code = "Sponsor"** in all new code and UI copy. The codebase uses "matchmakr" as a legacy term. Always use "Sponsor" going forward.
- **Vendor, Pond, and Forum features are NOT active.** Do not build on, reference, or extend them. They exist in the codebase but are deprecated or future scope.
- **SQL migrations:** Generate as `.sql` files only. Lee runs them manually in the Supabase SQL editor. NEVER execute migrations directly. NEVER run `supabase db push`.
- **The migration files in `/supabase` are out of sync with the live database.** Do not trust them as the source of truth for the current schema.
- **UI copy tone:** Warm and conversational. Use "introduce" not "set up." The app should feel premium, curated, and trust-based. Avoid anything that feels like a generic dating app.
- **Onboarding styling** uses a dark/luxe aesthetic (dark navy + gold/cream accent) scoped via `onboarding-*` CSS classes, separate from the global Orbit theme system.
- **Singles don't edit their own profiles** — sponsors curate profiles for them.
- **Sponsors can ONLY communicate with other sponsors.** There is no UI for a sponsor to message a single who isn't theirs. This is a core trust guardrail.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # ESLint
npm run start    # Start production server
```

No test framework is configured.

## Architecture Overview

**Orbit** (codebase name: MatchMakr_v0) is built on Next.js 14 App Router + Supabase.

### User Roles

Two active roles with different data models and routing:

| Role (in code) | Preferred Term | DB Table | Dashboard |
|----------------|---------------|----------|-----------|
| `SINGLE` | Single | `profiles` | `/dashboard/single` |
| `MATCHMAKR` | **Sponsor** | `profiles` | `/dashboard/matchmakr` |

### Auth & State

- `src/contexts/AuthContext.tsx` — Global user type caching (avoids repeated DB queries). The user's role is fetched once and cached here. Always read user type from this context, never fetch directly.
- `src/lib/supabase/client.ts` — Singleton browser client (prevents duplicate real-time subscriptions).
- `src/lib/supabase/server.ts` — Server-side Supabase client.
- `middleware.ts` — Handles unauthenticated redirects and role-based routing at the edge.

### Key Directories

```
src/
├── app/
│   ├── api/          # REST API routes (conversations, matches, invites, etc.)
│   ├── auth/         # Auth callback routes
│   ├── dashboard/    # Role-specific dashboards + chat
│   ├── onboarding/   # Multi-step onboarding (single & sponsor paths)
│   └── invite/[token]/ # Invite gate
├── components/
│   ├── dashboard/    # Dashboard-specific components
│   ├── onboarding/   # Onboarding step components
│   ├── chat/         # Chat UI components
│   └── ui/           # Base UI components
├── contexts/         # AuthContext, NotificationsContext, ChatModalContext
├── config/           # orbitConfig.ts (feature flags), palette.ts, theme.ts
├── lib/              # Supabase clients, utilities, caching helpers
└── types/            # orbit.ts, pairings.ts, sneak-peek.ts
supabase/
├── migrations/       # SQL migration files (OUT OF SYNC — do not trust)
└── functions/        # Edge functions
```

### Core Flows

**Introductions:** Sponsors connect with other sponsors → both sponsors approve an introduction between their respective singles → singles can then chat directly.

**Chat:** Sponsor↔Sponsor (discussing potential introductions) and Single↔Sponsor chats. Real-time via Supabase subscriptions. See `NotificationsContext` for unread counts.

**Onboarding:** Role selection → conditional steps → account creation → community selection. Invite mode (`src/lib/invite-mode.ts`) affects available paths. Sponsor: 4 screens (HowItWorks → UserType → Name → Account). Single: 7 screens (adds Birthday, Sex, OpenTo). ToS/Privacy acceptance tracked in `tos_acceptances` table.

### Styling

Tailwind CSS with a custom theme system. Themes (`navy-classic`, `plum-society`, `invitation-cream`, `dev-charcoal`) are applied via `data-theme` on the root element using CSS variables. Color palette defined in `src/config/palette.ts` and `tailwind.config.ts`.

### Feature Flags

`src/config/orbitConfig.ts` controls feature availability. Forum and vendor features are currently toggled off.

### Database

Supabase PostgreSQL with Row Level Security. Key tables: `profiles`, `conversations`, `messages`, `matches`, `notifications`, `tos_acceptances`. Performance views exist for complex queries — prefer views over raw joins where available.

### Current Priorities

1. Dashboard empty states — what sponsors and singles see after completing onboarding, with guided first actions.
2. Landing page at orbitintroductions.com — needs real marketing copy/design.
3. Orbit Coach feature (cold start solution, details TBD).