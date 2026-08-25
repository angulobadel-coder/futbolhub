import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { TenantProvider, useTenant } from "@/lib/tenant";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorState, LoadingRows } from "@/components/common/states";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: ProtectedLayout,
});

function ProtectedLayout() {
  return (
    <TenantProvider>
      <TenantGate />
    </TenantProvider>
  );
}

function TenantGate() {
  const { isLoading, error, school } = useTenant();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-8">
        <LoadingRows rows={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <ErrorState message={error.message} />
      </div>
    );
  }

  if (!school) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <h1 className="font-display text-xl font-semibold">Sin escuela asignada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tu cuenta aún no pertenece a ninguna escuela. Solicita al administrador de la plataforma
          que te asigne a una.
        </p>
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
