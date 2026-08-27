import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

import { useTenant } from "@/lib/tenant";
import { canManage } from "@/lib/api/tenancy";
import {
  listCategories,
  listCoaches,
  listPlayers,
  listTeams,
  removeRow,
  upsertTeam,
  type Draft,
} from "@/lib/api/school-data";
import type { Team } from "@/lib/api/client";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createFileRoute("/_authenticated/equipos")({
  head: () => ({
    meta: [
      { title: "Equipos — FútbolGestión" },
      { name: "description", content: "Equipos de la escuela y sus plantillas." },
      { property: "og:title", content: "Equipos — FútbolGestión" },
      { property: "og:description", content: "Equipos de la escuela y sus plantillas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TeamsPage,
});

const teamSchema = z.object({
  name: z.string().trim().nonempty("El nombre es obligatorio").max(80),
  season: z.string().trim().max(20).optional(),
});

function TeamsPage() {
  const { school, role } = useTenant();
  const schoolId = school?.id;
  const editable = canManage(role);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Team | null>(null);
  const [creating, setCreating] = useState(false);

  const teamsQuery = useQuery({
    queryKey: ["teams", schoolId],
    enabled: !!schoolId,
    queryFn: () => listTeams(schoolId!),
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories", schoolId],
    enabled: !!schoolId,
    queryFn: () => listCategories(schoolId!),
  });
  const coachesQuery = useQuery({
    queryKey: ["coaches", schoolId],
    enabled: !!schoolId,
    queryFn: () => listCoaches(schoolId!),
  });
  const playersQuery = useQuery({
    queryKey: ["players", schoolId],
    enabled: !!schoolId,
    queryFn: () => listPlayers(schoolId!),
  });

  const saveMutation = useMutation({
    mutationFn: (values: Draft<Team>) => upsertTeam(schoolId!, values),
    onSuccess: () => {
      toast.success("Equipo guardado");
      setCreating(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["teams", schoolId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeRow("teams", id),
    onSuccess: () => {
      toast.success("Equipo eliminado");
      queryClient.invalidateQueries({ queryKey: ["teams", schoolId] });
    },
    onError: (e) => toast.error(e.message),
  });

  if (teamsQuery.error) return <ErrorState message={teamsQuery.error.message} />;

  const teams = teamsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const coaches = coachesQuery.data ?? [];
  const players = playersQuery.data ?? [];

  return (
    <>
      <PageHeader
        title="Equipos"
        description="Equipos por categoría, con entrenador asignado y plantilla."
        actions={
          editable ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" /> Nuevo equipo
            </Button>
          ) : undefined
        }
      />

      {teamsQuery.isLoading ? (
        <LoadingRows rows={4} />
      ) : teams.length === 0 ? (
        <EmptyState
          title="Sin equipos"
          description="Crea el primer equipo y asígnale categoría y entrenador."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => {
            const category = categories.find((c) => c.id === team.category_id);
            const coach = coaches.find((c) => c.id === team.coach_id);
            const roster = players.filter((p) => p.team_id === team.id);
            return (
              <Card key={team.id} className="border-border/70 bg-card/80">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display text-lg font-semibold">{team.name}</p>
                    {team.season ? (
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                        {team.season}
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>{category ? `Categoría ${category.name}` : "Sin categoría"}</p>
                    <p>{coach ? coach.full_name : "Sin entrenador"}</p>
                    <p>
                      {roster.length} jugador{roster.length === 1 ? "" : "es"} en plantilla
                    </p>
                  </div>
                  {roster.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {roster.slice(0, 5).map((p) => (
                        <span
                          key={p.id}
                          className="rounded-md bg-secondary px-2 py-0.5 text-xs"
                          title={p.full_name}
                        >
                          {p.full_name.split(" ").slice(0, 2).join(" ")}
                        </span>
                      ))}
                      {roster.length > 5 ? (
                        <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                          +{roster.length - 5}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {editable ? (
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" onClick={() => setEditing(team)}>
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`¿Eliminar el equipo ${team.name}?`)) {
                            deleteMutation.mutate(team.id);
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

      <TeamDialog
        open={creating || !!editing}
        team={editing}
        categories={categories}
        coaches={coaches}
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

function TeamDialog({
  open,
  team,
  categories,
  coaches,
  pending,
  onClose,
  onSave,
}: {
  open: boolean;
  team: Team | null;
  categories: { id: string; name: string }[];
  coaches: { id: string; full_name: string }[];
  pending: boolean;
  onClose: () => void;
  onSave: (values: Draft<Team>) => void;
}) {
  const [categoryId, setCategoryId] = useState("");
  const [coachId, setCoachId] = useState("");

  if (open && team && categoryId === "" && coachId === "") {
    setCategoryId(team.category_id ?? "");
    setCoachId(team.coach_id ?? "");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = teamSchema.safeParse({
      name: form.get("name"),
      season: form.get("season") || undefined,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Revisa los datos");
      return;
    }
    onSave({
      ...parsed.data,
      category_id: categoryId || null,
      coach_id: coachId || null,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setCategoryId("");
          setCoachId("");
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{team ? "Editar equipo" : "Nuevo equipo"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit} key={team?.id ?? "new"}>
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" name="name" placeholder="Futuro Sub-12 A" defaultValue={team?.name} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Categoría</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Entrenador</Label>
              <Select value={coachId} onValueChange={setCoachId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin entrenador" />
                </SelectTrigger>
                <SelectContent>
                  {coaches.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="season">Temporada</Label>
            <Input id="season" name="season" placeholder="2026" defaultValue={team?.season ?? ""} />
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
