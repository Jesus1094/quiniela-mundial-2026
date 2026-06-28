import Link from "next/link";
import { redirect } from "next/navigation";
import EliminatoriasForm from "./EliminatoriasForm";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { GRUPO_NOMBRE } from "@/lib/constants";
import type { Match } from "@/lib/matches";
import { BRACKET, construirCuadro, type KoState, type ResolvedGame } from "@/lib/knockout";

export const dynamic = "force-dynamic";

const MSEL =
  "id, grupo, equipo_local, equipo_visitante, kickoff, marcador_local, marcador_visitante, cierre_override, orden";

export default async function EliminatoriasPage({
  params,
}: {
  params: { id: string };
}) {
  const sid = getSession();
  if (!sid) redirect("/login");
  if (sid !== params.id) redirect(`/quiniela/${sid}`);

  const supabase = createServerClient();
  const admin = createAdminClient();

  const { data: participant } = await supabase
    .from("participants")
    .select("id")
    .eq("id", params.id)
    .maybeSingle();
  if (!participant) redirect("/login");

  const [{ data: matches }, { data: ko }, { data: thirds }, { data: preds }, { data: score }] =
    await Promise.all([
      supabase.from("matches").select(MSEL).order("orden", { ascending: true }),
      supabase.from("knockout_matches").select("num, marcador_local, marcador_visitante, ganador"),
      supabase.from("knockout_thirds_override").select("match_num, equipo"),
      admin
        .from("knockout_predictions")
        .select("match_num, pred_local, pred_visitante")
        .eq("participant_id", params.id),
      supabase.from("scores").select("puntos_partidos").eq("participant_id", params.id).maybeSingle(),
    ]);

  const cuadro = construirCuadro(
    (matches ?? []) as Match[],
    (ko ?? []) as KoState[],
    (thirds ?? []) as { match_num: number; equipo: string }[]
  );
  const games: ResolvedGame[] = BRACKET.map((b) => cuadro.get(b.num)!);

  const iniciales: Record<number, { pred_local: number; pred_visitante: number }> = {};
  for (const p of preds ?? []) {
    iniciales[p.match_num] = { pred_local: p.pred_local, pred_visitante: p.pred_visitante };
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <div className="flex items-center justify-between">
        <Link href={`/quiniela/${params.id}`} className="font-sans text-sm text-navy/60 hover:text-rojo">
          ← Mi quiniela
        </Link>
        <Link href="/llave" className="font-sans text-sm text-navy/60 hover:text-rojo">
          Ver la llave →
        </Link>
      </div>

      <header className="mb-6 mt-4">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-rojo">
          {GRUPO_NOMBRE}
        </p>
        <h1 className="mt-1 font-serif text-4xl font-bold text-navy">
          Pronósticos — fase final
        </h1>
        <p className="mt-2 font-sans text-sm text-navy/70">
          Predice el marcador de cada partido de eliminatoria. Mismo puntaje:{" "}
          <strong>5 pts</strong> exacto, <strong>2 pts</strong> resultado. Cada
          llave se abre <strong>cuando se conocen sus dos equipos</strong> y
          cierra 30 min antes de jugarse.
        </p>
        {score && (
          <div className="mt-3 inline-block rounded-2xl border-2 border-navy/10 bg-white px-5 py-2">
            <span className="font-sans text-xs font-semibold uppercase tracking-wider text-navy/50">
              Tus puntos por marcadores:{" "}
            </span>
            <span className="font-serif text-2xl font-bold text-rojo">
              {score.puntos_partidos}
            </span>
          </div>
        )}
      </header>

      <EliminatoriasForm participantId={params.id} games={games} iniciales={iniciales} />
    </main>
  );
}
