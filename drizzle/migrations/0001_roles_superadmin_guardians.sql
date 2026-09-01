-- 1. Vínculo acudiente <-> jugador
CREATE TABLE IF NOT EXISTS public.player_guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_guardians TO authenticated;
GRANT ALL ON public.player_guardians TO service_role;
ALTER TABLE public.player_guardians ENABLE ROW LEVEL SECURITY;

-- 2. Helpers
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'superadmin');
$$;

CREATE OR REPLACE FUNCTION public.is_school_staff(_school_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND ((school_id = _school_id AND role IN ('director','coach')) OR role = 'superadmin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_player_guardian(_player_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.player_guardians pg
    WHERE pg.player_id = _player_id AND pg.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_player(_player_id uuid, _school_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_school_staff(_school_id)
      OR public.is_player_guardian(_player_id)
      OR EXISTS (SELECT 1 FROM public.players p WHERE p.id = _player_id AND p.user_id = auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION public.is_superadmin() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.is_school_staff(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.is_player_guardian(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_player(uuid, uuid) FROM public, anon;

-- 3. Políticas de player_guardians
DROP POLICY IF EXISTS "guardian link read" ON public.player_guardians;
CREATE POLICY "guardian link read" ON public.player_guardians FOR SELECT TO authenticated
  USING (is_school_staff(school_id) OR user_id = auth.uid());
DROP POLICY IF EXISTS "guardian link write" ON public.player_guardians;
CREATE POLICY "guardian link write" ON public.player_guardians FOR ALL TO authenticated
  USING (can_manage_school(school_id)) WITH CHECK (can_manage_school(school_id));

-- 4. Lectura de jugadores restringida por audiencia
DROP POLICY IF EXISTS "player read" ON public.players;
CREATE POLICY "player read" ON public.players FOR SELECT TO authenticated
  USING (
    is_school_staff(school_id)
    OR user_id = auth.uid()
    OR is_player_guardian(id)
  );

-- 5. Asistencia: staff, el propio jugador y su acudiente
DROP POLICY IF EXISTS "attendance read" ON public.attendance;
CREATE POLICY "attendance read" ON public.attendance FOR SELECT TO authenticated
  USING (can_view_player(player_id, school_id));

-- 6. Perfiles visibles para superadmin y directores de la escuela del usuario
DROP POLICY IF EXISTS "staff read member profiles" ON public.profiles;
CREATE POLICY "staff read member profiles" ON public.profiles FOR SELECT TO authenticated
  USING (
    is_superadmin()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = profiles.id AND ur.school_id IS NOT NULL AND can_manage_school(ur.school_id)
    )
  );

-- 7. Gestión de roles
DROP POLICY IF EXISTS "staff read school roles" ON public.user_roles;
CREATE POLICY "staff read school roles" ON public.user_roles FOR SELECT TO authenticated
  USING (is_superadmin() OR (school_id IS NOT NULL AND can_manage_school(school_id)));

DROP POLICY IF EXISTS "superadmin manages roles" ON public.user_roles;
CREATE POLICY "superadmin manages roles" ON public.user_roles FOR ALL TO authenticated
  USING (is_superadmin()) WITH CHECK (is_superadmin());

DROP POLICY IF EXISTS "director manages school roles" ON public.user_roles;
CREATE POLICY "director manages school roles" ON public.user_roles FOR ALL TO authenticated
  USING (school_id IS NOT NULL AND role <> 'superadmin' AND can_manage_school(school_id))
  WITH CHECK (school_id IS NOT NULL AND role <> 'superadmin' AND can_manage_school(school_id));

-- 8. El registro público nunca crea superadministradores; permite omitir el rol demo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE demo_id uuid;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  IF COALESCE(NEW.raw_user_meta_data->>'skip_default_role', 'false') = 'true' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO demo_id FROM public.schools WHERE slug = 'academia-futbol-futuro';
  IF demo_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, school_id, role)
    VALUES (NEW.id, demo_id, 'director')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
