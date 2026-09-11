import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Plus, Ban } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createInvitation, invitationLink, listInvitations, revokeInvitation } from "@/lib/api/invitations";
import { listPlayers } from "@/lib/api/school-data";
import { ROLE_LABELS } from "@/lib/api/tenancy";
import type { AppRole } from "@/lib/api/client";
import { useTenant } from "@/lib/tenant";

export const Route = createFileRoute("/_authenticated/invitaciones")({
  head: () => ({
    meta: [
      { title: "Invitaciones — FútbolGestión" },
      {
        name: "description",
        content:
          "Crea códigos de activación para entrenadores, acudientes y jugadores de tu escuela.",
      },
      { property: "og:title", content: "Invitaciones — FútbolGestión" },
      {
        property: "og:description",
        content: "Gestiona los accesos de tu escuela con códigos de activación.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InvitationsPage,
});

const INVITABLE: AppRole[] = ["coach", "guardian", "player"];

function InvitationsPage() {
  const { school } = useTenant();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<AppRole>("coach");
  const [playerId, setPlayerId] = useState<string>("");

  const schoolId = school?.id ?? "";

  const invites = useQuery({
    queryKey: ["invitations", schoolId],
    queryFn: () => listInvitations(schoolId),
    enabled: !!schoolId,
  });

  const players = useQuery({
    queryKey: ["players", schoolId],
    queryFn: () => listPlayers(schoolId),
    enabled: !!schoolId,
  });

  const create = useMutation({
    mutationFn: (values: { email: string; fullName: string }) =>
      createInvitation({
        schoolId,
        role,
        email: values.email,
        fullName: values.fullName || null,
        playerId: role === "coach" ? null : playerId || null,
      }),
    onSuccess: (invite) => {
      setOpen(false);
      setPlayerId("");
      queryClient.invalidateQueries({ queryKey: ["invitations", schoolId] });
      void navigator.clipboard?.writeText(invitationLink(invite.code));
      toast.success(`Invitación creada. Copiamos el enlace: ${invite.code}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: revokeInvitation,
    onSuccess: () => {
      toast.success("Invitación anulada");
      queryClient.invalidateQueries({ queryKey: ["invitations", schoolId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!schoolId) return <EmptyState title="Selecciona una escuela para gestionar invitaciones." />;
  if (invites.isLoading) return <LoadingRows rows={5} />;
  if (invites.error) return <ErrorState message={(invites.error as Error).message} />;

  const rows = invites.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invitaciones"
        description="Cada acceso se entrega con un código de activación. Nadie se registra por su cuenta y nunca se comparten contraseñas."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Nueva invitación
          </Button>
        }
      />

      <Card className="border-border/70 bg-card/80">
        <CardContent className="overflow-x-auto pt-6">
          {rows.length === 0 ? (
            <EmptyState title="Aún no has creado invitaciones." />
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
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.email}</TableCell>
                    <TableCell>{ROLE_LABELS[row.role]}</TableCell>
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
                          <Copy className="size-4" /> Copiar enlace
                        </Button>
                        {row.status === "pendiente" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => revoke.mutate(row.id)}
                          >
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva invitación</DialogTitle>
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
              if (role !== "coach" && !playerId) {
                toast.error("Selecciona el jugador relacionado");
                return;
              }
              create.mutate({ email, fullName: String(form.get("fullName") ?? "").trim() });
            }}
          >
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITABLE.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {role !== "coach" ? (
              <div className="space-y-1.5">
                <Label>Jugador relacionado</Label>
                <Select value={playerId} onValueChange={setPlayerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un jugador" />
                  </SelectTrigger>
                  <SelectContent>
                    {(players.data ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Correo</Label>
              <Input id="invite-email" name="email" type="email" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-name">Nombre (opcional)</Label>
              <Input id="invite-name" name="fullName" />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "Creando…" : "Crear invitación"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
