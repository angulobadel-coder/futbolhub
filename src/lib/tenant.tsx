import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { fetchTenancy, type Membership } from "@/lib/api/tenancy";
import type { AppRole, School } from "@/lib/api/client";

const STORAGE_KEY = "fg.selected-school";

interface TenantValue {
  user: User | null;
  isSuperadmin: boolean;
  memberships: Membership[];
  school: School | null;
  /** Rol efectivo en la escuela activa (o superadmin en modo global). */
  role: AppRole | undefined;
  selectSchool: (id: string) => void;
  /** Vuelve al panel global (solo superadministrador). */
  clearSchool: () => void;
  isLoading: boolean;
  error: Error | null;
}

const TenantContext = createContext<TenantValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEY),
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, []);

  const tenancyQuery = useQuery({
    queryKey: ["tenancy"],
    queryFn: fetchTenancy,
  });

  const isSuperadmin = tenancyQuery.data?.isSuperadmin ?? false;
  const memberships = useMemo(
    () => tenancyQuery.data?.memberships ?? [],
    [tenancyQuery.data],
  );

  const active = useMemo(() => {
    if (memberships.length === 0) return null;
    const found = memberships.find((m) => m.school.id === selectedId);
    if (found) return found;
    // El superadministrador arranca en el panel global, sin escuela activa.
    return isSuperadmin ? null : (memberships[0] ?? null);
  }, [memberships, selectedId, isSuperadmin]);

  const value: TenantValue = {
    user,
    isSuperadmin,
    memberships,
    school: active?.school ?? null,
    role: isSuperadmin ? "superadmin" : active?.role,
    selectSchool: (id) => {
      setSelectedId(id);
      window.localStorage.setItem(STORAGE_KEY, id);
    },
    clearSchool: () => {
      setSelectedId(null);
      window.localStorage.removeItem(STORAGE_KEY);
    },
    isLoading: tenancyQuery.isLoading,
    error: (tenancyQuery.error as Error) ?? null,
  };

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant debe usarse dentro de TenantProvider");
  return ctx;
}

/** Id de escuela activa garantizado (las rutas protegidas siempre tienen una). */
export function useSchoolId() {
  return useTenant().school?.id ?? null;
}
