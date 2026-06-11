# Quiniela Mundial 2026 ⚽

Single Page App (Next.js 14 + Supabase) para una quiniela privada de la Copa Mundial 2026. Cada participante predice una sola vez antes de la fecha de corte; el administrador carga resultados y el sistema recalcula los puntajes en tiempo real.

- **Stack:** Next.js 14 (App Router) · Supabase (Postgres + RLS + Realtime) · Tailwind CSS · date-fns
- **Fecha de corte (predicciones de torneo):** 11 de junio de 2026, 12:30 PM (America/Mexico_City)
- **Puntaje máximo posible:** 99 pts

---

## 1. Setup de Supabase

### 1.1 Crear el proyecto
1. Entra a [supabase.com](https://supabase.com) → **New project**.
2. Anota la contraseña de la base de datos y espera a que el proyecto quede listo.

### 1.2 Correr la migración
La migración crea todas las tablas, las políticas RLS, la función `calculate_scores()` y el trigger.

**Opción A — SQL Editor (más simple):**
1. En el dashboard de Supabase → **SQL Editor** → **New query**.
2. Pega el contenido de [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql).
3. **Run**.

**Opción B — Supabase CLI:**
```bash
supabase link --project-ref <tu-project-ref>
supabase db push
```

### 1.3 Habilitar Realtime en `scores`
La tabla de posiciones se actualiza en vivo. La migración ya agrega `scores` y `results` a la publicación `supabase_realtime`, pero verifica en el dashboard:

1. **Database → Replication → `supabase_realtime`**.
2. Confirma que las tablas **`scores`** y **`results`** están activadas.

> Si tu proyecto no tiene la publicación, las dos últimas líneas del SQL la actualizan. Si aún así no ves cambios en vivo, actívalas manualmente en esa pantalla.

### 1.4 Obtener las llaves
En **Project Settings → API**:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key (secreta) → `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. Variables de entorno

Copia `.env.local.example` a `.env.local` y rellena:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...     # SOLO servidor — nunca al cliente
ADMIN_PASSWORD=una-contraseña-fuerte
NEXT_PUBLIC_GRUPO_NOMBRE=Dayston Consultores
NEXT_PUBLIC_CUOTA=200
```

> ⚠️ La `service_role` key salta RLS. Sólo se usa en Server Actions del panel `/admin`; nunca se importa desde componentes de cliente.

---

## 3. Correr en local

```bash
npm install
npm run dev
```

Abre http://localhost:3000

---

## 4. Deploy en Vercel

1. Sube el repo a GitHub.
2. En [vercel.com](https://vercel.com) → **New Project** → importa el repo.
3. En **Settings → Environment Variables** agrega las 6 variables del paso 2
   (las `NEXT_PUBLIC_*` también son necesarias en build).
4. **Deploy**.

No se requiere configuración extra: el `service_role` se usa sólo en el servidor.

---

## 5. Cómo usar el panel `/admin`

1. Entra a `https://tu-dominio/admin`.
2. Escribe la contraseña (`ADMIN_PASSWORD`). La sesión dura 8 horas (cookie httpOnly).

**Pestaña Resultados**
- Selecciona el **tipo** (ganador de cada grupo A–L, o 4º lugar / 3er lugar / Subcampeón / Campeón) y el **equipo ganador**.
- Guarda. El trigger `calculate_scores()` recalcula automáticamente los puntajes de **todos** los participantes.
- La lista de abajo muestra qué resultados ya están cargados (✓).
- El **comodín no se carga como resultado**: se otorga automáticamente (10 pts) si el equipo elegido como comodín aparece como ganador en algún resultado de fase (cuarto / tercero / subcampeón / campeón).

**Pestaña Participantes**
- Tabla con nombre, email, si completó sus predicciones (17/17) y puntos.
- Botón para confirmar / desconfirmar el pago de cada quien (control manual de los $200).
- Contador de participantes, pagos confirmados y pozo.

**Pestaña Premio**
- Reparto del pozo en tiempo real: 60% / 25% / 15%.

---

## 6. Link para compartir con participantes

Cada participante se registra en `/registro` (nombre + email). Al registrarse se le redirige a su quiniela personal:

```
https://tu-dominio/quiniela/[id]
```

Ese link es **personal e idempotente**: el participante puede volver a él para editar sus predicciones hasta la fecha de corte. Conviene pedirles que lo guarden. Si vuelven a `/registro` con el mismo correo, el sistema les ofrece el enlace a su quiniela existente.

La tabla pública de posiciones está en `/tabla` (badge 🔴 EN VIVO cuando hay resultados cargados).

---

## 7. Sistema de puntos

| Predicción            | Puntos        |
|-----------------------|---------------|
| Ganador de grupo (×12)| 3 c/u (máx 36)|
| 4º lugar              | 5             |
| 3er lugar             | 8             |
| Subcampeón            | 15            |
| Campeón               | 25            |
| Comodín (llega a 4tos+)| 10           |
| **Máximo**            | **99**        |

---

## 8. Notas de seguridad

- **RLS activo** en las 4 tablas. `SELECT` público; `INSERT`/`UPDATE` de predicciones y registro **sólo antes del corte** (validado en Postgres con `cutoff_ts()`, no sólo en el cliente).
- Resultados y confirmación de pago: sólo vía `service_role` desde Server Actions del admin.
- La fecha de corte está fijada tanto en la app (`lib/constants.ts`) como en la base de datos (`cutoff_ts()`); si la cambias, ajústala en ambos lugares.
