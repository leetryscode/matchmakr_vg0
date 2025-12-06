# SYSTEM / CONTEXT

You are helping me refactor an existing matchmaking app from **MatchMakr / GREENLIGHT** into a simplified product called **Orbit**.

## Tech Stack

- Next.js 14 App Router
- TypeScript
- Tailwind
- Supabase (auth, Postgres, realtime)

## Constraints

- We are keeping the existing Supabase project.
- We are **NOT** deleting any tables, including Vendor or Forum tables.
- Orbit will simply **ignore** all Vendor- and Forum-related database tables.

## Orbit's Product Model (V1)

- Only two roles exist: **SPONSOR** and **SINGLE**.
  - **SPONSOR** = friend who creates and manages the Single's profile.
  - **SINGLE** = person being matched; they only approve/deny matches via a "sneak peek."

The app should feel like:
- A sponsor-driven matchmaking tool
- Low emotional stakes for singles
- No social-network/forum/vendor features

## What Must Stay Working

- Auth & role-based dashboards
- Profiles
- Sponsorship relationships
- Matches & match approval
- Conversations & messages (chat)

## What Must Disappear (from UI + code paths)

- Vendor role + vendor dashboards
- Greenroom / forum features
- Any UI copy related to MatchMakr / Greenlight branding

## How You Should Behave as Cursor

- Make incremental, safe changes—never big rewrites.
- Be explicit about which files you edit.
- Preserve all working Sponsor/Single functionality.
- Treat Vendor and Forum code as dead weight to hide or safely remove from code paths.
- When unsure, ask which direction best matches Orbit's goals.

