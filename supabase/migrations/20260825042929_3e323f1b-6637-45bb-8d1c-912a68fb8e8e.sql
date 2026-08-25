
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('superadmin','director','coach','guardian','player');
CREATE TYPE public.player_status AS ENUM ('activo','inactivo','suspendido','retirado');
CREATE TYPE public.coach_status AS ENUM ('activo','inactivo');

-- SCHOOLS
CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  city text,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schools TO authenticated;
GRANT ALL ON public.schools TO service_role;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES (per school)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, school_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER HELPERS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_school_member(_school_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND (school_id = _school_id OR role = 'superadmin')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_school(_school_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND ((school_id = _school_id AND role IN ('director','coach')) OR role = 'superadmin')
  );
$$;

-- POLICIES: schools / profiles / roles
CREATE POLICY "members read their schools" ON public.schools FOR SELECT TO authenticated
  USING (public.is_school_member(id));
CREATE POLICY "superadmin manages schools" ON public.schools FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'superadmin')) WITH CHECK (public.has_role(auth.uid(),'superadmin'));

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile write" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- CATEGORIES
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  min_age int,
  max_age int,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- COACHES
CREATE TABLE public.coaches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  specialty text,
  status public.coach_status NOT NULL DEFAULT 'activo',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coaches TO authenticated;
GRANT ALL ON public.coaches TO service_role;
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

-- TEAMS
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  coach_id uuid REFERENCES public.coaches(id) ON DELETE SET NULL,
  name text NOT NULL,
  season text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- PLAYERS
CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  birth_date date,
  document_id text,
  photo_url text,
  position text,
  status public.player_status NOT NULL DEFAULT 'activo',
  joined_at date NOT NULL DEFAULT current_date,
  guardian_name text,
  guardian_phone text,
  guardian_email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO authenticated;
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- TENANT POLICIES
CREATE POLICY "cat read" ON public.categories FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "cat write" ON public.categories FOR ALL TO authenticated USING (public.can_manage_school(school_id)) WITH CHECK (public.can_manage_school(school_id));

CREATE POLICY "coach read" ON public.coaches FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "coach write" ON public.coaches FOR ALL TO authenticated USING (public.can_manage_school(school_id)) WITH CHECK (public.can_manage_school(school_id));

CREATE POLICY "team read" ON public.teams FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "team write" ON public.teams FOR ALL TO authenticated USING (public.can_manage_school(school_id)) WITH CHECK (public.can_manage_school(school_id));

CREATE POLICY "player read" ON public.players FOR SELECT TO authenticated USING (public.is_school_member(school_id));
CREATE POLICY "player write" ON public.players FOR ALL TO authenticated USING (public.can_manage_school(school_id)) WITH CHECK (public.can_manage_school(school_id));

-- NEW USER HANDLER: profile + director role on demo school
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE demo_id uuid;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO demo_id FROM public.schools WHERE slug = 'academia-futbol-futuro';
  IF demo_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, school_id, role)
    VALUES (NEW.id, demo_id, 'director')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- DEMO DATA
INSERT INTO public.schools (id, name, slug, city)
VALUES ('11111111-1111-1111-1111-111111111111','Academia Fútbol Futuro','academia-futbol-futuro','Bogotá');

INSERT INTO public.categories (id, school_id, name, min_age, max_age) VALUES
('22222222-0000-0000-0000-000000000008','11111111-1111-1111-1111-111111111111','Sub-8',6,8),
('22222222-0000-0000-0000-000000000010','11111111-1111-1111-1111-111111111111','Sub-10',9,10),
('22222222-0000-0000-0000-000000000012','11111111-1111-1111-1111-111111111111','Sub-12',11,12),
('22222222-0000-0000-0000-000000000014','11111111-1111-1111-1111-111111111111','Sub-14',13,14),
('22222222-0000-0000-0000-000000000016','11111111-1111-1111-1111-111111111111','Sub-16',15,16),
('22222222-0000-0000-0000-000000000018','11111111-1111-1111-1111-111111111111','Sub-18',17,18);

INSERT INTO public.coaches (id, school_id, full_name, email, phone, specialty) VALUES
('33333333-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Carlos Demo Rueda','carlos.demo@futbolgestion.test','+57 300 000 0001','Formación técnica'),
('33333333-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Marta Demo Ospina','marta.demo@futbolgestion.test','+57 300 000 0002','Preparación física'),
('33333333-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Julián Demo Cárdenas','julian.demo@futbolgestion.test','+57 300 000 0003','Porteros');

INSERT INTO public.teams (id, school_id, category_id, coach_id, name, season) VALUES
('44444444-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000010','33333333-0000-0000-0000-000000000001','Futuro Sub-10 A','2026'),
('44444444-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000012','33333333-0000-0000-0000-000000000002','Futuro Sub-12 A','2026'),
('44444444-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000014','33333333-0000-0000-0000-000000000003','Futuro Sub-14 A','2026');

INSERT INTO public.players (school_id, category_id, team_id, full_name, birth_date, document_id, position, status, guardian_name, guardian_phone) VALUES
('11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000010','44444444-0000-0000-0000-000000000001','Andrés Demo Pérez','2016-03-12','DEMO-0001','Delantero','activo','Laura Demo Pérez','+57 310 000 0001'),
('11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000010','44444444-0000-0000-0000-000000000001','Samuel Demo Ríos','2016-07-02','DEMO-0002','Mediocampista','activo','Jorge Demo Ríos','+57 310 000 0002'),
('11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000010','44444444-0000-0000-0000-000000000001','Tomás Demo Lara','2015-11-20','DEMO-0003','Defensa','activo','Ana Demo Lara','+57 310 000 0003'),
('11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000012','44444444-0000-0000-0000-000000000002','Mateo Demo Gómez','2014-05-08','DEMO-0004','Portero','activo','Diana Demo Gómez','+57 310 000 0004'),
('11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000012','44444444-0000-0000-0000-000000000002','Luciana Demo Cruz','2014-09-15','DEMO-0005','Mediocampista','activo','Pedro Demo Cruz','+57 310 000 0005'),
('11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000012','44444444-0000-0000-0000-000000000002','Emilio Demo Vargas','2013-12-01','DEMO-0006','Delantero','inactivo','Sara Demo Vargas','+57 310 000 0006'),
('11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000014','44444444-0000-0000-0000-000000000003','Daniel Demo Nieto','2012-02-18','DEMO-0007','Defensa','activo','Iván Demo Nieto','+57 310 000 0007'),
('11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000014','44444444-0000-0000-0000-000000000003','Valeria Demo Salas','2012-06-27','DEMO-0008','Mediocampista','activo','Marcela Demo Salas','+57 310 000 0008'),
('11111111-1111-1111-1111-111111111111','22222222-0000-0000-0000-000000000014','44444444-0000-0000-0000-000000000003','Nicolás Demo Peña','2011-10-05','DEMO-0009','Delantero','suspendido','Hugo Demo Peña','+57 310 000 0009');
