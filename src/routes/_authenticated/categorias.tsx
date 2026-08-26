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
  listPlayers,
  listTeams,
  removeRow,
  upsertCategory,
} from "@/lib/api/school-data";
import type { Category } from "@/lib/api/client";
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

export const Route = createFileRoute("/_authenticated/categorias")({
  head: () => ({
    meta: [
      { title: "Categorías — FútbolGestión" },
      { name: "description", content: "Categorías por edad de la escuela." },
      { property: "og:title", content: "Categorías — FútbolGestión" },
      { property: "og:description", content: "Categorías por edad de la escuela." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CategoriesPage,
});

const categorySchema = z.object({
  name: z.string().trim().nonempty("El nombre es obligatorio").max(60),
  min_age: z.number().int().min(3).max(30).optional(),
  max_age: z.number().int().min(3).max(30).optional(),
});

function CategoriesPage() {
  const { school, role } = useTenant();
  const schoolId = school?.id;
  const editable = canManage(role);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ["categories", schoolId],
    enabled: !!schoolId,
    queryFn: () => listCategories(schoolId!),
  });
  const playersQuery = useQuery({
    queryKey: ["players", schoolId],
    enabled: !!schoolId,
    queryFn: () => listPlayers(schoolId!),
  });
  const teamsQuery = useQuery({
    queryKey: ["teams", schoolId],
    enabled: !!schoolId,
    queryFn: () => listTeams(schoolId!),
  });

  const saveMutation = useMutation({
    mutationFn: (values: Partial<Category> & { id?: string }) => upsertCategory(schoolId!, values),
    onSuccess: () => {
      toast.success("Categoría guardada");
      setCreating(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["categories", schoolId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeRow("categories", id),
    onSuccess: () => {
      toast.success("Categoría eliminada");
      queryClient.invalidateQueries({ queryKey: ["categories", schoolId] });
    },
    onError: (e) => toast.error(e.message),
  });

  if (categoriesQuery.error) return <ErrorState message={categoriesQuery.error.message} />;

  const categories = categoriesQuery.data ?? [];
  const players = playersQuery.data ?? [];
  const teams = teamsQuery.data ?? [];

  return (
    <>
      <PageHeader
        title="Categorías"
        description="Estructura por rangos de edad de la escuela."
        actions={
          editable ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" /> Nueva categoría
            </Button>
          ) : undefined
        }
      />

      {categoriesQuery.isLoading ? (
        <LoadingRows rows={4} />
      ) : categories.length === 0 ? (
        <EmptyState
          title="Sin categorías"
          description="Crea la primera categoría (por ejemplo Sub-10) para organizar jugadores y equipos."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const playerCount = players.filter((p) => p.category_id === cat.id).length;
            const teamCount = teams.filter((t) => t.category_id === cat.id).length;
            return (
              <Card key={cat.id} className="border-border/70 bg-card/80">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display text-lg font-semibold">{cat.name}</p>
                    {cat.min_age != null && cat.max_age != null ? (
                      <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                        {cat.min_age}–{cat.max_age} años
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {playerCount} jugador{playerCount === 1 ? "" : "es"} · {teamCount} equipo
                    {teamCount === 1 ? "" : "s"}
                  </p>
                  {editable ? (
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" onClick={() => setEditing(cat)}>
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`¿Eliminar la categoría ${cat.name}?`)) {
                            deleteMutation.mutate(cat.id);
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

      <CategoryDialog
        open={creating || !!editing}
        category={editing}
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

function CategoryDialog({
  open,
  category,
  pending,
  onClose,
  onSave,
}: {
  open: boolean;
  category: Category | null;
  pending: boolean;
  onClose: () => void;
  onSave: (values: Partial<Category>) => void;
}) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const minAge = Number(form.get("min_age"));
    const maxAge = Number(form.get("max_age"));
    const parsed = categorySchema.safeParse({
      name: form.get("name"),
      min_age: Number.isNaN(minAge) ? undefined : minAge,
      max_age: Number.isNaN(maxAge) ? undefined : maxAge,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Revisa los datos");
      return;
    }
    if (
      parsed.data.min_age != null &&
      parsed.data.max_age != null &&
      parsed.data.min_age > parsed.data.max_age
    ) {
      toast.error("La edad mínima no puede ser mayor que la máxima");
      return;
    }
    onSave({
      name: parsed.data.name,
      min_age: parsed.data.min_age ?? null,
      max_age: parsed.data.max_age ?? null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Editar categoría" : "Nueva categoría"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit} key={category?.id ?? "new"}>
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" name="name" placeholder="Sub-12" defaultValue={category?.name} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="min_age">Edad mínima</Label>
              <Input
                id="min_age"
                name="min_age"
                type="number"
                min={3}
                max={30}
                defaultValue={category?.min_age ?? ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max_age">Edad máxima</Label>
              <Input
                id="max_age"
                name="max_age"
                type="number"
                min={3}
                max={30}
                defaultValue={category?.max_age ?? ""}
              />
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
