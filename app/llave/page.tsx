import Link from "next/link";
import LlaveLive from "./LlaveLive";
import { createServerClient } from "@/lib/supabase/server";
import { GRUPO_NOMBRE } from "@/lib/constants";
import type { Match } from "@/lib/matches";

export const dynamic = "force-dynamic";

export default async function LlavePage() {
  const supabase = createServerClient();
  const [{ data: matches }, { data: ko }, { data: thirds }] = await Promise.all([
    supabase
      .from("matches")
      .select(
        "id, grupo, equipo_local, equipo_visitante, kickoff, marcador_local, marcador_visitante, cierre_override, orden"
      )
      .order("orden", { ascending: true }),
    supabase
      .from("knockout_matches")
      .select("num, marcador_local, marcador_visitante, ganador"),
    supabase.from("knockout_thirds_override").select("match_num, equipo"),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <div className="flex items-center justify-between">
        <Link href="/" className="font-sans text-sm text-navy/60 hover:text-rojo">
          ← Inicio
        </Link>
        <Link href="/grupos" className="font-sans text-sm text-navy/60 hover:text-rojo">
          Grupos →
        </Link>
      </div>

      <header className="mb-5 mt-4">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-rojo">
          {GRUPO_NOMBRE}
        </p>
        <h1 className="mt-1 font-serif text-4xl font-bold text-navy">
          Llave — fase final
        </h1>
        <p className="mt-2 font-sans text-sm text-navy/70">
          16avos → final. Los puestos de grupo (1º/2º) y los mejores terceros se
          llenan solos desde las posiciones; cada llave avanza al cargar el
          ganador. Se actualiza en vivo.
        </p>
      </header>

      <LlaveLive
        initialMatches={(matches ?? []) as Match[]}
        initialKo={(ko ?? []) as any}
        initialThirds={(thirds ?? []) as any}
      />
    </main>
  );
}
