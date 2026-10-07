CREATE TYPE public.payment_method AS ENUM ('efectivo','transferencia','tarjeta','otro');

CREATE OR REPLACE FUNCTION public.is_school_director(_school_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()
    AND ((school_id = _school_id AND role = 'director') OR role = 'superadmin'));
$$;

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  concept text NOT NULL DEFAULT 'Mensualidad',
  period text,
  amount integer NOT NULL CHECK (amount > 0),
  due_date date NOT NULL,
  paid_at date,
  method public.payment_method,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX payments_player_period_concept ON public.payments(player_id, period, concept) WHERE period IS NOT NULL;
CREATE INDEX payments_school_idx ON public.payments(school_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_select" ON public.payments FOR SELECT TO authenticated
  USING (public.is_school_director(school_id) OR public.is_player_guardian(player_id)
    OR EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_id AND p.user_id = auth.uid()));
CREATE POLICY "payments_manage" ON public.payments FOR ALL TO authenticated
  USING (public.is_school_director(school_id)) WITH CHECK (public.is_school_director(school_id));