-- Migration: Create notifications table for in-app notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  type text not null, -- e.g. 'new_match', 'new_message'
  data jsonb,         -- extra info (e.g. match_id, message_id, etc.)
  read boolean not null default false,
  created_at timestamp with time zone default now()
);

create index notifications_user_id_idx on notifications(user_id, read, created_at desc); 