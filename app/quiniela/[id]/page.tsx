import Link from "next/link";
import { redirect } from "next/navigation";
import PrediccionesForm from "./PrediccionesForm";
import { createServerClient } from "@/lib/supabase/server";
import { corteAlcanzado, GRUPO_NOMBRE } from "@/lib/constants";
import { getSession } from "@/lib/auth";
import { logout } from "@/app/login/actions";

export const dynamic = "force-dynamic";

export default async function QuinielaPage({
  params,
}: {
  params: { id: string };
}) {
  // Requiere sesión y que sea la propia quiniela del usuario.
  const sid = getSession();
  if (!sid) redirect("/login");
  if (sid !== params.id) redirect(`/quiniela/${sid}`);

  const supabase = createServerClient();

  const { data: participant } = await supabase
    .from("participants")
    .select("id, nombre, pago_confirmado")
    .eq("id", params.id)
    .maybeSingle();

  if (!participant) redirect("/login");

  const [{ data: preds }, { data: score }, { count: resultsCount }] =
    await Promise.all([
      supabase
        .from("predictions")
        .select("tipo, equipo_seleccionado")
        .eq("participant_id", params.id),
      supabase
        .from("scores")
        .select("puntos_grupos, puntos_fases, puntos_comodin, total")
        .eq("participant_id", params.id)
        .maybeSingle(),
      supabase
        .from("results")
        .select("id", { count: "exact", head: true }),
    ]);

  const iniciales: Record<string, string> = {};
  for (const p of preds ?? []) iniciales[p.tipo] = p.equipo_seleccionado;

  const readOnly = corteAlcanzado();
  const hayResultados = (resultsCount ?? 0) > 0;

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <div className="flex items-center justify-between">
        <Link href="/" className="font-sans text-sm text-navy/60 hover:text-rojo">
          ← Inicio
        </Link>
        <form action={logout}>
          <button className="font-sans text-sm text-navy/60 hover:text-rojo">
            Cerrar sesión
          </button>
        </form>
      </div>

      <header className="mt-4 mb-8">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-rojo">
          {GRUPO_NOMBRE}
        </p>
        <h1 className="mt-1 font-serif text-4xl font-bold text-navy">
          Hola, {participant.nombre}
        </h1>

        {/* Estado de pago */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {participant.pago_confirmado ? (
            <span className="rounded-full bg-green-600/10 px-4 py-1.5 font-sans text-sm font-semibold text-green-700">
              ✅ Pago confirmado
            </span>
          ) : (
            <span className="rounded-full bg-amber-500/10 px-4 py-1.5 font-sans text-sm font-semibold text-amber-700">
              ⏳ Pago pendiente — contacta al administrador
            </span>
          )}
          <Link
            href={`/quiniela/${participant.id}/partidos`}
            className="rounded-full bg-navy px-4 py-1.5 font-sans text-sm font-semibold text-crema hover:bg-navy/90"
          >
            ⚽ Pronósticos por partido
          </Link>
          <Link
            href="/pronosticos"
            className="rounded-full border-2 border-navy/15 px-4 py-1.5 font-sans text-sm font-semibold text-navy hover:border-navy/40"
          >
            👁️ Pronósticos del grupo
          </Link>
          <Link
            href="/grupos"
            className="rounded-full border-2 border-navy/15 px-4 py-1.5 font-sans text-sm font-semibold text-navy hover:border-navy/40"
          >
            📊 Simulador de grupos
          </Link>
          <Link
            href="/tabla"
            className="rounded-full border-2 border-navy/15 px-4 py-1.5 font-sans text-sm font-semibold text-navy hover:border-navy/40"
          >
            Ver tabla de posiciones
          </Link>
        </div>

        {/* Puntos actuales (si ya hay resultados) */}
        {hayResultados && score && (
          <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border-2 border-navy/10 bg-white p-4 sm:grid-cols-4">
            <Stat label="Grupos" valor={score.puntos_grupos} />
            <Stat label="Fases" valor={score.puntos_fases} />
            <Stat label="Comodín" valor={score.puntos_comodin} />
            <Stat label="Total" valor={score.total} destacado />
          </div>
        )}

        {readOnly && (
          <p className="mt-5 rounded-xl border-2 border-navy/15 bg-navy/5 px-4 py-3 font-sans text-sm text-navy/70">
            🔒 Las predicciones están cerradas. Esta es tu quiniela en modo
            lectura.
          </p>
        )}
      </header>

      <PrediccionesForm
        participantId={participant.id}
        iniciales={iniciales}
        readOnly={readOnly}
      />
    </main>
  );
}

function Stat({
  label,
  valor,
  destacado,
}: {
  label: string;
  valor: number;
  destacado?: boolean;
}) {
  return (
    <div className="text-center">
      <p className="font-sans text-xs font-semibold uppercase tracking-wider text-navy/50">
        {label}
      </p>
      <p
        className={`font-serif text-3xl font-bold ${
          destacado ? "text-rojo" : "text-navy"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}
