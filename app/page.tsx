import Link from "next/link";
import Countdown from "@/components/Countdown";
import { createServerClient } from "@/lib/supabase/server";
import {
  CUTOFF_ISO,
  GRUPO_NOMBRE,
  CUOTA,
  calcularPozo,
  corteAlcanzado,
  FMT_MXN,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const supabase = createServerClient();

  const { count } = await supabase
    .from("participants")
    .select("id", { count: "exact", head: true })
    .eq("pago_confirmado", true);

  const pagados = count ?? 0;
  const pozo = calcularPozo(pagados);

  // El registro sigue abierto mientras quede algún partido por jugarse
  // (la gente puede unirse durante la fase de grupos para pronosticar partidos).
  const { data: lastMatch } = await supabase
    .from("matches")
    .select("kickoff")
    .order("kickoff", { ascending: false })
    .limit(1)
    .maybeSingle();
  const registroAbierto = lastMatch
    ? Date.now() < new Date(lastMatch.kickoff).getTime()
    : !corteAlcanzado();
  // 'cerrado' = ya pasó el corte de predicciones de torneo (campeón, grupos…).
  const cerrado = corteAlcanzado();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center px-5 py-12 text-center">
      <p className="font-sans text-sm font-semibold uppercase tracking-[0.25em] text-rojo">
        {GRUPO_NOMBRE}
      </p>
      <h1 className="mt-3 font-serif text-5xl font-bold leading-none text-navy sm:text-7xl">
        Quiniela
        <br />
        Mundial 2026
      </h1>
      <p className="mt-4 max-w-md font-sans text-base text-navy/70">
        48 equipos. 12 grupos. Un solo campeón. Haz tus predicciones antes del
        silbatazo inicial.
      </p>

      <section className="mt-10 w-full">
        <p className="mb-5 font-sans text-xs font-semibold uppercase tracking-widest text-navy/60">
          {cerrado ? "Estado del torneo" : "Cierre de predicciones en"}
        </p>
        <Countdown targetIso={CUTOFF_ISO} />
        {!cerrado && (
          <p className="mt-4 font-sans text-sm text-navy/60">
            11 de junio de 2026, 12:30 PM (hora de Ciudad de México)
          </p>
        )}
      </section>

      <section className="mt-10 w-full rounded-2xl border-2 border-navy/10 bg-white px-6 py-6">
        <p className="font-sans text-xs font-semibold uppercase tracking-widest text-navy/60">
          Pozo acumulado
        </p>
        <p className="mt-1 font-serif text-5xl font-bold text-rojo">
          {FMT_MXN.format(pozo)}
        </p>
        <p className="mt-1 font-sans text-sm text-navy/60">
          {pagados} {pagados === 1 ? "participante" : "participantes"} con pago
          confirmado · cuota {FMT_MXN.format(CUOTA)}
        </p>
      </section>

      <section className="mt-10 flex w-full flex-col gap-3">
        {registroAbierto && (
          <Link
            href="/registro"
            className="rounded-xl bg-rojo px-6 py-4 font-sans text-lg font-bold text-white transition hover:bg-rojo/90"
          >
            Registrarme y hacer mis pronósticos
          </Link>
        )}
        <Link
          href="/login"
          className="rounded-xl border-2 border-rojo px-6 py-4 font-sans text-lg font-bold text-rojo transition hover:bg-rojo hover:text-white"
        >
          Ya tengo cuenta — Iniciar sesión
        </Link>
        <Link
          href="/tabla"
          className="rounded-xl border-2 border-navy px-6 py-4 font-sans text-lg font-bold text-navy transition hover:bg-navy hover:text-crema"
        >
          Ver tabla de posiciones
        </Link>
        <Link
          href="/grupos"
          className="rounded-xl border-2 border-navy/20 px-6 py-3 font-sans font-semibold text-navy transition hover:border-navy"
        >
          📊 Simulador de grupos
        </Link>
        {registroAbierto && cerrado && (
          <p className="mt-2 font-sans text-sm text-navy/60">
            El corte de predicciones del torneo (campeón, grupos…) ya pasó, pero
            aún puedes registrarte y pronosticar los partidos de la fase de
            grupos.
          </p>
        )}
        {!registroAbierto && (
          <p className="mt-2 font-sans text-sm text-navy/60">
            El registro está cerrado. La fase de grupos ya terminó.
          </p>
        )}
      </section>

      <footer className="mt-auto flex flex-col items-center gap-2 pt-12">
        <Link
          href="/integridad"
          className="font-sans text-sm font-semibold text-navy/70 underline-offset-2 hover:text-rojo hover:underline"
        >
          🔎 Bitácora de resultados (transparencia)
        </Link>
        <Link
          href="/admin"
          className="font-sans text-xs text-navy/40 underline-offset-2 hover:underline"
        >
          Panel de administración
        </Link>
      </footer>
    </main>
  );
}
