import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { fetchMemberships, type Membership } from "@/lib/api/tenancy";
import type { AppRole, School } from "@/lib/api/client";

const STORAGE_KEY = "fg.selected-school";

interface TenantValue {
  user: User | null;
  memberships: Membership[];
  school: School | null;
  role: AppRole | undefined;
  selectSchool: (id: string) => void;
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

  const membershipsQuery = useQuery({
    queryKey: ["memberships"],
    queryFn: fetchMemberships,
  });

  const memberships = membershipsQuery.data ?? [];
  const active = useMemo(() => {
    if (memberships.length === 0) return null;
    return memberships.find((m) => m.school.id === selectedId) ?? memberships[0];
  }, [memberships, selectedId]);

  const value: TenantValue = {
    user,
    memberships,
    school: active?.school ?? null,
    role: active?.role,
    selectSchool: (id) => {
      setSelectedId(id);
      window.localStorage.setItem(STORAGE_KEY, id);
    },
    isLoading: membershipsQuery.isLoading,
    error: (membershipsQuery.error as Error) ?? null,
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
