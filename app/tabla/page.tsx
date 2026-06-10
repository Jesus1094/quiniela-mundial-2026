import Link from "next/link";
import Leaderboard, { type Fila } from "./Leaderboard";
import { createServerClient } from "@/lib/supabase/server";
import { GRUPO_NOMBRE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function TablaPage() {
  const supabase = createServerClient();

  const [{ data }, { count }] = await Promise.all([
    supabase
      .from("participants")
      .select(
        "id, nombre, pago_confirmado, scores(puntos_grupos, puntos_fases, puntos_comodin, puntos_partidos, total)"
      ),
    supabase.from("results").select("id", { count: "exact", head: true }),
  ]);

  const filas: Fila[] = (data ?? []).map((p: any) => {
    const s = Array.isArray(p.scores) ? p.scores[0] : p.scores;
    return {
      participant_id: p.id,
      nombre: p.nombre,
      pago_confirmado: p.pago_confirmado,
      puntos_grupos: s?.puntos_grupos ?? 0,
      puntos_fases: s?.puntos_fases ?? 0,
      puntos_comodin: s?.puntos_comodin ?? 0,
      puntos_partidos: s?.puntos_partidos ?? 0,
      total: s?.total ?? 0,
    };
  });

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href="/" className="font-sans text-sm text-navy/60 hover:text-rojo">
        ← Inicio
      </Link>
      <header className="mb-6 mt-4">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-rojo">
          {GRUPO_NOMBRE}
        </p>
        <h1 className="mt-1 font-serif text-4xl font-bold text-navy">
          Tabla de posiciones
        </h1>
      </header>

      <Leaderboard
        filasIniciales={filas}
        hayResultadosInicial={(count ?? 0) > 0}
      />
    </main>
  );
}
