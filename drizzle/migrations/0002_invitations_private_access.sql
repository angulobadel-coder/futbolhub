CREATE TYPE public.invitation_status AS ENUM ('pendiente','aceptada','revocada');

CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  email text NOT NULL,
  full_name text,
  code text NOT NULL UNIQUE,
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  status public.invitation_status NOT NULL DEFAULT 'pendiente',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  accepted_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX invitations_school_idx ON public.invitations(school_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;
GRANT ALL ON public.invitations TO service_role;

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin manages invitations" ON public.invitations
  FOR ALL TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

CREATE POLICY "staff read school invitations" ON public.invitations
  FOR SELECT TO authenticated
  USING (public.can_manage_school(school_id));

CREATE POLICY "staff create school invitations" ON public.invitations
  FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_school(school_id) AND role IN ('coach','guardian','player'));

CREATE POLICY "staff update school invitations" ON public.invitations
  FOR UPDATE TO authenticated
  USING (public.can_manage_school(school_id) AND role IN ('coach','guardian','player'))
  WITH CHECK (public.can_manage_school(school_id) AND role IN ('coach','guardian','player'));

CREATE POLICY "staff delete school invitations" ON public.invitations
  FOR DELETE TO authenticated
  USING (public.can_manage_school(school_id) AND role IN ('coach','guardian','player'));

-- Los registros nuevos ya no reciben un rol automatico: el acceso llega por invitacion.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;