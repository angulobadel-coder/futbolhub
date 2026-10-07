DROP INDEX IF EXISTS public.payments_player_period_concept;
ALTER TABLE public.payments ADD CONSTRAINT payments_player_period_concept UNIQUE (player_id, period, concept);