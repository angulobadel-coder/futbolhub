CREATE TABLE public.training_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'tecnica',
  objective text,
  duration_min integer NOT NULL DEFAULT 10,
  intensity text NOT NULL DEFAULT 'media',
  materials text,
  instructions text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_exercises TO authenticated;
GRANT ALL ON public.training_exercises TO service_role;
ALTER TABLE public.training_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercises read" ON public.training_exercises FOR SELECT TO authenticated
  USING (is_school_staff(school_id) OR is_superadmin());
CREATE POLICY "exercises write" ON public.training_exercises FOR ALL TO authenticated
  USING (is_school_staff(school_id) OR is_superadmin())
  WITH CHECK (is_school_staff(school_id) OR is_superadmin());
CREATE INDEX ON public.training_exercises (school_id);

CREATE OR REPLACE FUNCTION public.can_edit_session(_session_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.training_sessions s
    WHERE s.id = _session_id
      AND (can_manage_school(s.school_id) OR is_session_coach(s.coach_id))
  );
$$;
REVOKE ALL ON FUNCTION public.can_edit_session(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_edit_session(uuid) TO authenticated, service_role;

CREATE TABLE public.training_session_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  exercise_id uuid REFERENCES public.training_exercises(id) ON DELETE SET NULL,
  phase text NOT NULL DEFAULT 'principal',
  position integer NOT NULL DEFAULT 0,
  name text NOT NULL,
  duration_min integer NOT NULL DEFAULT 10,
  materials text,
  instructions text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_session_drills TO authenticated;
GRANT ALL ON public.training_session_drills TO service_role;
ALTER TABLE public.training_session_drills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drills read" ON public.training_session_drills FOR SELECT TO authenticated
  USING (is_school_staff(school_id) OR is_superadmin());
CREATE POLICY "drills write" ON public.training_session_drills FOR ALL TO authenticated
  USING (can_edit_session(session_id))
  WITH CHECK (can_edit_session(session_id));
CREATE INDEX ON public.training_session_drills (session_id);

CREATE TABLE public.training_session_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  session_id uuid NOT NULL UNIQUE REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  intensity integer,
  objective_rating integer,
  standout_players text,
  needs_work_players text,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_session_feedback TO authenticated;
GRANT ALL ON public.training_session_feedback TO service_role;
ALTER TABLE public.training_session_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback read" ON public.training_session_feedback FOR SELECT TO authenticated
  USING (is_school_staff(school_id) OR is_superadmin());
CREATE POLICY "feedback write" ON public.training_session_feedback FOR ALL TO authenticated
  USING (can_edit_session(session_id))
  WITH CHECK (can_edit_session(session_id));