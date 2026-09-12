import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, ShieldCheck, Users, UserRound, Trophy, Plus, Mail, Copy, Ban } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { ErrorState, LoadingRows } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchPlatformOverview, setSchoolActive, upsertSchool } from "@/lib/api/platform";
import {
  createInvitation,
  invitationLink,
  listInvitations,
  revokeInvitation,
} from "@/lib/api/invitations";
import type { School } from "@/lib/api/client";
import { useTenant } from "@/lib/tenant";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Panel global — FútbolGestión" },
      {
        name: "description",
        content:
          "Panel del superadministrador: escuelas activas, usuarios y actividad global de la plataforma.",
      },
      { property: "og:title", content: "Panel global — FútbolGestión" },
      {
        property: "og:description",
        content: "Indicadores globales y administración de escuelas de FútbolGestión.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPanel,
});

function AdminPanel() {
  const queryClient = useQueryClient();
  const { selectSchool } = useTenant();
  const [editing, setEditing] = useState<Partial<School> | null>(null);
  const [inviting, setInviting] = useState<School | null>(null);

  const invitations = useQuery({ queryKey: ["invitations", "all"], queryFn: () => listInvitations() });

  const invite = useMutation({
    mutationFn: (values: { schoolId: string; email: string; fullName: string }) =>
      createInvitation({
        schoolId: values.schoolId,
        role: "director",
        email: values.email,
        fullName: values.fullName || null,
      }),
    onSuccess: (row) => {
      setInviting(null);
      queryClient.invalidateQueries({ queryKey: ["invitations", "all"] });
      void navigator.clipboard?.writeText(invitationLink(row.code));
      toast.success(`Invitación creada y enlace copiado. Código: ${row.code}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: revokeInvitation,
    onSuccess: () => {
      toast.success("Invitación anulada");
      queryClient.invalidateQueries({ queryKey: ["invitations", "all"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const overview = useQuery({ queryKey: ["platform-overview"], queryFn: fetchPlatformOverview });

  const save = useMutation({
    mutationFn: (values: { id?: string; name: string; city?: string | null; is_active: boolean }) =>
      upsertSchool(values),
    onSuccess: () => {
      toast.success("Escuela guardada");
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["platform-overview"] });
      queryClient.invalidateQueries({ queryKey: ["tenancy"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setSchoolActive(id, active),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-overview"] });
      queryClient.invalidateQueries({ queryKey: ["tenancy"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (overview.isLoading) return <LoadingRows rows={6} />;
  if (overview.error) return <ErrorState message={(overview.error as Error).message} />;

  const data = overview.data!;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Panel global"
        description="Control de todas las escuelas, usuarios y actividad de la plataforma."
        actions={
          <Button onClick={() => setEditing({ is_active: true })}>
            <Plus className="size-4" /> Nueva escuela
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Escuelas"
          value={data.totals.schools}
          hint={`${data.totals.activeSchools} activas`}
          icon={Building2}
        />
        <StatCard label="Usuarios con rol" value={data.totals.users} icon={ShieldCheck} />
        <StatCard label="Jugadores" value={data.totals.players} icon={Users} />
        <StatCard
          label="Entrenadores"
          value={data.totals.coaches}
          hint={`${data.totals.teams} equipos`}
          icon={UserRound}
        />
      </div>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Escuelas de la plataforma</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Escuela</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead className="text-right">Jugadores</TableHead>
                <TableHead className="text-right">Equipos</TableHead>
                <TableHead className="text-right">Usuarios</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.summaries.map((row) => (
                <TableRow key={row.school.id}>
                  <TableCell className="font-medium">{row.school.name}</TableCell>
                  <TableCell className="text-muted-foreground">{row.school.city ?? "—"}</TableCell>
                  <TableCell className="text-right">{row.players}</TableCell>
                  <TableCell className="text-right">{row.teams}</TableCell>
                  <TableCell className="text-right">{row.users}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={row.school.is_active}
                        onCheckedChange={(active) =>
                          toggle.mutate({ id: row.school.id, active })
                        }
                      />
                      <Badge variant={row.school.is_active ? "default" : "outline"}>
                        {row.school.is_active ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(row.school)}>
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setInviting(row.school)}
                      >
                        <Mail className="size-4" /> Invitar admin
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectSchool(row.school.id)}
                      >
                        <Trophy className="size-4" /> Entrar
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Invitaciones de acceso</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {(invitations.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no has generado invitaciones. Crea una escuela y envía el código a su
              administrador.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Correo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(invitations.data ?? []).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.email}</TableCell>
                    <TableCell className="text-muted-foreground">{row.role}</TableCell>
                    <TableCell className="font-mono text-xs">{row.code}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === "pendiente" ? "default" : "outline"}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            void navigator.clipboard?.writeText(invitationLink(row.code));
                            toast.success("Enlace copiado");
                          }}
                        >
                          <Copy className="size-4" /> Copiar
                        </Button>
                        {row.status === "pendiente" ? (
                          <Button variant="outline" size="sm" onClick={() => revoke.mutate(row.id)}>
                            <Ban className="size-4" /> Anular
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!inviting} onOpenChange={(open) => !open && setInviting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar administrador de {inviting?.name}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const email = String(form.get("email") ?? "").trim();
              if (!email.includes("@")) {
                toast.error("Escribe un correo válido");
                return;
              }
              invite.mutate({
                schoolId: inviting!.id,
                email,
                fullName: String(form.get("fullName") ?? "").trim(),
              });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Correo del administrador</Label>
              <Input id="invite-email" name="email" type="email" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-name">Nombre (opcional)</Label>
              <Input id="invite-name" name="fullName" />
            </div>
            <p className="text-xs text-muted-foreground">
              Se genera un código de activación de un solo uso. La persona crea su propia
              contraseña; tú nunca la conoces.
            </p>
            <DialogFooter>
              <Button type="submit" disabled={invite.isPending}>
                {invite.isPending ? "Generando…" : "Generar invitación"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar escuela" : "Nueva escuela"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              const name = String(form.get("name") ?? "").trim();
              if (name.length < 3) {
                toast.error("El nombre debe tener al menos 3 caracteres");
                return;
              }
              save.mutate({
                ...(editing?.id ? { id: editing.id } : {}),
                name,
                city: String(form.get("city") ?? "").trim() || null,
                is_active: editing?.is_active ?? true,
              });
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="school-name">Nombre</Label>
              <Input id="school-name" name="name" defaultValue={editing?.name ?? ""} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="school-city">Ciudad</Label>
              <Input id="school-city" name="city" defaultValue={editing?.city ?? ""} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Guardando…" : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
