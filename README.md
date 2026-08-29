# FútbolGestión

Plataforma web multi-escuela para la gestión integral de escuelas de fútbol.

## Estado actual (etapa 1 — núcleo)

Implementado y conectado a base de datos persistente:

- Landing page pública.
- Autenticación por correo y contraseña (confirmación automática).
- Roles por escuela: `superadmin`, `director`, `coach`, `guardian`, `player`.
- Multi-tenant con aislamiento de datos por escuela (Row Level Security).
- Selector de escuela y navegación por rol.
- Dashboard con indicadores y alertas basadas en reglas.
- Módulos CRUD: jugadores, entrenadores, categorías, equipos.
- Escuela demo: **Academia Fútbol Futuro** con datos ficticios.

Los módulos de entrenamientos, asistencia, calendario, partidos, torneos,
estadísticas, evaluaciones, pagos, comunicaciones, notificaciones y reportes
aparecen en la navegación marcados como *pronto*; no simulan funcionalidad.

## Arquitectura

```
src/
  routes/                 Rutas (TanStack Router, file-based)
    index.tsx             Landing pública
    auth.tsx              Login / registro
    _authenticated/       Subárbol protegido (gate de sesión)
  components/
    layout/app-shell.tsx  Sidebar + shell de la app
    common/               Estados, encabezados, tarjetas de indicador
    ui/                   Primitivas shadcn
  lib/
    api/client.ts         Cliente de datos y tipos
    api/tenancy.ts        Membresías, roles y permisos
    api/school-data.ts    Acceso a datos por escuela (lectura/escritura)
    rules/alerts.ts       Motor de reglas de alertas (modular, ampliable)
    tenant.tsx            Contexto de escuela activa
```

Separación: presentación (`components`, `routes`) · lógica de negocio
(`lib/rules`) · acceso a datos (`lib/api`) · autenticación (backend + gate de
rutas).

## Modelo de datos

`schools`, `profiles`, `user_roles`, `categories`, `coaches`, `teams`,
`players`. Toda entidad deportiva referencia `school_id`. Las políticas de
acceso usan funciones `is_school_member` y `can_manage_school`.

## Desarrollo

```bash
bun install
bun run dev
```

Las credenciales del backend se inyectan por variables de entorno
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`); no hay claves secretas
en el frontend.

## Próximos pasos

1. Entrenamientos + asistencia (con reglas de baja asistencia).
2. Calendario y partidos.
3. Evaluaciones y estadísticas.
4. Pagos y automatización de vencimientos.
5. Comunicaciones, notificaciones y reportes.
