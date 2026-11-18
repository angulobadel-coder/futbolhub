import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarPlus, CheckCircle2, Plus, Wallet } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { listCategories, listPlayers } from "@/lib/api/school-data";
import {
  createCharges,
  listPayments,
  markPaid,
  markUnpaid,
  removePayment,
  PAYMENT_METHOD_LABEL,
  type Payment,
  type PaymentMethod,
} from "@/lib/api/payments";
import {
  formatCOP,
  paymentStatus,
  PAYMENT_STATUS_LABEL,
  summarizePayments,
  type PaymentStatus,
} from "@/lib/rules/payments";
import { useTenant } from "@/lib/tenant";
import { useSchoolSettings } from "@/lib/api/settings";

export const Route = createFileRoute("/_authenticated/pagos")({
  head: () => ({
    meta: [
      { title: "Pagos y mensualidades — FútbolGestión" },
      { name: "description", content: "Control de mensualidades, cobros y cartera de la escuela." },
      { property: "og:title", content: "Pagos y mensualidades — FútbolGestión" },
      { property: "og:description", content: "Control de mensualidades y cartera de la escuela." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentsPage,
});

const today = () => new Date().toISOString().slice(0, 10);
const selectCls =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";

function PaymentsPage() {
  const { school } = useTenant();
  const schoolId = school?.id ?? "";
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "todos">("todos");
  const [search, setSearch] = useState("");
  const [monthlyOpen, setMonthlyOpen] = useState(false);
  const [singleOpen, setSingleOpen] = useState(false);
  const [paying, setPaying] = useState<Payment | null>(null);

  const q = useQuery({
    queryKey: ["payments", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const [payments, players, categories] = await Promise.all([
        listPayments(schoolId),
        listPlayers(schoolId),
        listCategories(schoolId),
      ]);
      return { payments, players, categories };
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["payments", schoolId] });
  const toggle = useMutation({
    mutationFn: (p: Payment) => markUnpaid(p.id),
    onSuccess: () => {
      toast.success("Pago revertido a pendiente");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => removePayment(id),
    onSuccess: () => {
      toast.success("Cobro eliminado");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const t = today();
  const data = q.data;
  const playerName = useMemo(
    () => new Map((data?.players ?? []).map((p) => [p.id, p.full_name])),
    [data],
  );

  if (q.isLoading) return <LoadingRows rows={6} />;
  if (q.error) return <ErrorState message={(q.error as Error).message} />;
  if (!data) return null;

  const summary = summarizePayments(data.payments, t);
  const rows = data.payments.filter((p) => {
    const s = paymentStatus(p, t);
    if (statusFilter !== "todos" && s !== statusFilter) return false;
    const name = playerName.get(p.player_id) ?? "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pagos y mensualidades"
        description="Genera las mensualidades, registra los pagos recibidos y controla quién está al día."
        actions={
          <>
            <Button variant="outline" onClick={() => setSingleOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Cobro individual
            </Button>
            <Button onClick={() => setMonthlyOpen(true)}>
              <CalendarPlus className="mr-1 h-4 w-4" /> Generar mensualidades
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Recaudado" value={formatCOP(summary.collected)} icon={CheckCircle2} />
        <StatCard label="Por cobrar" value={formatCOP(summary.pending)} icon={Wallet} />
        <StatCard
          label="Vencido"
          value={formatCOP(summary.overdue)}
          hint={`${summary.overdueCount} cobros en mora`}
          icon={AlertTriangle}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Buscar jugador…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <select
          className={`${selectCls} sm:w-48`}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | "todos")}
        >
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="vencido">Vencidos</option>
          <option value="pagado">Pagados</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No hay cobros"
          description="Genera las mensualidades del mes para empezar a llevar el control."
        />
      ) : (
        <Card className="border-border/70 bg-card/80">
          <CardContent className="divide-y divide-border/60 p-0">
            {rows.map((p) => {
              const s = paymentStatus(p, t);
              return (
                <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <div className="min-w-48 flex-1">
                    <p className="font-medium">{playerName.get(p.player_id) ?? "Jugador"}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.concept}
                      {p.period ? ` · ${p.period}` : ""} · vence {p.due_date}
                      {p.paid_at
                        ? ` · pagado ${p.paid_at}${p.method ? ` (${PAYMENT_METHOD_LABEL[p.method]})` : ""}`
                        : ""}
                    </p>
                  </div>
                  <span className="font-display font-semibold">{formatCOP(p.amount)}</span>
                  <Badge
                    variant={s === "pagado" ? "default" : s === "vencido" ? "destructive" : "outline"}
                  >
                    {PAYMENT_STATUS_LABEL[s]}
                  </Badge>
                  {p.paid_at ? (
                    <Button size="sm" variant="ghost" onClick={() => toggle.mutate(p)}>
                      Revertir
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => setPaying(p)}>
                      Registrar pago
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("¿Eliminar este cobro?")) del.mutate(p.id);
                    }}
                  >
                    Eliminar
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <MonthlyDialog
        open={monthlyOpen}
        onOpenChange={setMonthlyOpen}
        schoolId={schoolId}
        players={data.players}
        categories={data.categories}
        onDone={refresh}
      />
      <SingleDialog
        open={singleOpen}
        onOpenChange={setSingleOpen}
        schoolId={schoolId}
        players={data.players}
        onDone={refresh}
      />
      <PayDialog payment={paying} onClose={() => setPaying(null)} onDone={refresh} />
    </div>
  );
}

type Players = Awaited<ReturnType<typeof listPlayers>>;
type Categories = Awaited<ReturnType<typeof listCategories>>;

function MonthlyDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schoolId: string;
  players: Players;
  categories: Categories;
  onDone: () => void;
}) {
  const month = today().slice(0, 7);
  const [period, setPeriod] = useState(month);
  const settings = useSchoolSettings(props.schoolId).data;
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("10");
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!settings || touched) return;
    if (settings.monthly_fee) setAmount(String(settings.monthly_fee));
    setDueDay(String(settings.payment_due_day));
  }, [settings, touched, props.open]);
  const [categoryId, setCategoryId] = useState("");

  const targets = props.players.filter(
    (p) => p.status === "activo" && (!categoryId || p.category_id === categoryId),
  );

  const m = useMutation({
    mutationFn: () => {
      const value = Number(amount);
      const day = Math.min(28, Math.max(1, Number(dueDay) || 10));
      if (!Number.isInteger(value) || value <= 0) throw new Error("Ingresa un valor válido");
      if (!/^\d{4}-\d{2}$/.test(period)) throw new Error("Selecciona el mes");
      return createCharges(
        props.schoolId,
        targets.map((p) => ({
          player_id: p.id,
          concept: "Mensualidad",
          period,
          amount: value,
          due_date: `${period}-${String(day).padStart(2, "0")}`,
        })),
      );
    },
    onSuccess: (n) => {
      toast.success(n > 0 ? `${n} mensualidades generadas` : "Esas mensualidades ya existían");
      props.onDone();
      props.onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generar mensualidades</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Mes</Label>
              <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Día límite de pago</Label>
              <Input type="number" min={1} max={28} value={dueDay} onChange={(e) => { setTouched(true); setDueDay(e.target.value); }} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Valor (COP)</Label>
            <Input type="number" min={1} placeholder="80000" value={amount} onChange={(e) => { setTouched(true); setAmount(e.target.value); }} />
          </div>
          <div className="space-y-1">
            <Label>Categoría</Label>
            <select className={selectCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Todas las categorías</option>
              {props.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted-foreground">
            Se creará un cobro para {targets.length} jugadores activos. Los que ya tengan la
            mensualidad de ese mes no se duplican.
          </p>
          <Button className="w-full" disabled={m.isPending || targets.length === 0} onClick={() => m.mutate()}>
            Generar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SingleDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  schoolId: string;
  players: Players;
  onDone: () => void;
}) {
  const [playerId, setPlayerId] = useState("");
  const [concept, setConcept] = useState("Inscripción");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState(today());

  const m = useMutation({
    mutationFn: () => {
      const value = Number(amount);
      if (!playerId) throw new Error("Selecciona un jugador");
      if (!concept.trim()) throw new Error("Escribe el concepto");
      if (!Number.isInteger(value) || value <= 0) throw new Error("Ingresa un valor válido");
      return createCharges(props.schoolId, [
        { player_id: playerId, concept: concept.trim().slice(0, 80), period: null, amount: value, due_date: due },
      ]);
    },
    onSuccess: () => {
      toast.success("Cobro creado");
      props.onDone();
      props.onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cobro individual</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Jugador</Label>
            <select className={selectCls} value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
              <option value="">Selecciona…</option>
              {props.players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Concepto</Label>
            <Input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Uniforme, torneo…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Valor (COP)</Label>
              <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Fecha límite</Label>
              <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            </div>
          </div>
          <Button className="w-full" disabled={m.isPending} onClick={() => m.mutate()}>
            Crear cobro
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PayDialog(props: { payment: Payment | null; onClose: () => void; onDone: () => void }) {
  const [date, setDate] = useState(today());
  const [method, setMethod] = useState<PaymentMethod>("efectivo");
  const m = useMutation({
    mutationFn: () => markPaid(props.payment!.id, date, method),
    onSuccess: () => {
      toast.success("Pago registrado");
      props.onDone();
      props.onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={!!props.payment} onOpenChange={(v) => !v && props.onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
        </DialogHeader>
        {props.payment ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {props.payment.concept} · {formatCOP(props.payment.amount)}
            </p>
            <div className="space-y-1">
              <Label>Fecha de pago</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Medio de pago</Label>
              <select className={selectCls} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                {Object.entries(PAYMENT_METHOD_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <Button className="w-full" disabled={m.isPending} onClick={() => m.mutate()}>
              Confirmar pago
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
