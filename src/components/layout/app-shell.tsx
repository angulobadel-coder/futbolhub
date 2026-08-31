import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  Dumbbell,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Settings,
  Shield,
  Star,
  Swords,
  Trophy,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/lib/tenant";
import { ROLE_LABELS } from "@/lib/api/tenancy";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, ready: true },
  { to: "/jugadores", label: "Jugadores", icon: Users, ready: true },
  { to: "/entrenadores", label: "Entrenadores", icon: UserRound, ready: true },
  { to: "/categorias", label: "Categorías", icon: Shield, ready: true },
  { to: "/equipos", label: "Equipos", icon: Trophy, ready: true },
  { to: "/entrenamientos", label: "Entrenamientos", icon: Dumbbell, ready: true },
  { to: "/entrenamientos", label: "Asistencia", icon: ClipboardCheck, ready: true },
  { to: "/calendario", label: "Calendario", icon: CalendarDays, ready: true },
  { to: "#", label: "Partidos", icon: Swords, ready: false },
  { to: "#", label: "Estadísticas", icon: BarChart3, ready: false },
  { to: "#", label: "Evaluaciones", icon: Star, ready: false },
  { to: "#", label: "Pagos", icon: CreditCard, ready: false },
  { to: "#", label: "Comunicaciones", icon: Megaphone, ready: false },
  { to: "#", label: "Notificaciones", icon: Bell, ready: false },
  { to: "#", label: "Reportes", icon: FileBarChart, ready: false },
  { to: "#", label: "Configuración", icon: Settings, ready: false },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { school, role, memberships, selectSchool, user } = useTenant();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Link to="/dashboard" className="font-display text-lg font-semibold tracking-tight">
            Fútbol<span className="text-primary">Gestión</span>
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(false)}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="px-4 pb-4">
          <Select value={school?.id ?? ""} onValueChange={selectSchool}>
            <SelectTrigger className="w-full bg-sidebar-accent text-left">
              <SelectValue placeholder="Selecciona escuela" />
            </SelectTrigger>
            <SelectContent>
              {memberships.map((m) => (
                <SelectItem key={m.school.id} value={m.school.id}>
                  {m.school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {role ? (
            <p className="mt-2 text-xs text-muted-foreground">{ROLE_LABELS[role]}</p>
          ) : null}
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-6">
          {NAV.map((item) =>
            item.ready ? (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent",
                  pathname === item.to && "bg-sidebar-accent font-medium text-sidebar-primary",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ) : (
              <div
                key={item.label}
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/60"
                title="Módulo en preparación"
              >
                <item.icon className="size-4" />
                <span className="flex-1">{item.label}</span>
                <Badge variant="outline" className="border-border/60 text-[10px] font-normal">
                  pronto
                </Badge>
              </div>
            ),
          )}
        </nav>

        <div className="border-t border-sidebar-border px-4 py-4">
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={signOut}>
            <LogOut className="size-4" /> Cerrar sesión
          </Button>
        </div>
      </aside>

      {open ? (
        <div
          className="fixed inset-0 z-30 bg-background/70 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="lg:pl-64">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3 lg:hidden">
          <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
            <Menu className="size-4" />
          </Button>
          <span className="font-display font-semibold">
            Fútbol<span className="text-primary">Gestión</span>
          </span>
        </div>
        <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
