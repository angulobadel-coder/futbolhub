import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
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
  beforeLoad: async () => {
    // Si ya hay sesión, entrar directo al panel.
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      // redirect se lanza, no se retorna
      const { redirect } = await import("@tanstack/react-router");
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AuthPage,
});

const credentials = z.object({
  email: z.string().trim().email({ message: "Correo inválido" }).max(255),
  password: z.string().min(6, { message: "Mínimo 6 caracteres" }).max(72),
  fullName: z.string().trim().max(120).optional(),
});

function AuthPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

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

    setPending(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            data: { full_name: parsed.data.fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Se te asignó la escuela demo como director.");
        navigate({ to: "/dashboard" });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible autenticar");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <Link to="/" className="block text-center font-display text-2xl font-semibold">
          Fútbol<span className="text-primary">Gestión</span>
        </Link>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Bienvenido</CardTitle>
            <CardDescription>
              Accede a tu escuela o crea una cuenta para explorar la escuela demo.
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
                    <Input id="login-password" name="password" type="password" required autoComplete="current-password" />
                  </div>
                  <Button type="submit" className="w-full" disabled={pending}>
                    {pending ? "Ingresando…" : "Iniciar sesión"}
                  </Button>
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
                    <Input id="signup-password" name="password" type="password" required autoComplete="new-password" />
                  </div>
                  <Button type="submit" className="w-full" disabled={pending}>
                    {pending ? "Creando…" : "Crear cuenta"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Las cuentas nuevas quedan asignadas como director de la escuela demo
                    "Academia Fútbol Futuro".
                  </p>
                </form>
              </TabsContent>
            </Tabs>
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
