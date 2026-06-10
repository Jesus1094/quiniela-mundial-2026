import Link from "next/link";
import { redirect } from "next/navigation";
import PartidosForm from "./PartidosForm";
import { createServerClient } from "@/lib/supabase/server";
import { GRUPO_NOMBRE } from "@/lib/constants";
import type { Match } from "@/lib/matches";

export const dynamic = "force-dynamic";

export default async function PartidosPage({
  params,
}: {
  params: { id: string };
}) {
  const esUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      params.id
    );
  if (!esUuid) redirect("/registro");

  const supabase = createServerClient();

  const { data: participant } = await supabase
    .from("participants")
    .select("id, nombre, pago_confirmado")
    .eq("id", params.id)
    .maybeSingle();
  if (!participant) redirect("/registro");

  const [{ data: matches }, { data: preds }, { data: score }] =
    await Promise.all([
      supabase
        .from("matches")
        .select(
          "id, grupo, equipo_local, equipo_visitante, kickoff, marcador_local, marcador_visitante, orden"
        )
        .order("orden", { ascending: true }),
      supabase
        .from("match_predictions")
        .select("match_id, pred_local, pred_visitante")
        .eq("participant_id", params.id),
      supabase
        .from("scores")
        .select("puntos_partidos")
        .eq("participant_id", params.id)
        .maybeSingle(),
    ]);

  const iniciales: Record<
    string,
    { pred_local: number; pred_visitante: number }
  > = {};
  for (const p of preds ?? []) {
    iniciales[p.match_id] = {
      pred_local: p.pred_local,
      pred_visitante: p.pred_visitante,
    };
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <div className="flex items-center justify-between">
        <Link
          href={`/quiniela/${params.id}`}
          className="font-sans text-sm text-navy/60 hover:text-rojo"
        >
          ← Mis predicciones
        </Link>
        <Link
          href="/tabla"
          className="font-sans text-sm text-navy/60 hover:text-rojo"
        >
          Tabla de posiciones →
        </Link>
      </div>

      <header className="mb-6 mt-4">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-rojo">
          {GRUPO_NOMBRE}
        </p>
        <h1 className="mt-1 font-serif text-4xl font-bold text-navy">
          Pronósticos por partido
        </h1>
        <p className="mt-2 font-sans text-sm text-navy/70">
          Predice el marcador de cada partido de la fase de grupos. Ganas{" "}
          <strong>5 pts</strong> por marcador exacto y <strong>2 pts</strong> si
          solo aciertas el resultado. Cada partido cierra{" "}
          <strong>30 minutos antes</strong> de comenzar.
        </p>
        {score && (
          <div className="mt-4 inline-block rounded-2xl border-2 border-navy/10 bg-white px-5 py-2">
            <span className="font-sans text-xs font-semibold uppercase tracking-wider text-navy/50">
              Tus puntos por partidos:{" "}
            </span>
            <span className="font-serif text-2xl font-bold text-rojo">
              {score.puntos_partidos}
            </span>
          </div>
        )}
      </header>

      <PartidosForm
        participantId={participant.id}
        matches={(matches ?? []) as Match[]}
        iniciales={iniciales}
      />
    </main>
  );
}
