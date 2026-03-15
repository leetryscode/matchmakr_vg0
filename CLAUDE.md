# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run lint     # ESLint
npm run start    # Start production server
```

No test framework is configured.

## Architecture Overview

**Orbit** is a matchmaking platform (formerly MatchMakr) built on Next.js 14 App Router + Supabase.

### User Roles

Three distinct roles with different data models and routing:

| Role | Also Called | DB Table | Dashboard |
|------|-------------|----------|-----------|
| `SINGLE` | — | `profiles` | `/dashboard/single` |
| `MATCHMAKR` | Sponsor | `profiles` | `/dashboard/matchmakr` |
| `VENDOR` | — | `vendor_profiles` | `/dashboard/vendor` |

**Important:** Vendor users are normalized to `MATCHMAKR` for Orbit routing logic. See `src/types/orbit.ts` and `src/config/orbitConfig.ts`.

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
│   ├── onboarding/   # Multi-step onboarding (single & vendor paths)
│   ├── pond/         # Single discovery page
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
├── migrations/       # 20+ SQL migration files
└── functions/        # Edge functions
```

### Core Flows

**Match/Sponsorship:** Sponsors invite or sponsor singles → both sponsors approve → singles can chat directly.

**Chat:** Sponsor↔Sponsor (about a specific single) and Single↔Sponsor chats. Real-time via Supabase subscriptions. See `NotificationsContext` for unread counts.

**Onboarding:** Role selection → conditional steps → account creation → community selection. Invite mode (`src/lib/invite-mode.ts`) affects available paths.

**Vendor Offers:** Vendors create offers in `vendor_profiles`; singles/sponsors browse via `/dashboard/date-ideas`.

### Styling

Tailwind CSS with a custom theme system. Themes (`navy-classic`, `plum-society`, `invitation-cream`, `dev-charcoal`) are applied via `data-theme` on the root element using CSS variables. Color palette defined in `src/config/palette.ts` and `tailwind.config.ts`.

### Feature Flags

`src/config/orbitConfig.ts` controls feature availability. Forum and vendor features are currently toggled here.

### Database

Supabase PostgreSQL with Row Level Security. Key tables: `profiles`, `vendor_profiles`, `conversations`, `messages`, `matches`, `notifications`. Performance views exist for complex queries — prefer views over raw joins where available. See `supabase/migrations/` for schema history.
