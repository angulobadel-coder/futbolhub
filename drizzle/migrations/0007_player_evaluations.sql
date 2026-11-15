CREATE TABLE public.player_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  period text NOT NULL,
  evaluated_on date NOT NULL DEFAULT current_date,
  technique smallint NOT NULL CHECK (technique BETWEEN 1 AND 5),
  tactics smallint NOT NULL CHECK (tactics BETWEEN 1 AND 5),
  physical smallint NOT NULL CHECK (physical BETWEEN 1 AND 5),
  attitude smallint NOT NULL CHECK (attitude BETWEEN 1 AND 5),
  strengths text,
  improvements text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_evaluations TO authenticated;
GRANT ALL ON public.player_evaluations TO service_role;
ALTER TABLE public.player_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evaluations read" ON public.player_evaluations FOR SELECT TO authenticated
  USING (is_school_staff(school_id) OR is_superadmin() OR can_view_player(player_id, school_id));
CREATE POLICY "evaluations write" ON public.player_evaluations FOR ALL TO authenticated
  USING (is_school_staff(school_id) OR is_superadmin())
  WITH CHECK (is_school_staff(school_id) OR is_superadmin());
CREATE INDEX ON public.player_evaluations (school_id, player_id);