import Link from "next/link";
import GruposLive from "./GruposLive";
import { createServerClient } from "@/lib/supabase/server";
import { GRUPO_NOMBRE } from "@/lib/constants";
import type { Match } from "@/lib/matches";

export const dynamic = "force-dynamic";

export default async function GruposPage() {
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
        <Link href="/" className="font-sans text-sm text-navy/60 hover:text-rojo">
          ← Inicio
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
          Simulador de grupos
        </h1>
        <p className="mt-2 font-sans text-sm text-navy/70">
          Posiciones con los resultados cargados hasta ahora. Desempates por{" "}
          <strong>criterios FIFA 2026</strong>: head-to-head (pts → dif. goles →
          goles), luego dif. de goles general y goles generales.
        </p>
        <div className="mt-3 flex flex-wrap gap-3 font-sans text-xs text-navy/60">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-green-200" />{" "}
            1º–2º (clasifican)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-amber-200" /> 3º
            (mejor tercero)
          </span>
        </div>
        <Link
          href="/que-pasa-si"
          className="mt-4 inline-block rounded-xl bg-rojo px-5 py-2.5 font-sans text-sm font-bold text-white transition hover:bg-rojo/90"
        >
          🔮 Probar escenarios: ¿qué pasa si…?
        </Link>
      </header>

      <GruposLive initialMatches={(data ?? []) as Match[]} />

      <p className="mt-6 font-sans text-xs text-navy/50">
        Nota: el juego limpio (tarjetas) y el ranking FIFA no se calculan aquí;
        los empates que llegan hasta ese punto se marcan con ⚖️. Posiciones
        provisionales según resultados cargados.
      </p>
    </main>
  );
}
