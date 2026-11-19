import { useQuery } from "@tanstack/react-query";
import { BellRing, Mail, MapPin, MessageCircle, Phone, UserRound } from "lucide-react";

import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listCoaches, listPlayers, listTeams } from "@/lib/api/school-data";
import { getSchoolSettings } from "@/lib/api/settings";
import { listEvents } from "@/lib/api/training";
import { useTenant } from "@/lib/tenant";

const waLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "")}`;

/** Centro de comunicaciones para acudientes: contactos de la escuela, entrenadores y avisos. */
export function GuardianCommunications() {
  const { school } = useTenant();
  const schoolId = school?.id ?? "";
  const q = useQuery({
    queryKey: ["guardian-comms", schoolId],
    enabled: !!schoolId,
    queryFn: async () => {
      const [settings, players, teams, coaches, events] = await Promise.all([
        getSchoolSettings(schoolId),
        listPlayers(schoolId),
        listTeams(schoolId),
        listCoaches(schoolId).catch(() => []),
        listEvents(schoolId),
      ]);
      return { settings, players, teams, coaches, events };
    },
  });

  if (q.isLoading) return <LoadingRows rows={4} />;
  if (q.error) return <ErrorState message={(q.error as Error).message} />;
  if (!q.data) return null;
  const { settings, players, teams, coaches, events } = q.data;
  const today = new Date().toISOString().slice(0, 10);
  const agenda = events.filter((e) => e.event_date >= today).slice(0, 5);

  const row = (label: string, on: boolean) => (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2">
        <BellRing className="size-4 text-primary" />
        {label}
      </span>
      <Badge variant={on ? "default" : "outline"}>{on ? "Activo" : "Inactivo"}</Badge>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Contacto de {school?.name ?? "la escuela"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!settings.contact_phone && !settings.contact_email && !settings.address ? (
              <p className="text-muted-foreground">La escuela aún no ha publicado sus datos de contacto.</p>
            ) : null}
            {settings.contact_phone ? (
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <Phone className="size-4 text-primary" />
                  {settings.contact_phone}
                </span>
                <Button asChild size="sm" variant="outline">
                  <a href={waLink(settings.contact_phone)} target="_blank" rel="noreferrer">
                    <MessageCircle className="size-4" /> WhatsApp
                  </a>
                </Button>
              </div>
            ) : null}
            {settings.contact_email ? (
              <a href={`mailto:${settings.contact_email}`} className="flex items-center gap-2 hover:text-primary">
                <Mail className="size-4 text-primary" />
                {settings.contact_email}
              </a>
            ) : null}
            {settings.address ? (
              <p className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                {settings.address}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/80">
          <CardHeader>
            <CardTitle className="text-base">Avisos que recibes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {row("Canal WhatsApp", settings.whatsapp_enabled)}
            {row("Alertas de asistencia", settings.notify_attendance)}
            {row("Recordatorios de pago", settings.notify_payments)}
            {players.map((p) => (
              <p key={p.id} className="text-xs text-muted-foreground">
                Número registrado para {p.full_name}: {p.guardian_phone ?? "sin número, pídelo a la escuela"}
              </p>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Entrenadores de mis hijos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {players.length === 0 ? (
            <EmptyState title="Sin jugadores asociados" description="Pide a la escuela que vincule tu cuenta." />
          ) : (
            players.map((p) => {
              const team = teams.find((t) => t.id === p.team_id);
              const coach = coaches.find((c) => c.id === team?.coach_id);
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
                >
                  <div>
                    <p className="font-medium">{p.full_name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <UserRound className="size-3" />
                      {team?.name ?? "Sin equipo"} · {coach?.full_name ?? "Entrenador por asignar"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {coach?.phone ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={waLink(coach.phone)} target="_blank" rel="noreferrer">
                          <MessageCircle className="size-4" /> Escribir
                        </a>
                      </Button>
                    ) : null}
                    {coach?.email ? (
                      <Button asChild size="sm" variant="ghost">
                        <a href={`mailto:${coach.email}`}>
                          <Mail className="size-4" /> Correo
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/80">
        <CardHeader>
          <CardTitle className="text-base">Anuncios y agenda de la escuela</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {agenda.length === 0 ? (
            <p className="text-muted-foreground">Sin anuncios próximos.</p>
          ) : (
            agenda.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <div>
                  <p className="font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.event_date} · {e.location ?? "Sin sede"}
                  </p>
                </div>
                <Badge variant="outline">{e.type}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
