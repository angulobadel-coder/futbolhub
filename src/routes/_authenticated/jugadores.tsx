import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";

import { useTenant } from "@/lib/tenant";
import { canManage } from "@/lib/api/tenancy";
import {
  listCategories,
  listPlayers,
  listTeams,
  removeRow,
  upsertPlayer,
  type Draft,
} from "@/lib/api/school-data";
import type { Player, PlayerStatus } from "@/lib/api/client";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/jugadores")({
  head: () => ({
    meta: [
      { title: "Jugadores — FútbolGestión" },
      { name: "description", content: "Gestión de jugadores de la escuela." },
      { property: "og:title", content: "Jugadores — FútbolGestión" },
      { property: "og:description", content: "Gestión de jugadores de la escuela." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlayersPage,
});

const STATUS_LABEL: Record<PlayerStatus, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  suspendido: "Suspendido",
  retirado: "Retirado",
};

const playerSchema = z.object({
  full_name: z.string().trim().nonempty("El nombre es obligatorio").max(120),
  position: z.string().trim().max(60).optional(),
  birth_date: z.string().optional(),
  document_id: z.string().trim().max(40).optional(),
  guardian_name: z.string().trim().max(120).optional(),
  guardian_phone: z.string().trim().max(30).optional(),
  status: z.enum(["activo", "inactivo", "suspendido", "retirado"]),
});

function PlayersPage() {
  const { school, role } = useTenant();
  const schoolId = school?.id;
  const editable = canManage(role);
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [editing, setEditing] = useState<Player | null>(null);
  const [creating, setCreating] = useState(false);

  const playersQuery = useQuery({
    queryKey: ["players", schoolId],
    enabled: !!schoolId,
    queryFn: () => listPlayers(schoolId!),
  });
  const categoriesQuery = useQuery({
    queryKey: ["categories", schoolId],
    enabled: !!schoolId,
    queryFn: () => listCategories(schoolId!),
  });
  const teamsQuery = useQuery({
    queryKey: ["teams", schoolId],
    enabled: !!schoolId,
    queryFn: () => listTeams(schoolId!),
  });

  const saveMutation = useMutation({
    mutationFn: (values: Draft<Player>) => upsertPlayer(schoolId!, values),
    onSuccess: () => {
      toast.success("Jugador guardado");
      setCreating(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["players", schoolId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeRow("players", id),
    onSuccess: () => {
      toast.success("Jugador eliminado");
      queryClient.invalidateQueries({ queryKey: ["players", schoolId] });
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (playersQuery.data ?? []).filter((p) => {
      const matchTerm = !term || p.full_name.toLowerCase().includes(term);
      const matchStatus = statusFilter === "todos" || p.status === statusFilter;
      return matchTerm && matchStatus;
    });
  }, [playersQuery.data, search, statusFilter]);

  const categories = categoriesQuery.data ?? [];
  const teams = teamsQuery.data ?? [];

  if (playersQuery.error) return <ErrorState message={playersQuery.error.message} />;

  return (
    <>
      <PageHeader
        title="Jugadores"
        description="Registro y seguimiento de los jugadores de la escuela."
        actions={
          editable ? (
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" /> Nuevo jugador
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre…"
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {playersQuery.isLoading ? (
        <LoadingRows rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={search || statusFilter !== "todos" ? "Sin resultados" : "Sin jugadores"}
          description={
            search || statusFilter !== "todos"
              ? "Prueba con otro término de búsqueda o filtro."
              : "Registra el primer jugador de la escuela."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/70">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="hidden md:table-cell">Categoría</TableHead>
                <TableHead className="hidden md:table-cell">Equipo</TableHead>
                <TableHead className="hidden lg:table-cell">Posición</TableHead>
                <TableHead>Estado</TableHead>
                {editable ? <TableHead className="text-right">Acciones</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((player) => (
                <TableRow key={player.id}>
                  <TableCell className="font-medium">{player.full_name}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {categories.find((c) => c.id === player.category_id)?.name ?? "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {teams.find((t) => t.id === player.team_id)?.name ?? "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{player.position ?? "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={player.status === "activo" ? "default" : "secondary"}
                      className="capitalize"
                    >
                      {STATUS_LABEL[player.status]}
                    </Badge>
                  </TableCell>
                  {editable ? (
                    <TableCell className="space-x-2 text-right">
                      <Button variant="outline" size="sm" onClick={() => setEditing(player)}>
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`¿Eliminar a ${player.full_name}?`)) {
                            deleteMutation.mutate(player.id);
                          }
                        }}
                      >
                        Eliminar
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PlayerDialog
        open={creating || !!editing}
        player={editing}
        categories={categories}
        teams={teams}
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

function PlayerDialog({
  open,
  player,
  categories,
  teams,
  pending,
  onClose,
  onSave,
}: {
  open: boolean;
  player: Player | null;
  categories: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  pending: boolean;
  onClose: () => void;
  onSave: (values: Draft<Player>) => void;
}) {
  const [categoryId, setCategoryId] = useState<string>("");
  const [teamId, setTeamId] = useState<string>("");
  const [status, setStatus] = useState<PlayerStatus>("activo");

  // Sincronizar selección al abrir
  if (open && player && categoryId === "" && teamId === "") {
    setCategoryId(player.category_id ?? "");
    setTeamId(player.team_id ?? "");
    setStatus(player.status);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = playerSchema.safeParse({
      full_name: form.get("full_name"),
      position: form.get("position") || undefined,
      birth_date: form.get("birth_date") || undefined,
      document_id: form.get("document_id") || undefined,
      guardian_name: form.get("guardian_name") || undefined,
      guardian_phone: form.get("guardian_phone") || undefined,
      status,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Revisa los datos");
      return;
    }
    onSave({
      ...parsed.data,
      category_id: categoryId || null,
      team_id: teamId || null,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setCategoryId("");
          setTeamId("");
          setStatus("activo");
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{player ? "Editar jugador" : "Nuevo jugador"}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit} key={player?.id ?? "new"}>
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Nombre completo *</Label>
            <Input id="full_name" name="full_name" defaultValue={player?.full_name} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="birth_date">Fecha de nacimiento</Label>
              <Input id="birth_date" name="birth_date" type="date" defaultValue={player?.birth_date ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="document_id">Documento</Label>
              <Input id="document_id" name="document_id" defaultValue={player?.document_id ?? ""} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Posición</Label>
              <Input name="position" defaultValue={player?.position ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as PlayerStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              <Label>Equipo</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin equipo" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="guardian_name">Acudiente</Label>
              <Input id="guardian_name" name="guardian_name" defaultValue={player?.guardian_name ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guardian_phone">Teléfono acudiente</Label>
              <Input id="guardian_phone" name="guardian_phone" defaultValue={player?.guardian_phone ?? ""} />
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
