CREATE TABLE public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  qualifiers_per_group integer NOT NULL DEFAULT 2,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitions TO authenticated;
GRANT ALL ON public.competitions TO service_role;
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comp read" ON public.competitions FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "comp write" ON public.competitions FOR ALL TO authenticated USING (public.can_manage_school(school_id)) WITH CHECK (public.can_manage_school(school_id));

CREATE TABLE public.competition_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  group_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competition_teams TO authenticated;
GRANT ALL ON public.competition_teams TO service_role;
ALTER TABLE public.competition_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ct read" ON public.competition_teams FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "ct write" ON public.competition_teams FOR ALL TO authenticated USING (public.can_manage_school(school_id)) WITH CHECK (public.can_manage_school(school_id));

CREATE TABLE public.competition_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  stage text NOT NULL,
  group_name text,
  slot integer NOT NULL DEFAULT 0,
  home_team_id uuid REFERENCES public.competition_teams(id) ON DELETE CASCADE,
  away_team_id uuid REFERENCES public.competition_teams(id) ON DELETE CASCADE,
  home_goals integer,
  away_goals integer,
  home_penalties integer,
  away_penalties integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competition_matches TO authenticated;
GRANT ALL ON public.competition_matches TO service_role;
ALTER TABLE public.competition_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cm read" ON public.competition_matches FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "cm write" ON public.competition_matches FOR ALL TO authenticated USING (public.can_manage_school(school_id)) WITH CHECK (public.can_manage_school(school_id));
CREATE INDEX ON public.competition_teams(competition_id);
CREATE INDEX ON public.competition_matches(competition_id);