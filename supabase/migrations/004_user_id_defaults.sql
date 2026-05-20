-- Migration 004: Add auth.uid() defaults to user_id columns
-- This ensures inserts without explicit user_id automatically get the authenticated user's ID

ALTER TABLE public.transactions ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.budgets ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.goals ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.cards ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.rules ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.templates ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.user_configs ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public.settings ALTER COLUMN user_id SET DEFAULT auth.uid();
