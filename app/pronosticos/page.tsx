import Link from "next/link";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { GRUPO_NOMBRE } from "@/lib/constants";
import { banderaDe } from "@/lib/teams";
import {
  type Match,
  partidoAbierto,
  tieneResultado,
  puntosDePronostico,
  horaDe,
  diaDe,
} from "@/lib/matches";

export const dynamic = "force-dynamic";

export default async function PronosticosPage() {
  // Solo participantes con sesión.
  const sid = getSession();
  if (!sid) redirect("/login");

  const admin = createAdminClient();
  const [{ data: matches }, { data: parts }, { data: preds }] =
    await Promise.all([
      admin
        .from("matches")
        .select(
          "id, grupo, equipo_local, equipo_visitante, kickoff, marcador_local, marcador_visitante, cierre_override, orden"
        )
        .order("orden", { ascending: true }),
      admin.from("participants").select("id, nombre"),
      admin
        .from("match_predictions")
        .select("match_id, participant_id, pred_local, pred_visitante"),
    ]);

  const nombrePorId = new Map(
    (parts ?? []).map((p) => [p.id, p.nombre as string])
  );

  // Pronósticos por partido.
  const predsPorMatch = new Map<
    string,
    { participant_id: string; pred_local: number; pred_visitante: number }[]
  >();
  for (const p of preds ?? []) {
    const arr = predsPorMatch.get(p.match_id) ?? [];
    arr.push(p);
    predsPorMatch.set(p.match_id, arr);
  }

  // Solo partidos CERRADOS, más recientes primero.
  const cerrados = ((matches ?? []) as Match[])
    .filter((m) => !partidoAbierto(m))
    .sort((a, b) => b.orden - a.orden);

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <div className="flex items-center justify-between">
        <Link
          href={`/quiniela/${sid}`}
          className="font-sans text-sm text-navy/60 hover:text-rojo"
        >
          ← Mi quiniela
        </Link>
        <Link
          href="/tabla"
          className="font-sans text-sm text-navy/60 hover:text-rojo"
        >
          Tabla →
        </Link>
      </div>

      <header className="mb-6 mt-4">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-rojo">
          {GRUPO_NOMBRE}
        </p>
        <h1 className="mt-1 font-serif text-4xl font-bold text-navy">
          Pronósticos del grupo
        </h1>
        <p className="mt-2 font-sans text-sm text-navy/70">
          Aquí ves los pronósticos de todos, pero <strong>solo de partidos ya
          cerrados</strong> (a partir del cierre, ~30 min antes de cada partido).
          Los partidos aún abiertos permanecen ocultos para que nadie copie.
        </p>
      </header>

      {cerrados.length === 0 && (
        <p className="rounded-2xl border-2 border-navy/10 bg-white px-5 py-8 text-center font-sans text-navy/60">
          Aún no hay partidos cerrados. Cuando cierre el primero, aquí
          aparecerán los pronósticos de todos.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {cerrados.map((m) => {
          const lista = (predsPorMatch.get(m.id) ?? [])
            .map((p) => ({
              nombre: nombrePorId.get(p.participant_id) ?? "—",
              pred_local: p.pred_local,
              pred_visitante: p.pred_visitante,
              pts: puntosDePronostico(m, p),
            }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre));
          const conResultado = tieneResultado(m);
          return (
            <section
              key={m.id}
              className="overflow-hidden rounded-2xl border-2 border-navy/10 bg-white"
            >
              <div className="bg-navy px-4 py-3 text-crema">
                <div className="flex items-center justify-between font-sans text-xs text-crema/70">
                  <span>
                    Grupo {m.grupo} · {diaDe(m)} {horaDe(m)} h
                  </span>
                  {conResultado ? (
                    <span className="rounded-full bg-rojo px-2 py-0.5 font-bold text-white">
                      Oficial: {m.marcador_local}–{m.marcador_visitante}
                    </span>
                  ) : (
                    <span className="text-crema/60">por jugarse</span>
                  )}
                </div>
                <p className="mt-1 font-serif text-lg font-bold">
                  {banderaDe(m.equipo_local)} {m.equipo_local}{" "}
                  <span className="text-crema/50">vs</span>{" "}
                  {m.equipo_visitante} {banderaDe(m.equipo_visitante)}
                </p>
              </div>

              {lista.length === 0 ? (
                <p className="px-4 py-3 font-sans text-sm text-navy/50">
                  Nadie pronosticó este partido.
                </p>
              ) : (
                <ul className="divide-y divide-navy/10">
                  {lista.map((x, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between px-4 py-2 font-sans text-sm"
                    >
                      <span className="font-semibold text-navy">{x.nombre}</span>
                      <span className="flex items-center gap-3">
                        <span className="font-serif text-lg font-bold tabular-nums text-navy">
                          {x.pred_local}–{x.pred_visitante}
                        </span>
                        {x.pts !== null && (
                          <span
                            className={`w-10 rounded-full px-2 py-0.5 text-center text-xs font-bold ${
                              x.pts === 5
                                ? "bg-green-600 text-white"
                                : x.pts === 2
                                ? "bg-amber-400 text-navy"
                                : "bg-navy/10 text-navy/60"
                            }`}
                          >
                            {x.pts}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
