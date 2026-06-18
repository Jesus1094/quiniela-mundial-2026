import Link from "next/link";
import QuePasaSi from "./QuePasaSi";
import { createServerClient } from "@/lib/supabase/server";
import { GRUPO_NOMBRE } from "@/lib/constants";
import type { Match } from "@/lib/matches";

export const dynamic = "force-dynamic";

export default async function QuePasaSiPage() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("matches")
    .select(
      "id, grupo, equipo_local, equipo_visitante, kickoff, marcador_local, marcador_visitante, cierre_override, orden"
    )
    .order("orden", { ascending: true });

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <div className="flex items-center justify-between">
        <Link href="/grupos" className="font-sans text-sm text-navy/60 hover:text-rojo">
          ← Posiciones actuales
        </Link>
        <Link href="/tabla" className="font-sans text-sm text-navy/60 hover:text-rojo">
          Tabla de la quiniela →
        </Link>
      </div>

      <header className="mb-5 mt-4">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-rojo">
          {GRUPO_NOMBRE}
        </p>
        <h1 className="mt-1 font-serif text-4xl font-bold text-navy">
          ¿Qué pasa si…?
        </h1>
        <p className="mt-2 font-sans text-sm text-navy/70">
          Los partidos ya jugados están <strong>fijos</strong>. Llena los
          marcadores de los partidos que faltan y mira cómo quedarían las
          posiciones y los mejores terceros, con los criterios de desempate FIFA
          2026. <strong>Es solo una simulación tuya</strong>: no cambia ningún
          resultado real ni la quiniela.
        </p>
      </header>

      <QuePasaSi matches={(data ?? []) as Match[]} />
    </main>
  );
}
