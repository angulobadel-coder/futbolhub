import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

import { useTenant } from "@/lib/tenant";
import { canManage } from "@/lib/api/tenancy";
import {
  listCoaches,
  listTeams,
  removeRow,
  upsertCoach,
  type Draft,
} from "@/lib/api/school-data";
import type { Coach } from "@/lib/api/client";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/entrenadores")({
  head: () => ({
    meta: [
      { title: "Entrenadores — FútbolGestión" },
      { name: "description", content: "Gestión de entrenadores de la escuela." },
      { property: "og:title", content: "Entrenadores — FútbolGestión" },
      { property: "og:description", content: "Gestión de entrenadores de la escuela." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoachesPage,
});

const coachSchema = z.object({
  full_name: z.string().trim().nonempty("El nombre es obligatorio").max(120),
  email: z.string().trim().email("Correo inválido").max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  specialty: z.string().trim().max(120).optional(),
});

function CoachesPage() {
  const { school, role } = useTenant();
  const schoolId = school?.id;
  const editable = canManage(role);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Coach | null>(null);
  const [creating, setCreating] = useState(false);

  const coachesQuery = useQuery({
    queryKey: ["coaches", schoolId],
    enabled: !!schoolId,
    queryFn: () => listCoaches(schoolId!),
  });
  const teamsQuery = useQuery({
    queryKey: ["teams", schoolId],
    enabled: !!schoolId,
    queryFn: () => listTeams(schoolId!),
  });

  const saveMutation = useMutation({
    mutationFn: (values: Draft<Coach>) => upsertCoach(schoolId!, values),
    onSuccess: () => {
      toast.success("Entrenador guardado");
      setCreating(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["coaches", schoolId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (coach: Coach) =>
      upsertCoach(schoolId!, {
        id: coach.id,
        status: coach.status === "activo" ? "inactivo" : "activo",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["coaches", schoolId] }),
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeRow("coaches", id),
    onSuccess: () => {
      toast.success("Entrenador eliminado");
      queryClient.invalidateQueries({ queryKey: ["coaches", schoolId] });
    },
    onError: (e) => toast.error(e.message),
  });

  if (coachesQuery.error) return <ErrorState message={coachesQuery.error.message} />;

  const teams = teamsQuery.data ?? [];
  const term = search.trim().toLowerCase();
  const filtered = (coachesQuery.data ?? []).filter(
    (c) => !term || c.full_name.toLowerCase().includes(term),
  );

  return (
    <>
      <PageHeader
        title="Entrenadores"
        description="Equipo técnico de la escuela y sus asignaciones."
        actions={
          editable ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" /> Nuevo entrenador
            </Button>
          ) : undefined
        }
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre…"
          className="pl-9"
        />
      </div>

      {coachesQuery.isLoading ? (
        <LoadingRows rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={term ? "Sin resultados" : "Sin entrenadores"}
          description={term ? "Prueba con otro término." : "Registra el primer entrenador de la escuela."}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((coach) => {
            const coachTeams = teams.filter((t) => t.coach_id === coach.id);
            return (
              <Card key={coach.id} className="border-border/70 bg-card/80">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display font-semibold">{coach.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {coach.specialty || "Entrenador"}
                      </p>
                    </div>
                    <Badge variant={coach.status === "activo" ? "default" : "secondary"}>
                      {coach.status === "activo" ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p>{coach.email ?? "Sin correo"}</p>
                    <p>{coach.phone ?? "Sin teléfono"}</p>
                    <p>
                      {coachTeams.length === 0
                        ? "Sin equipos asignados"
                        : `Equipos: ${coachTeams.map((t) => t.name).join(", ")}`}
                    </p>
                  </div>
                  {editable ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button variant="outline" size="sm" onClick={() => setEditing(coach)}>
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => toggleMutation.mutate(coach)}>
                        {coach.status === "activo" ? "Desactivar" : "Activar"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`¿Eliminar a ${coach.full_name}?`)) {
                            deleteMutation.mutate(coach.id);
                          }
                        }}
                      >
                        Eliminar
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CoachDialog
        open={creating || !!editing}
        coach={editing}
        pending={saveMutation.isPending}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSave={(values) => saveMutation.mutate({ ...values, id: editing?.id })}
      />
    </>
  );
}

function CoachDialog({
  open,
  coach,
  pending,
  onClose,
  onSave,
}: {
  open: boolean;
  coach: Coach | null;
  pending: boolean;
  onClose: () => void;
  onSave: (values: Draft<Coach>) => void;
}) {
  const [status, setStatus] = useState<Coach["status"]>(coach?.status ?? "activo");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = coachSchema.safeParse({
      full_name: form.get("full_name"),
      email: form.get("email") || undefined,
      phone: form.get("phone") || undefined,
      specialty: form.get("specialty") || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Revisa los datos");
      return;
    }
    onSave({ ...parsed.data, email: parsed.data.email || null, status });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{coach ? "Editar entrenador" : "Nuevo entrenador"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit} key={coach?.id ?? "new"}>
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Nombre completo *</Label>
            <Input id="full_name" name="full_name" defaultValue={coach?.full_name} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo</Label>
              <Input id="email" name="email" type="email" defaultValue={coach?.email ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" name="phone" defaultValue={coach?.phone ?? ""} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="specialty">Especialidad</Label>
              <Input id="specialty" name="specialty" defaultValue={coach?.specialty ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Coach["status"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
