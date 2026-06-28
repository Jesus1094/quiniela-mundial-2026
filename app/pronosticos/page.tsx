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
import {
  construirCuadro,
  cierreKo,
  RONDA_LABEL,
  KO_SCHEDULE,
  type KoState,
  type ResolvedGame,
} from "@/lib/knockout";

export const dynamic = "force-dynamic";

type Pred = { participant_id: string; pred_local: number; pred_visitante: number };
type Fila = { nombre: string; pred_local: number; pred_visitante: number; pts: number | null };

function koPts(g: ResolvedGame, p: Pred): number | null {
  if (g.marcador_local === null || g.marcador_visitante === null) return null;
  const sg = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);
  if (p.pred_local === g.marcador_local && p.pred_visitante === g.marcador_visitante) return 5;
  if (sg(p.pred_local - p.pred_visitante) === sg(g.marcador_local - g.marcador_visitante)) return 2;
  return 0;
}

export default async function PronosticosPage() {
  const sid = getSession();
  if (!sid) redirect("/login");

  const admin = createAdminClient();
  const [
    { data: matches },
    { data: parts },
    { data: preds },
    { data: ko },
    { data: thirds },
    { data: koPreds },
  ] = await Promise.all([
    admin
      .from("matches")
      .select(
        "id, grupo, equipo_local, equipo_visitante, kickoff, marcador_local, marcador_visitante, cierre_override, orden"
      )
      .order("orden", { ascending: true }),
    admin.from("participants").select("id, nombre"),
    admin.from("match_predictions").select("match_id, participant_id, pred_local, pred_visitante"),
    admin.from("knockout_matches").select("num, marcador_local, marcador_visitante, ganador"),
    admin.from("knockout_thirds_override").select("match_num, equipo"),
    admin
      .from("knockout_predictions")
      .select("match_num, participant_id, pred_local, pred_visitante"),
  ]);

  const nombrePorId = new Map((parts ?? []).map((p) => [p.id, p.nombre as string]));

  // ── Grupos ──
  const predsPorMatch = new Map<string, Pred[]>();
  for (const p of preds ?? []) {
    const arr = predsPorMatch.get(p.match_id) ?? [];
    arr.push(p);
    predsPorMatch.set(p.match_id, arr);
  }
  const gruposCerrados = ((matches ?? []) as Match[])
    .filter((m) => !partidoAbierto(m))
    .sort((a, b) => b.orden - a.orden);

  // ── Fase final ──
  const cuadro = construirCuadro(
    (matches ?? []) as Match[],
    (ko ?? []) as KoState[],
    (thirds ?? []) as { match_num: number; equipo: string }[]
  );
  const predsPorKo = new Map<number, Pred[]>();
  for (const p of koPreds ?? []) {
    const arr = predsPorKo.get(p.match_num) ?? [];
    arr.push(p);
    predsPorKo.set(p.match_num, arr);
  }
  const ahora = Date.now();
  const koCerrados = Array.from(cuadro.values())
    .filter((g) => {
      const c = cierreKo(g.num);
      return g.home && g.away && c && ahora >= c.getTime();
    })
    .sort((a, b) => b.num - a.num);

  const filasGrupo = (m: Match): Fila[] =>
    (predsPorMatch.get(m.id) ?? [])
      .map((p) => ({
        nombre: nombrePorId.get(p.participant_id) ?? "—",
        pred_local: p.pred_local,
        pred_visitante: p.pred_visitante,
        pts: puntosDePronostico(m, p),
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const filasKo = (g: ResolvedGame): Fila[] =>
    (predsPorKo.get(g.num) ?? [])
      .map((p) => ({
        nombre: nombrePorId.get(p.participant_id) ?? "—",
        pred_local: p.pred_local,
        pred_visitante: p.pred_visitante,
        pts: koPts(g, p),
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <div className="flex items-center justify-between">
        <Link href={`/quiniela/${sid}`} className="font-sans text-sm text-navy/60 hover:text-rojo">
          ← Mi quiniela
        </Link>
        <Link href="/tabla" className="font-sans text-sm text-navy/60 hover:text-rojo">
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
          cerrados</strong> (~30 min antes de cada partido). Los abiertos
          permanecen ocultos para que nadie copie.
        </p>
      </header>

      {koCerrados.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-serif text-2xl font-bold text-navy">Fase final</h2>
          <div className="flex flex-col gap-4">
            {koCerrados.map((g) => {
              const sch = KO_SCHEDULE[g.num];
              return (
                <Tarjeta
                  key={`ko-${g.num}`}
                  subtitulo={`${RONDA_LABEL[g.ronda]} · #${g.num}${
                    sch ? ` · ${diaDe({ kickoff: sch.kickoff })} ${horaDe({ kickoff: sch.kickoff })} h` : ""
                  }`}
                  oficial={
                    g.marcador_local !== null && g.marcador_visitante !== null
                      ? `${g.marcador_local}–${g.marcador_visitante}`
                      : null
                  }
                  local={g.home}
                  visitante={g.away}
                  filas={filasKo(g)}
                />
              );
            })}
          </div>
        </section>
      )}

      <h2 className="mb-3 font-serif text-2xl font-bold text-navy">Fase de grupos</h2>
      {gruposCerrados.length === 0 && koCerrados.length === 0 && (
        <p className="rounded-2xl border-2 border-navy/10 bg-white px-5 py-8 text-center font-sans text-navy/60">
          Aún no hay partidos cerrados. Cuando cierre el primero, aquí aparecerán
          los pronósticos de todos.
        </p>
      )}
      <div className="flex flex-col gap-4">
        {gruposCerrados.map((m) => (
          <Tarjeta
            key={m.id}
            subtitulo={`Grupo ${m.grupo} · ${diaDe(m)} ${horaDe(m)} h`}
            oficial={tieneResultado(m) ? `${m.marcador_local}–${m.marcador_visitante}` : null}
            local={m.equipo_local}
            visitante={m.equipo_visitante}
            filas={filasGrupo(m)}
          />
        ))}
      </div>
    </main>
  );
}

function Tarjeta({
  subtitulo,
  oficial,
  local,
  visitante,
  filas,
}: {
  subtitulo: string;
  oficial: string | null;
  local: string | null;
  visitante: string | null;
  filas: Fila[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border-2 border-navy/10 bg-white">
      <div className="bg-navy px-4 py-3 text-crema">
        <div className="flex items-center justify-between gap-2 font-sans text-xs text-crema/70">
          <span className="truncate">{subtitulo}</span>
          {oficial ? (
            <span className="shrink-0 rounded-full bg-rojo px-2 py-0.5 font-bold text-white">
              Oficial: {oficial}
            </span>
          ) : (
            <span className="shrink-0 text-crema/60">por jugarse</span>
          )}
        </div>
        <p className="mt-1 font-serif text-lg font-bold">
          {banderaDe(local)} {local} <span className="text-crema/50">vs</span>{" "}
          {visitante} {banderaDe(visitante)}
        </p>
      </div>

      {filas.length === 0 ? (
        <p className="px-4 py-3 font-sans text-sm text-navy/50">
          Nadie pronosticó este partido.
        </p>
      ) : (
        <ul className="divide-y divide-navy/10">
          {filas.map((x, i) => (
            <li key={i} className="flex items-center justify-between px-4 py-2 font-sans text-sm">
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
}
