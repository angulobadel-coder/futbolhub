import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  ClipboardList,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipForward,
  Timer,
  Trash2,
} from "lucide-react";

import { useTenant } from "@/lib/tenant";
import { listCoaches, listPlayers, listTeams } from "@/lib/api/school-data";
import {
  listSessionAttendance,
  listTrainingSessions,
  saveAttendance,
  ATTENDANCE_STATUS_LABEL,
  type AttendanceStatus,
  type TrainingSession,
} from "@/lib/api/training";
import { canManageTrainings, resolveScope, sessionInScope } from "@/lib/api/scope";
import {
  addDrill,
  getFeedback,
  listDrills,
  listExercises,
  removeDrill,
  removeExercise,
  saveExercise,
  saveFeedback,
  updateDrill,
  EXERCISE_KINDS,
  INTENSITIES,
  type Drill,
  type Exercise,
} from "@/lib/api/methodology";
import { PHASES, materialsList, phaseTotals, sessionMinutes, type Phase } from "@/lib/rules/methodology";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/metodologia")({
  head: () => ({
    meta: [
      { title: "Planificar entrenamientos — FútbolGestión" },
      { name: "description", content: "Banco de ejercicios, plan de clase por fases y modo cancha en vivo." },
      { property: "og:title", content: "Planificar entrenamientos — FútbolGestión" },
      { property: "og:description", content: "Banco de ejercicios, plan de clase por fases y modo cancha en vivo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MethodologyPage,
});

function fmtSession(s: TrainingSession) {
  return `${s.session_date} · ${s.start_time.slice(0, 5)} — ${s.objective ?? "Sin objetivo"}`;
}

function MethodologyPage() {
  const { school, role, user } = useTenant();
  const schoolId = school?.id;
  const [tab, setTab] = useState("plan");
  const [sessionId, setSessionId] = useState<string>("");

  const sessionsQ = useQuery({ queryKey: ["training-sessions", schoolId], enabled: !!schoolId, queryFn: () => listTrainingSessions(schoolId!) });
  const coachesQ = useQuery({ queryKey: ["coaches", schoolId], enabled: !!schoolId, queryFn: () => listCoaches(schoolId!) });
  const teamsQ = useQuery({ queryKey: ["teams", schoolId], enabled: !!schoolId, queryFn: () => listTeams(schoolId!) });
  const playersQ = useQuery({ queryKey: ["players", schoolId], enabled: !!schoolId, queryFn: () => listPlayers(schoolId!) });

  const scope = useMemo(
    () => resolveScope({ role, userId: user?.id, coaches: coachesQ.data ?? [], teams: teamsQ.data ?? [], players: playersQ.data ?? [] }),
    [role, user?.id, coachesQ.data, teamsQ.data, playersQ.data],
  );
  const sessions = useMemo(
    () => (sessionsQ.data ?? []).filter((s) => s.status !== "cancelado" && sessionInScope(s, scope)),
    [sessionsQ.data, scope],
  );
  const session = sessions.find((s) => s.id === sessionId) ?? null;

  useEffect(() => {
    if (!sessionId && sessions.length) {
      const today = new Date().toISOString().slice(0, 10);
      const next = [...sessions].reverse().find((s) => s.session_date >= today) ?? sessions[0];
      if (next) setSessionId(next.id);
    }
  }, [sessions, sessionId]);

  if (!schoolId) return <EmptyState title="Selecciona una escuela" description="Elige una escuela para planificar." />;
  if (!canManageTrainings(role)) return <EmptyState title="Sin acceso" description="Solo entrenadores y directores." />;

  const sessionPicker = (
    <div className="max-w-xl space-y-1.5">
      <Label>Sesión de entrenamiento</Label>
      <Select value={sessionId} onValueChange={setSessionId}>
        <SelectTrigger><SelectValue placeholder="Elige una sesión" /></SelectTrigger>
        <SelectContent>
          {sessions.map((s) => (
            <SelectItem key={s.id} value={s.id}>{fmtSession(s)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planificar entrenamientos"
        description="Diseña tus sesiones con ejercicios por fases y dirígelas en la cancha."
      />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="plan"><ClipboardList className="mr-1.5 size-4" />Plan de sesión</TabsTrigger>
          <TabsTrigger value="banco"><BookOpen className="mr-1.5 size-4" />Banco de ejercicios</TabsTrigger>
          <TabsTrigger value="cancha"><Timer className="mr-1.5 size-4" />Modo cancha</TabsTrigger>
        </TabsList>

        <TabsContent value="banco" className="mt-6">
          <ExerciseBank schoolId={schoolId} />
        </TabsContent>

        <TabsContent value="plan" className="mt-6 space-y-6">
          {sessionsQ.isLoading ? <LoadingRows /> : sessions.length === 0 ? (
            <EmptyState title="Sin sesiones" description="Primero programa un entrenamiento en la sección Entrenamientos." />
          ) : (
            <>
              {sessionPicker}
              {session ? <SessionPlanner schoolId={schoolId} session={session} /> : null}
            </>
          )}
        </TabsContent>

        <TabsContent value="cancha" className="mt-6 space-y-6">
          {sessions.length === 0 ? (
            <EmptyState title="Sin sesiones" description="Programa un entrenamiento para usar el modo cancha." />
          ) : (
            <>
              {sessionPicker}
              {session ? (
                <FieldMode key={session.id} schoolId={schoolId} session={session} players={playersQ.data ?? []} />
              ) : null}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ------------------------------ Banco de ejercicios ------------------------------ */

function ExerciseBank({ schoolId }: { schoolId: string }) {
  const qc = useQueryClient();
  const [kind, setKind] = useState("todas");
  const [editing, setEditing] = useState<Partial<Exercise> | null>(null);
  const q = useQuery({ queryKey: ["exercises", schoolId], queryFn: () => listExercises(schoolId) });
  const del = useMutation({
    mutationFn: removeExercise,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["exercises", schoolId] }); toast.success("Ejercicio eliminado"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const list = (q.data ?? []).filter((e) => kind === "todas" || e.kind === kind);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            {Object.entries(EXERCISE_KINDS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button className="ml-auto" onClick={() => setEditing({ kind: "tecnica", intensity: "media", duration_min: 10 })}>
          <Plus className="size-4" /> Nuevo ejercicio
        </Button>
      </div>
      {q.isLoading ? <LoadingRows /> : q.error ? <ErrorState message={(q.error as Error).message} /> : list.length === 0 ? (
        <EmptyState title="Aún no hay ejercicios" description="Crea tu primera tarea para reutilizarla en cualquier sesión." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((e) => (
            <Card key={e.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{e.name}</CardTitle>
                  <Badge variant="outline">{EXERCISE_KINDS[e.kind] ?? e.kind}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{e.duration_min} min · Intensidad {INTENSITIES[e.intensity]?.toLowerCase()}</p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {e.objective ? <p><span className="text-muted-foreground">Objetivo:</span> {e.objective}</p> : null}
                {e.materials ? <p><span className="text-muted-foreground">Material:</span> {e.materials}</p> : null}
                {e.instructions ? <p className="line-clamp-3 text-muted-foreground">{e.instructions}</p> : null}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(e)}>Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => confirm("¿Eliminar este ejercicio?") && del.mutate(e.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <ExerciseDialog schoolId={schoolId} value={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function ExerciseDialog({ schoolId, value, onClose }: { schoolId: string; value: Partial<Exercise> | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<Exercise>>({});
  useEffect(() => setForm(value ?? {}), [value]);
  const set = (k: keyof Exercise, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const save = useMutation({
    mutationFn: () => {
      if (!form.name?.trim()) throw new Error("El nombre es obligatorio");
      return saveExercise(schoolId, {
        id: form.id,
        name: form.name.trim(),
        kind: form.kind ?? "tecnica",
        intensity: form.intensity ?? "media",
        duration_min: Number(form.duration_min) || 10,
        objective: form.objective || null,
        materials: form.materials || null,
        instructions: form.instructions || null,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["exercises", schoolId] }); toast.success("Ejercicio guardado"); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{form.id ? "Editar ejercicio" : "Nuevo ejercicio"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5"><Label>Nombre</Label><Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} maxLength={120} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Categoría</Label>
              <Select value={form.kind ?? "tecnica"} onValueChange={(v) => set("kind", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(EXERCISE_KINDS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Intensidad</Label>
              <Select value={form.intensity ?? "media"} onValueChange={(v) => set("intensity", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(INTENSITIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Minutos</Label><Input type="number" min={1} max={120} value={form.duration_min ?? 10} onChange={(e) => set("duration_min", e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label>Objetivo</Label><Input value={form.objective ?? ""} onChange={(e) => set("objective", e.target.value)} maxLength={160} /></div>
          <div className="space-y-1.5"><Label>Materiales (separados por coma)</Label><Input value={form.materials ?? ""} onChange={(e) => set("materials", e.target.value)} placeholder="10 conos, 6 petos rojos, balones" /></div>
          <div className="space-y-1.5"><Label>Explicación y reglas</Label><Textarea rows={4} value={form.instructions ?? ""} onChange={(e) => set("instructions", e.target.value)} maxLength={1500} /></div>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Guardar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------- Plan de sesión --------------------------------- */

function SessionPlanner({ schoolId, session }: { schoolId: string; session: TrainingSession }) {
  const qc = useQueryClient();
  const key = ["drills", session.id];
  const drillsQ = useQuery({ queryKey: key, queryFn: () => listDrills(session.id) });
  const exQ = useQuery({ queryKey: ["exercises", schoolId], queryFn: () => listExercises(schoolId) });
  const drills = drillsQ.data ?? [];
  const totals = phaseTotals(drills);
  const planned = sessionMinutes(session.start_time, session.end_time);
  const materials = materialsList(drills);
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const onErr = (e: Error) => toast.error(e.message);

  const add = useMutation({
    mutationFn: async ({ phase, exercise, name }: { phase: Phase; exercise?: Exercise; name?: string }) =>
      addDrill({
        school_id: schoolId,
        session_id: session.id,
        phase,
        position: drills.length ? Math.max(...drills.map((d) => d.position)) + 1 : 0,
        exercise_id: exercise?.id ?? null,
        name: exercise?.name ?? name ?? "Tarea",
        duration_min: exercise?.duration_min ?? 10,
        materials: exercise?.materials ?? null,
        instructions: exercise?.instructions ?? null,
      }),
    onSuccess: refresh,
    onError: onErr,
  });
  const upd = useMutation({ mutationFn: ({ id, v }: { id: string; v: Partial<Drill> }) => updateDrill(id, v), onSuccess: refresh, onError: onErr });
  const del = useMutation({ mutationFn: removeDrill, onSuccess: refresh, onError: onErr });

  function move(phaseDrills: Drill[], i: number, dir: -1 | 1) {
    const a = phaseDrills[i], b = phaseDrills[i + dir];
    if (!a || !b) return;
    upd.mutate({ id: a.id, v: { position: b.position } });
    upd.mutate({ id: b.id, v: { position: a.position } });
  }

  if (drillsQ.isLoading) return <LoadingRows />;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        {PHASES.map((p) => {
          const items = drills.filter((d) => d.phase === p.id);
          return (
            <Card key={p.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{p.label}</CardTitle>
                    <p className="text-xs text-muted-foreground">{p.hint}</p>
                  </div>
                  <Badge variant="outline">{totals.byPhase[p.id]} min</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {items.map((d, i) => (
                  <DrillRow key={d.id} drill={d} onSave={(v) => upd.mutate({ id: d.id, v })} onDelete={() => del.mutate(d.id)}
                    onUp={() => move(items, i, -1)} onDown={() => move(items, i, 1)} />
                ))}
                <div className="flex flex-wrap gap-2">
                  <Select value="" onValueChange={(id) => { const ex = exQ.data?.find((e) => e.id === id); if (ex) add.mutate({ phase: p.id, exercise: ex }); }}>
                    <SelectTrigger className="w-60"><SelectValue placeholder="Añadir desde el banco…" /></SelectTrigger>
                    <SelectContent>
                      {(exQ.data ?? []).length === 0 ? <SelectItem value="none" disabled>Banco vacío</SelectItem> :
                        (exQ.data ?? []).map((e) => <SelectItem key={e.id} value={e.id}>{e.name} · {e.duration_min} min</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => add.mutate({ phase: p.id, name: "Nueva tarea" })}><Plus className="size-4" /> Tarea libre</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Volumen</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-display text-3xl font-semibold">{totals.total} min</p>
            <p className="text-muted-foreground">{planned ? `Programado: ${planned} min` : "Sin hora de fin programada"}</p>
            {planned && totals.total > planned ? <p className="text-destructive">Excede el tiempo en {totals.total - planned} min</p> : null}
            {planned && totals.total < planned ? <p className="text-muted-foreground">Quedan {planned - totals.total} min libres</p> : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Material para la cancha</CardTitle></CardHeader>
          <CardContent>
            {materials.length === 0 ? <p className="text-sm text-muted-foreground">Sin materiales registrados.</p> : (
              <ul className="list-inside list-disc space-y-1 text-sm">{materials.map((m) => <li key={m}>{m}</li>)}</ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DrillRow({ drill, onSave, onDelete, onUp, onDown }: { drill: Drill; onSave: (v: Partial<Drill>) => void; onDelete: () => void; onUp: () => void; onDown: () => void }) {
  const [name, setName] = useState(drill.name);
  const [mins, setMins] = useState(String(drill.duration_min));
  const [mat, setMat] = useState(drill.materials ?? "");
  const [ins, setIns] = useState(drill.instructions ?? "");
  const dirty = name !== drill.name || mins !== String(drill.duration_min) || mat !== (drill.materials ?? "") || ins !== (drill.instructions ?? "");
  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
        <Input type="number" min={1} max={120} value={mins} onChange={(e) => setMins(e.target.value)} className="w-20" aria-label="Minutos" />
        <Button size="icon" variant="ghost" onClick={onUp} aria-label="Subir"><ArrowUp className="size-4" /></Button>
        <Button size="icon" variant="ghost" onClick={onDown} aria-label="Bajar"><ArrowDown className="size-4" /></Button>
        <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Quitar"><Trash2 className="size-4" /></Button>
      </div>
      <Input value={mat} onChange={(e) => setMat(e.target.value)} placeholder="Materiales" />
      <Textarea rows={2} value={ins} onChange={(e) => setIns(e.target.value)} placeholder="Reglas / explicación" />
      {dirty ? (
        <Button size="sm" onClick={() => onSave({ name: name.trim() || "Tarea", duration_min: Number(mins) || 1, materials: mat || null, instructions: ins || null })}>
          Guardar cambios
        </Button>
      ) : null}
    </div>
  );
}

/* ---------------------------------- Modo cancha ---------------------------------- */

function FieldMode({ schoolId, session, players }: { schoolId: string; session: TrainingSession; players: { id: string; full_name: string; team_id: string | null; category_id: string | null; status: string }[] }) {
  const qc = useQueryClient();
  const drillsQ = useQuery({ queryKey: ["drills", session.id], queryFn: () => listDrills(session.id) });
  const order = useMemo(() => {
    const ds = drillsQ.data ?? [];
    return PHASES.flatMap((p) => ds.filter((d) => d.phase === p.id));
  }, [drillsQ.data]);
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const current = order[idx];

  useEffect(() => { if (current) setLeft(current.duration_min * 60); setRunning(false); }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((s) => {
      if (s <= 1) { setRunning(false); toast.info("¡Tiempo! Pasa a la siguiente tarea"); return 0; }
      return s - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [running]);

  const roster = players.filter((p) => p.status === "activo" &&
    (session.team_id ? p.team_id === session.team_id : session.category_id ? p.category_id === session.category_id : false));
  const attQ = useQuery({ queryKey: ["attendance", session.id], queryFn: () => listSessionAttendance(session.id) });
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  useEffect(() => {
    const m: Record<string, AttendanceStatus> = {};
    for (const a of attQ.data ?? []) m[a.player_id] = a.status;
    setMarks(m);
  }, [attQ.data]);
  const saveAtt = useMutation({
    mutationFn: () => saveAttendance(schoolId, session.id, Object.entries(marks).map(([player_id, status]) => ({ player_id, status }))),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["attendance"] }); toast.success("Asistencia guardada"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const fbQ = useQuery({ queryKey: ["feedback", session.id], queryFn: () => getFeedback(session.id) });
  const [fb, setFb] = useState({ intensity: 3, objective_rating: 3, standout_players: "", needs_work_players: "", notes: "" });
  useEffect(() => {
    const f = fbQ.data;
    if (f) setFb({ intensity: f.intensity ?? 3, objective_rating: f.objective_rating ?? 3, standout_players: f.standout_players ?? "", needs_work_players: f.needs_work_players ?? "", notes: f.notes ?? "" });
  }, [fbQ.data]);
  const saveFb = useMutation({
    mutationFn: () => saveFeedback({ school_id: schoolId, session_id: session.id, ...fb }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["feedback", session.id] }); toast.success("Bitácora guardada"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <CardContent className="space-y-4 pt-6">
          {drillsQ.isLoading ? <LoadingRows /> : !current ? (
            <EmptyState title="Sesión sin plan" description="Añade tareas en la pestaña Plan de sesión." />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant="outline">{PHASES.find((p) => p.id === current.phase)?.label} · Tarea {idx + 1} de {order.length}</Badge>
                {order[idx + 1] ? <span className="text-xs text-muted-foreground">Siguiente: {order[idx + 1]?.name}</span> : null}
              </div>
              <h2 className="font-display text-2xl font-semibold">{current.name}</h2>
              <p className={`text-center font-display text-7xl font-bold tabular-nums ${left === 0 ? "text-destructive" : "text-primary"}`}>{mm}:{ss}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="lg" onClick={() => setRunning((r) => !r)}>{running ? <><Pause className="size-5" /> Pausar</> : <><Play className="size-5" /> Iniciar</>}</Button>
                <Button size="lg" variant="outline" onClick={() => { setRunning(false); setLeft(current.duration_min * 60); }}><RotateCcw className="size-5" /></Button>
                <Button size="lg" variant="outline" disabled={idx >= order.length - 1} onClick={() => setIdx((i) => i + 1)}><SkipForward className="size-5" /> Siguiente</Button>
              </div>
              {current.instructions ? <p className="whitespace-pre-line rounded-lg bg-muted/40 p-3 text-sm">{current.instructions}</p> : null}
              {current.materials ? <p className="text-sm text-muted-foreground">Material: {current.materials}</p> : null}
              <div className="flex flex-wrap gap-1.5">
                {order.map((d, i) => (
                  <button key={d.id} onClick={() => setIdx(i)} className={`rounded-full border px-2.5 py-1 text-xs ${i === idx ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>
                    {i + 1}. {d.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Asistencia</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {roster.length === 0 ? <p className="text-sm text-muted-foreground">No hay jugadores activos asociados a esta sesión.</p> : roster.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2">
              <span className="truncate text-sm">{p.full_name}</span>
              <div className="flex gap-1">
                {(Object.keys(ATTENDANCE_STATUS_LABEL) as AttendanceStatus[]).map((st) => (
                  <Button key={st} size="sm" variant={marks[p.id] === st ? "default" : "outline"} className="h-8 px-2 text-xs"
                    onClick={() => setMarks((m) => ({ ...m, [p.id]: st }))}>
                    {ATTENDANCE_STATUS_LABEL[st].slice(0, 1)}
                  </Button>
                ))}
              </div>
            </div>
          ))}
          {roster.length ? <Button className="mt-2 w-full" onClick={() => saveAtt.mutate()} disabled={saveAtt.isPending}>Guardar asistencia</Button> : null}
          <p className="text-xs text-muted-foreground">P = Presente · A = Ausente · J = Justificado</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Bitácora post-entrenamiento</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Stars label="Intensidad" value={fb.intensity} onChange={(v) => setFb({ ...fb, intensity: v })} />
          <Stars label="Cumplimiento del objetivo" value={fb.objective_rating} onChange={(v) => setFb({ ...fb, objective_rating: v })} />
          <div className="space-y-1.5"><Label>Jugadores destacados</Label><Input value={fb.standout_players} onChange={(e) => setFb({ ...fb, standout_players: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Requieren refuerzo</Label><Input value={fb.needs_work_players} onChange={(e) => setFb({ ...fb, needs_work_players: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Notas para la próxima sesión</Label><Textarea rows={3} value={fb.notes} onChange={(e) => setFb({ ...fb, notes: e.target.value })} maxLength={1500} /></div>
          <Button className="w-full" onClick={() => saveFb.mutate()} disabled={saveFb.isPending}>Guardar bitácora</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Stars({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label>{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n}`}
            className={`text-xl ${n <= value ? "text-primary" : "text-muted-foreground/40"}`}>★</button>
        ))}
      </div>
    </div>
  );
}
