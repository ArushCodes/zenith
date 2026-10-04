create table public.student_enrolments (
  mahe_id text primary key check (mahe_id ~ '^[0-9]{12}$'),
  roll_no text not null unique,
  full_name text not null,
  dob date not null,
  email text not null unique check (email = lower(email) and split_part(email,'@',2)='learner.manipal.edu'),
  batch_id uuid not null references public.batches(id),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.student_enrolments enable row level security;
revoke all on public.student_enrolments from public, anon, authenticated;
grant select, insert on public.student_enrolments to service_role;
