import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Megaphone,
  Shield,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-cancha.jpg";

const MODULES = [
  { icon: Users, title: "Jugadores", text: "Fichas, estados y acudientes." },
  { icon: Shield, title: "Categorías y equipos", text: "Organización deportiva completa." },
  { icon: CalendarDays, title: "Calendario", text: "Entrenamientos, partidos y torneos." },
  { icon: ClipboardCheck, title: "Asistencia", text: "Registro rápido en pocos pasos." },
  { icon: BarChart3, title: "Indicadores", text: "Estadísticas y evolución por jugador." },
  { icon: CreditCard, title: "Pagos", text: "Matrículas, mensualidades y alertas." },
];

const BENEFITS = [
  {
    icon: Building2,
    title: "Gestión centralizada",
    text: "Toda la información administrativa y deportiva de tu escuela en un solo lugar.",
  },
  {
    icon: Zap,
    title: "Automatización real",
    text: "Indicadores, alertas y recordatorios calculados a partir de tus propios datos.",
  },
  {
    icon: Bell,
    title: "Alertas accionables",
    text: "La plataforma detecta situaciones que requieren seguimiento y las explica.",
  },
  {
    icon: Megaphone,
    title: "Comunicación",
    text: "Comunicados por escuela, categoría, equipo o jugador.",
  },
  {
    icon: Trophy,
    title: "Seguimiento deportivo",
    text: "Evaluaciones, estadísticas y evolución de cada jugador.",
  },
  {
    icon: Shield,
    title: "Multi-escuela",
    text: "Arquitectura preparada para operar varias escuelas con datos aislados.",
  },
];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FútbolGestión — Gestiona tu escuela de fútbol desde un solo lugar" },
      {
        name: "description",
        content:
          "Centraliza jugadores, entrenamientos, asistencia, pagos, estadísticas y comunicación de tu escuela de fútbol en una plataforma inteligente.",
      },
      { property: "og:title", content: "FútbolGestión — Gestiona tu escuela de fútbol" },
      {
        property: "og:description",
        content:
          "Plataforma inteligente para la gestión integral de escuelas de fútbol: jugadores, asistencia, pagos, estadísticas y comunicación.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <span className="font-display text-xl font-semibold tracking-tight">
          Fútbol<span className="text-primary">Gestión</span>
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link to="/auth">Iniciar sesión</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link to="/activar">Activar invitación</Link>
          </Button>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <img
            src={heroImage}
            alt="Entrenamiento de fútbol juvenil bajo luces de estadio"
            width={1600}
            height={1000}
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
          <div className="surface-grid absolute inset-0 opacity-40" />
          <div className="relative mx-auto max-w-6xl px-4 pb-24 pt-20 sm:px-6 sm:pb-32 sm:pt-28">
            <p className="text-sm font-medium uppercase tracking-widest text-primary">
              Plataforma multi-escuela
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
              Gestiona tu escuela de fútbol <span className="text-gradient-pitch">desde un solo lugar</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Centraliza jugadores, entrenamientos, asistencia, pagos, estadísticas y comunicación
              en una plataforma inteligente que apoya tus decisiones.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <a href="#modulos">Conocer plataforma</a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/auth">Iniciar sesión</Link>
              </Button>
            </div>
            <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {["Multi-tenant por escuela", "Roles por usuario", "Alertas basadas en datos"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-primary" /> {item}
                  </li>
                ),
              )}
            </ul>
          </div>
        </section>

        {/* Beneficios */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            Menos planillas, más decisiones
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            La plataforma procesa la información que registras y la convierte en indicadores,
            alertas y recomendaciones explicables.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="rounded-xl border border-border/70 bg-card/70 p-6 transition-colors hover:border-primary/40"
              >
                <span className="inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                  <b.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold">{b.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{b.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Módulos */}
        <section id="modulos" className="border-y border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="text-2xl font-semibold sm:text-3xl">Todos los módulos, un mismo sistema</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {MODULES.map((m) => (
                <div key={m.title} className="flex items-start gap-4 rounded-xl border border-border/70 bg-background/60 p-5">
                  <m.icon className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <h3 className="font-medium">{m.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{m.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Escalabilidad */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold sm:text-3xl">
                Preparada para una escuela. Lista para cien.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Cada escuela opera con sus propios usuarios, jugadores, entrenadores y pagos, con
                aislamiento de datos a nivel de base de datos. La arquitectura modular permite
                incorporar app móvil, notificaciones push, integraciones de pago e inteligencia
                predictiva sin reconstruir la plataforma.
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card/70 p-6 font-mono text-sm text-muted-foreground">
              <p className="text-foreground">PLATAFORMA</p>
              {["Escuela A", "Escuela B", "Escuela C"].map((s) => (
                <div key={s} className="ml-4 mt-2 border-l border-border pl-3">
                  <p className="text-foreground">├── {s}</p>
                  <p>│&nbsp;&nbsp;&nbsp;└── usuarios · jugadores · equipos · pagos</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
            <h2 className="text-2xl font-semibold sm:text-3xl">Empieza hoy con la escuela demo</h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              Crea tu cuenta y explora Academia Fútbol Futuro con datos ficticios precargados.
            </p>
            <Button size="lg" className="mt-6" asChild>
              <Link to="/activar">Activar invitación</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>
            Fútbol<span className="text-primary">Gestión</span>
          </span>
          <span>Gestión integral de escuelas de fútbol.</span>
        </div>
      </footer>
    </div>
  );
}
