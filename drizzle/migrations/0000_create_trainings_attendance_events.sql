CREATE TYPE public.training_status AS ENUM ('programado','realizado','cancelado');
CREATE TYPE public.attendance_status AS ENUM ('presente','ausente','justificado');
CREATE TYPE public.event_type AS ENUM ('entrenamiento','partido','torneo','reunion','otro');

CREATE TABLE public.training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  coach_id uuid REFERENCES public.coaches(id) ON DELETE SET NULL,
  session_date date NOT NULL,
  start_time time NOT NULL,
  end_time time,
  location text,
  objective text,
  description text,
  status public.training_status NOT NULL DEFAULT 'programado',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_sessions TO authenticated;
GRANT ALL ON public.training_sessions TO service_role;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_session_coach(_coach_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.coaches c WHERE c.id = _coach_id AND c.user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.is_session_coach(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_session_coach(uuid) TO authenticated, service_role;

CREATE POLICY "training read" ON public.training_sessions FOR SELECT TO authenticated
  USING (is_school_member(school_id));
CREATE POLICY "training write" ON public.training_sessions FOR ALL TO authenticated
  USING (can_manage_school(school_id) OR is_session_coach(coach_id))
  WITH CHECK (can_manage_school(school_id) OR is_session_coach(coach_id));

CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  status public.attendance_status NOT NULL DEFAULT 'presente',
  note text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, player_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance read" ON public.attendance FOR SELECT TO authenticated
  USING (is_school_member(school_id));
CREATE POLICY "attendance write" ON public.attendance FOR ALL TO authenticated
  USING (can_manage_school(school_id) OR EXISTS (SELECT 1 FROM public.training_sessions s WHERE s.id = session_id AND is_session_coach(s.coach_id)))
  WITH CHECK (can_manage_school(school_id) OR EXISTS (SELECT 1 FROM public.training_sessions s WHERE s.id = session_id AND is_session_coach(s.coach_id)));

CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  type public.event_type NOT NULL DEFAULT 'otro',
  title text NOT NULL,
  event_date date NOT NULL,
  start_time time,
  end_time time,
  location text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events read" ON public.events FOR SELECT TO authenticated
  USING (is_school_member(school_id));
CREATE POLICY "events write" ON public.events FOR ALL TO authenticated
  USING (can_manage_school(school_id)) WITH CHECK (can_manage_school(school_id));

CREATE INDEX idx_training_school_date ON public.training_sessions(school_id, session_date);
CREATE INDEX idx_attendance_player ON public.attendance(player_id);
CREATE INDEX idx_events_school_date ON public.events(school_id, event_date);