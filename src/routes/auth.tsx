import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { fetchPrimaryRole } from "@/lib/api/tenancy";
import { ROLE_HOME } from "@/lib/roles";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acceder — FútbolGestión" },
      { name: "description", content: "Inicia sesión o crea tu cuenta en FútbolGestión." },
      { property: "og:title", content: "Acceder — FútbolGestión" },
      { property: "og:description", content: "Inicia sesión o crea tu cuenta en FútbolGestión." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      const role = await fetchPrimaryRole();
      const { redirect } = await import("@tanstack/react-router");
      throw redirect({ to: role ? ROLE_HOME[role] : "/dashboard" });
    }
  },
  component: AuthPage,
});

const credentials = z.object({
  email: z.string().trim().email({ message: "Correo inválido" }).max(255),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres" }).max(72),
  fullName: z.string().trim().max(120).optional(),
});

const DEMO_PASSWORD = "FutbolDemo2026!";
const DEMO_ACCOUNTS = [
  { email: "director@futbolgestion.demo", label: "Administrador de escuela" },
  { email: "entrenador@futbolgestion.demo", label: "Entrenador" },
  { email: "acudiente@futbolgestion.demo", label: "Padre o acudiente" },
  { email: "jugador@futbolgestion.demo", label: "Jugador" },
];

/** Traduce los errores de autenticación a mensajes claros en español. */
function friendlyError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Debes confirmar tu correo antes de ingresar.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Ya existe una cuenta con ese correo. Inicia sesión.";
  if (m.includes("rate limit")) return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
  return message;
}

function AuthPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  async function goToRoleHome() {
    const role = await fetchPrimaryRole();
    navigate({ to: role ? ROLE_HOME[role] : "/dashboard" });
  }

  async function signIn(email: string, password: string) {
    setPending(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await goToRoleHome();
    } catch (error) {
      toast.error(
        friendlyError(error instanceof Error ? error.message : "No fue posible autenticar"),
      );
    } finally {
      setPending(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>, mode: "login" | "signup") {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = credentials.safeParse({
      email: form.get("email"),
      password: form.get("password"),
      fullName: form.get("fullName") || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Revisa los datos");
      return;
    }

    if (mode === "login") {
      await signIn(parsed.data.email, parsed.data.password);
      return;
    }

    setPending(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: { full_name: parsed.data.fullName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      toast.success("Cuenta creada. Se te asignó la escuela demo como administrador.");
      await goToRoleHome();
    } catch (error) {
      toast.error(
        friendlyError(error instanceof Error ? error.message : "No fue posible crear la cuenta"),
      );
    } finally {
      setPending(false);
    }
  }

  async function recover(email: string) {
    if (!email) {
      toast.error("Escribe tu correo para enviarte el enlace de recuperación.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(friendlyError(error.message));
    else toast.success("Te enviamos un enlace para restablecer tu contraseña.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <Link to="/" className="block text-center font-display text-2xl font-semibold">
          Fútbol<span className="text-primary">Gestión</span>
        </Link>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Bienvenido</CardTitle>
            <CardDescription>
              Un solo acceso para todos los roles: al ingresar te llevamos a tu panel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
                <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form className="mt-4 space-y-4" onSubmit={(e) => handleSubmit(e, "login")}>
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email">Correo electrónico</Label>
                    <Input id="login-email" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="login-password">Contraseña</Label>
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={pending}>
                    {pending ? "Ingresando…" : "Iniciar sesión"}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    onClick={() => {
                      const input = document.getElementById("login-email") as HTMLInputElement | null;
                      void recover(input?.value.trim() ?? "");
                    }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form className="mt-4 space-y-4" onSubmit={(e) => handleSubmit(e, "signup")}>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name">Nombre completo</Label>
                    <Input id="signup-name" name="fullName" type="text" required autoComplete="name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email">Correo electrónico</Label>
                    <Input id="signup-email" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password">Contraseña</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      required
                      autoComplete="new-password"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={pending}>
                    {pending ? "Creando…" : "Crear cuenta"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Las cuentas nuevas quedan asignadas como administrador de la escuela demo
                    "Academia Fútbol Futuro".
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Explorar con cuentas demo</CardTitle>
            <CardDescription className="text-xs">
              Cada cuenta muestra la plataforma tal como la ve ese rol.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map((account) => (
              <Button
                key={account.email}
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => signIn(account.email, DEMO_PASSWORD)}
              >
                {account.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/" className="underline underline-offset-2 hover:text-foreground">
            Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
