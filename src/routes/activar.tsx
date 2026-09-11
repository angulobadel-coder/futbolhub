import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { activateInvitation, lookupInvitation } from "@/lib/api/invitations.functions";
import { fetchPrimaryRole } from "@/lib/api/tenancy";
import { ROLE_HOME } from "@/lib/roles";

const searchSchema = z.object({ code: z.string().optional() });

export const Route = createFileRoute("/activar")({
  head: () => ({
    meta: [
      { title: "Activar acceso — FútbolGestión" },
      {
        name: "description",
        content:
          "Canjea tu código de invitación y crea tu contraseña para entrar a FútbolGestión.",
      },
      { property: "og:title", content: "Activar acceso — FútbolGestión" },
      {
        property: "og:description",
        content: "Canjea tu código de invitación y crea tu contraseña.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  ssr: false,
  validateSearch: searchSchema,
  component: ActivatePage,
});

interface InviteInfo {
  email: string;
  roleLabel: string;
  school: string;
}

function ActivatePage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const lookup = useServerFn(lookupInvitation);
  const activate = useServerFn(activateInvitation);

  const [code, setCode] = useState(search.code ?? "");
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [pending, setPending] = useState(false);

  async function checkCode(value: string) {
    const clean = value.trim().toUpperCase();
    if (clean.length < 8) {
      toast.error("Escribe el código completo que te compartieron.");
      return;
    }
    setPending(true);
    try {
      const result = await lookup({ data: { code: clean } });
      if (!result.valid) {
        setInfo(null);
        toast.error(result.reason);
        return;
      }
      setCode(clean);
      setInfo({ email: result.email, roleLabel: result.roleLabel, school: result.school });
    } catch {
      toast.error("No pudimos verificar el código. Revísalo e intenta de nuevo.");
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    if (search.code) void checkCode(search.code);
    // solo al abrir con un código en el enlace
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleActivate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const fullName = String(form.get("fullName") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    if (fullName.length < 3) {
      toast.error("Escribe tu nombre completo.");
      return;
    }
    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }

    setPending(true);
    try {
      const result = await activate({ data: { code, password, fullName } });
      if (!result.created) {
        toast.success("Ya tenías una cuenta: te dimos el nuevo acceso. Inicia sesión.");
        navigate({ to: "/auth" });
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: result.email,
        password,
      });
      if (error) {
        toast.success("Acceso creado. Inicia sesión con tu nueva contraseña.");
        navigate({ to: "/auth" });
        return;
      }
      const role = await fetchPrimaryRole();
      toast.success("¡Bienvenido a FútbolGestión!");
      navigate({ to: role ? ROLE_HOME[role] : "/auth" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No fue posible activar tu acceso.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <Link to="/" className="block text-center font-display text-2xl font-semibold">
          Fútbol<span className="text-primary">Gestión</span>
        </Link>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle>Activar tu acceso</CardTitle>
            <CardDescription>
              FútbolGestión es una plataforma privada. Usa el código que te envió tu escuela para
              crear tu contraseña.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Código de invitación</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  autoComplete="off"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => void checkCode(code)}
                >
                  Verificar
                </Button>
              </div>
            </div>

            {info ? (
              <form className="space-y-4" onSubmit={handleActivate}>
                <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-sm">
                  <p>
                    Invitación para <strong>{info.email}</strong>
                  </p>
                  <p className="text-muted-foreground">
                    {info.roleLabel} · {info.school}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Nombre completo</Label>
                  <Input id="fullName" name="fullName" required autoComplete="name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Crea tu contraseña</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Repite la contraseña</Label>
                  <Input
                    id="confirm"
                    name="confirm"
                    type="password"
                    required
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? "Activando…" : "Activar acceso"}
                </Button>
              </form>
            ) : null}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          ¿Ya tienes acceso?{" "}
          <Link to="/auth" className="underline underline-offset-2 hover:text-foreground">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
