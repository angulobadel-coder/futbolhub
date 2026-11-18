import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, CreditCard, MessageCircle, Save, Trophy } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  saveSchoolIdentity,
  saveSchoolSettings,
  useSchoolSettings,
  type SchoolSettings,
} from "@/lib/api/settings";
import { clampDueDay, clampThreshold, parseMoney } from "@/lib/rules/settings";
import { useTenant } from "@/lib/tenant";

export const Route = createFileRoute("/_authenticated/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración de la escuela — FútbolGestión" },
      { name: "description", content: "Datos de la escuela, parámetros deportivos, pagos y comunicaciones." },
      { property: "og:title", content: "Configuración de la escuela — FútbolGestión" },
      { property: "og:description", content: "Ajusta identidad, temporada, mensualidades y avisos de tu escuela." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { school } = useTenant();
  const q = useSchoolSettings(school?.id);

  if (!school) return <EmptyState title="Selecciona una escuela" description="Elige una escuela para configurarla." />;
  return (
    <div className="space-y-6">
      <PageHeader title="Configuración" description={`Ajustes de ${school.name}`} />
      {q.isLoading ? (
        <LoadingRows />
      ) : q.error ? (
        <ErrorState message={(q.error as Error).message} />
      ) : q.data ? (
        <SettingsForm key={q.data.school_id} settings={q.data} />
      ) : null}
    </div>
  );
}

