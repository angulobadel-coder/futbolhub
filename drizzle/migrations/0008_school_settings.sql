CREATE TABLE public.school_settings (
  school_id uuid PRIMARY KEY REFERENCES public.schools(id) ON DELETE CASCADE,
  contact_phone text,
  contact_email text,
  address text,
  primary_color text,
  season_label text,
  attendance_threshold integer NOT NULL DEFAULT 70 CHECK (attendance_threshold BETWEEN 1 AND 100),
  monthly_fee integer CHECK (monthly_fee IS NULL OR monthly_fee > 0),
  payment_due_day integer NOT NULL DEFAULT 10 CHECK (payment_due_day BETWEEN 1 AND 28),
  late_fee integer CHECK (late_fee IS NULL OR late_fee >= 0),
  whatsapp_enabled boolean NOT NULL DEFAULT false,
  notify_payments boolean NOT NULL DEFAULT true,
  notify_attendance boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.school_settings TO authenticated;
GRANT ALL ON public.school_settings TO service_role;
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read school settings" ON public.school_settings FOR SELECT TO authenticated
  USING (public.is_school_member(school_id) OR public.is_superadmin());
CREATE POLICY "managers insert school settings" ON public.school_settings FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_school(school_id));
CREATE POLICY "managers update school settings" ON public.school_settings FOR UPDATE TO authenticated
  USING (public.can_manage_school(school_id)) WITH CHECK (public.can_manage_school(school_id));

CREATE OR REPLACE FUNCTION public.update_school_identity(_school_id uuid, _name text, _city text, _logo_url text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_manage_school(_school_id) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF _name IS NULL OR length(trim(_name)) < 2 THEN
    RAISE EXCEPTION 'El nombre es obligatorio';
  END IF;
  UPDATE public.schools
     SET name = left(trim(_name), 120),
         city = nullif(left(trim(coalesce(_city,'')), 80), ''),
         logo_url = nullif(left(trim(coalesce(_logo_url,'')), 500), '')
   WHERE id = _school_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.update_school_identity(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_school_identity(uuid, text, text, text) TO authenticated;