import type { AppRole } from "@/lib/api/client";

/** Ruta principal a la que se redirige cada rol después de iniciar sesión. */
export const ROLE_HOME: Record<AppRole, string> = {
  superadmin: "/admin",
  director: "/dashboard",
  coach: "/entrenador",
  guardian: "/acudiente",
  player: "/jugador",
};

/** Prefijos de ruta permitidos por rol (autorización de navegación). */
const ROLE_ROUTES: Record<AppRole, string[]> = {
  superadmin: ["/"],
  director: [
    "/dashboard",
    "/jugadores",
    "/entrenadores",
    "/categorias",
    "/equipos",
    "/invitaciones",
    "/entrenamientos",
    "/calendario",
    "/competiciones",
  ],
  coach: ["/entrenador", "/jugadores", "/equipos", "/entrenamientos", "/calendario", "/competiciones"],
  guardian: ["/acudiente"],
  player: ["/jugador"],
};

export function canAccessPath(role: AppRole | undefined, pathname: string) {
  if (!role) return false;
  if (role === "superadmin") return true;
  return ROLE_ROUTES[role].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const ROLE_TAGLINE: Record<AppRole, string> = {
  superadmin: "Visión global de la plataforma",
  director: "Gestión completa de tu escuela",
  coach: "Operación deportiva de tus equipos",
  guardian: "Seguimiento de tus hijos",
  player: "Tu evolución deportiva",
};