function SettingsForm({ settings }: { settings: SchoolSettings }) {
  const { school } = useTenant();
  const schoolId = school!.id;
  const qc = useQueryClient();

  const [name, setName] = useState(school!.name);
  const [city, setCity] = useState(school!.city ?? "");
  const [logo, setLogo] = useState(school!.logo_url ?? "");
  const [phone, setPhone] = useState(settings.contact_phone ?? "");
  const [email, setEmail] = useState(settings.contact_email ?? "");
  const [address, setAddress] = useState(settings.address ?? "");
  const [season, setSeason] = useState(settings.season_label ?? "");
  const [threshold, setThreshold] = useState(String(settings.attendance_threshold));
  const [fee, setFee] = useState(settings.monthly_fee ? String(settings.monthly_fee) : "");
  const [dueDay, setDueDay] = useState(String(settings.payment_due_day));
  const [lateFee, setLateFee] = useState(settings.late_fee != null ? String(settings.late_fee) : "");
  const [wa, setWa] = useState(settings.whatsapp_enabled);
  const [notifyPay, setNotifyPay] = useState(settings.notify_payments);
  const [notifyAtt, setNotifyAtt] = useState(settings.notify_attendance);

  useEffect(() => {
    setName(school!.name);
    setCity(school!.city ?? "");
    setLogo(school!.logo_url ?? "");
  }, [school]);

  const done = () => {
    toast.success("Configuración guardada");
    void qc.invalidateQueries({ queryKey: ["school-settings", schoolId] });
  };

  const base = () => ({
    contact_phone: phone.trim() || null,
    contact_email: email.trim() || null,
    address: address.trim() || null,
    season_label: season.trim() || null,
    attendance_threshold: clampThreshold(Number(threshold)),
    monthly_fee: parseMoney(fee),
    payment_due_day: clampDueDay(Number(dueDay)),
    late_fee: parseMoney(lateFee),
    whatsapp_enabled: wa,
    notify_payments: notifyPay,
    notify_attendance: notifyAtt,
  });

  const saveIdentity = useMutation({
    mutationFn: async () => {
      await saveSchoolIdentity(schoolId, name, city, logo);
      await saveSchoolSettings(schoolId, base());
    },
    onSuccess: () => {
      done();
      void qc.invalidateQueries({ queryKey: ["tenancy"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const save = useMutation({
    mutationFn: async () => saveSchoolSettings(schoolId, base()),
    onSuccess: done,
    onError: (e: Error) => toast.error(e.message),
  });

  const SaveBtn = ({ identity }: { identity?: boolean }) => {
    const m = identity ? saveIdentity : save;
    return (
      <Button onClick={() => m.mutate()} disabled={m.isPending}>
        <Save className="size-4" /> {m.isPending ? "Guardando…" : "Guardar cambios"}
      </Button>
    );
  };

  return (
    <Tabs defaultValue="escuela" className="space-y-4">
      <TabsList className="flex h-auto flex-wrap">
        <TabsTrigger value="escuela"><Building2 className="mr-1 size-4" /> Escuela</TabsTrigger>
        <TabsTrigger value="deportivo"><Trophy className="mr-1 size-4" /> Deportivo</TabsTrigger>
        <TabsTrigger value="pagos"><CreditCard className="mr-1 size-4" /> Pagos</TabsTrigger>
        <TabsTrigger value="comunicaciones"><MessageCircle className="mr-1 size-4" /> Comunicaciones</TabsTrigger>
      </TabsList>

      <TabsContent value="escuela">
        <Card>
          <CardHeader>
            <CardTitle>Datos de la escuela</CardTitle>
            <CardDescription>Nombre, ciudad, escudo y contacto que ven tus usuarios.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></Field>
            <Field label="Ciudad"><Input value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} /></Field>
            <Field label="Enlace del escudo (imagen)"><Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://…" /></Field>
            <Field label="Dirección"><Input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} /></Field>
            <Field label="Teléfono de contacto"><Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} /></Field>
            <Field label="Correo de contacto"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} /></Field>
            {logo ? (
              <div className="flex items-center gap-3 sm:col-span-2">
                <img src={logo} alt="Escudo" className="size-14 rounded-md border border-border object-contain" />
                <span className="text-xs text-muted-foreground">Vista previa del escudo</span>
              </div>
            ) : null}
            <div className="sm:col-span-2"><SaveBtn identity /></div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="deportivo">
        <Card>
          <CardHeader>
            <CardTitle>Parámetros deportivos</CardTitle>
            <CardDescription>El umbral se usa en las alertas del panel y en estadísticas.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Temporada actual"><Input value={season} onChange={(e) => setSeason(e.target.value)} placeholder="2026" maxLength={40} /></Field>
            <Field label="Alerta de asistencia baja (%)"><Input type="number" min={1} max={100} value={threshold} onChange={(e) => setThreshold(e.target.value)} /></Field>
            <div className="sm:col-span-2"><SaveBtn /></div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="pagos">
        <Card>
          <CardHeader>
            <CardTitle>Mensualidades</CardTitle>
            <CardDescription>Valores que se proponen al generar las mensualidades del mes.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Field label="Mensualidad (COP)"><Input type="number" min={1} value={fee} onChange={(e) => setFee(e.target.value)} placeholder="80000" /></Field>
            <Field label="Día límite de pago"><Input type="number" min={1} max={28} value={dueDay} onChange={(e) => setDueDay(e.target.value)} /></Field>
            <Field label="Recargo por mora (COP, referencia)"><Input type="number" min={0} value={lateFee} onChange={(e) => setLateFee(e.target.value)} /></Field>
            <div className="sm:col-span-3"><SaveBtn /></div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="comunicaciones">
        <Card>
          <CardHeader>
            <CardTitle>Comunicaciones</CardTitle>
            <CardDescription>Preferencias de avisos para acudientes y jugadores.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Toggle label="Usar WhatsApp para avisos" checked={wa} onChange={setWa} />
            <Toggle label="Avisar sobre pagos pendientes" checked={notifyPay} onChange={setNotifyPay} />
            <Toggle label="Avisar sobre asistencia baja" checked={notifyAtt} onChange={setNotifyAtt} />
            <p className="text-xs text-muted-foreground">Los envíos automáticos llegarán con el módulo de notificaciones; hoy se guarda la preferencia.</p>
            <SaveBtn />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Toggle(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2 text-sm">
      {props.label}
      <Switch checked={props.checked} onCheckedChange={props.onChange} />
    </label>
  );
}
