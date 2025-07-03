create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references profiles(id) not null,
  recipient_id uuid references profiles(id) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc', now()) not null,
  read boolean default false not null
);
