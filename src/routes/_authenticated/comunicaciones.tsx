import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  MessageCircle,
  Send,
  Settings2,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendWhatsAppTest, whatsappStatus } from "@/lib/api/whatsapp.functions";
import { useTenant } from "@/lib/tenant";
import { GuardianCommunications } from "@/components/communications/guardian-communications";

export const Route = createFileRoute("/_authenticated/comunicaciones")({
  head: () => ({
    meta: [
      { title: "Comunicaciones — FútbolGestión" },
      {
        name: "description",
        content: "Notificaciones de WhatsApp para acudientes y jugadores de la escuela.",
      },
      { property: "og:title", content: "Comunicaciones — FútbolGestión" },
      {
        property: "og:description",
        content: "Notificaciones de WhatsApp para acudientes y jugadores de la escuela.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ComunicacionesPage,
});

function ComunicacionesPage() {
  const { role } = useTenant();
  const canSend = role === "superadmin" || role === "director" || role === "coach";

  if (role === "guardian") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Comunicaciones"
          description="Contactos de la escuela, entrenadores de tus hijos y avisos."
        />
        <GuardianCommunications />
      </div>
    );
  }

  if (!canSend) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Comunicaciones"
          description="Notificaciones de WhatsApp para tu escuela."
        />
        <EmptyState
          title="Acceso restringido"
          description="Solo los administradores y entrenadores pueden enviar comunicaciones."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comunicaciones"
        description="Envía notificaciones de WhatsApp a acudientes y jugadores de tu escuela."
      />
      <WhatsAppTestCard />
    </div>
  );
}

function WhatsAppTestCard() {
  const [phone, setPhone] = useState("");
  const send = useServerFn(sendWhatsAppTest);
  const statusFn = useServerFn(whatsappStatus);

  const status = useQuery({ queryKey: ["whatsapp-status"], queryFn: () => statusFn() });

  const m = useMutation({
    mutationFn: (to: string) => send({ data: { phone: to } }),
  });

  const configured = status.data?.configured;

  return (
    <Card className="border-border/70 bg-card/80">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <MessageCircle className="size-5" />
          </span>
          <div>
            <CardTitle className="text-base">Prueba de conexión con WhatsApp</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Envía la plantilla de prueba <code className="text-foreground">hello_world</code> de
              Meta a cualquier número para verificar la conexión.
            </p>
          </div>
        </div>
        {configured === true ? (
          <Badge className="shrink-0">Conectado</Badge>
        ) : configured === false ? (
          <Badge variant="outline" className="shrink-0 border-border/60">
            Sin configurar
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {configured === false ? (
          <div className="flex items-start gap-3 rounded-lg border border-border/70 bg-muted/40 p-3 text-sm">
            <Settings2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground">
              Falta conectar la cuenta de WhatsApp Business. Guarda las credenciales de Meta
              (token y número de teléfono) en la configuración segura del proyecto para activar
              los envíos.
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="wa-phone">Número de destino</Label>
            <Input
              id="wa-phone"
              inputMode="numeric"
              placeholder="573001234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ""))}
            />
            <p className="text-xs text-muted-foreground">
              Con código de país, sin «+», espacios ni guiones.
            </p>
          </div>
          <Button
            className="sm:w-auto"
            disabled={m.isPending || phone.length < 8 || configured === false}
            onClick={() => m.mutate(phone)}
          >
            <Send className="mr-1 size-4" />
            {m.isPending ? "Enviando…" : "Enviar mensaje de prueba"}
          </Button>
        </div>

        {m.isSuccess ? (
          <div className="flex items-start gap-3 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="font-medium">Mensaje enviado a {m.data.to}</p>
              {m.data.messageId ? (
                <p className="mt-0.5 break-all text-xs text-muted-foreground">
                  ID del mensaje: {m.data.messageId}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {m.isError ? (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
            <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p>{(m.error as Error).message}</p>
          </div>
        ) : null}

        <div className="flex items-start gap-3 rounded-lg border border-border/60 p-3 text-xs text-muted-foreground">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            Las credenciales de WhatsApp se guardan cifradas en el servidor y nunca se envían al
            navegador. Solo administradores y entrenadores autenticados pueden enviar mensajes.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
