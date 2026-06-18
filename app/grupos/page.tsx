import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { GRUPO_NOMBRE } from "@/lib/constants";
import { GRUPOS, banderaDe } from "@/lib/teams";
import type { Match } from "@/lib/matches";
import {
  calcularPosiciones,
  rankearTerceros,
  type TercerLugar,
} from "@/lib/standings";

export const dynamic = "force-dynamic";

const zonaClase: Record<string, string> = {
  directo: "bg-green-50",
  tercero: "bg-amber-50",
  fuera: "bg-white",
};

export default async function GruposPage() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from("matches")
    .select(
      "id, grupo, equipo_local, equipo_visitante, kickoff, marcador_local, marcador_visitante, cierre_override, orden"
    )
    .order("orden", { ascending: true });

  const matches = (data ?? []) as Match[];

  const tablas = GRUPOS.map((g) => {
    const teams = g.equipos.map((e) => e.nombre);
    const delGrupo = matches.filter((m) => m.grupo === g.letra);
    return { letra: g.letra, posiciones: calcularPosiciones(teams, delGrupo) };
  });

  // Mejores terceros (provisional).
  const terceros: TercerLugar[] = tablas
    .map((t) => {
      const tercero = t.posiciones.find((p) => p.pos === 3);
      return tercero ? { ...tercero, grupo: t.letra } : null;
    })
    .filter((x): x is TercerLugar => x !== null);
  const tercerosRank = rankearTerceros(terceros);

  const jugados = matches.filter(
    (m) => m.marcador_local !== null && m.marcador_visitante !== null
  ).length;

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
          Posiciones con los <strong>{jugados}</strong> partidos jugados hasta
          ahora. Desempates por <strong>criterios FIFA 2026</strong>: head-to-head
          (pts → dif. goles → goles), luego dif. de goles general y goles
          generales.
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tablas.map((t) => (
          <div
            key={t.letra}
            className="overflow-hidden rounded-2xl border-2 border-navy/10 bg-white"
          >
            <div className="bg-navy px-3 py-2 font-serif text-lg font-bold text-crema">
              Grupo {t.letra}
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="font-sans text-[11px] uppercase tracking-wide text-navy/50">
                  <th className="px-2 py-1">#</th>
                  <th className="px-1 py-1">Equipo</th>
                  <th className="px-1 py-1 text-center">PJ</th>
                  <th className="hidden px-1 py-1 text-center sm:table-cell">DG</th>
                  <th className="px-2 py-1 text-center">Pts</th>
                </tr>
              </thead>
              <tbody>
                {t.posiciones.map((p) => (
                  <tr
                    key={p.team}
                    className={`border-t border-navy/10 ${zonaClase[p.zona]}`}
                  >
                    <td className="px-2 py-1.5 font-sans text-sm font-bold text-navy/50">
                      {p.pos}
                    </td>
                    <td className="px-1 py-1.5 font-sans text-sm font-semibold text-navy">
                      {banderaDe(p.team)} {p.team}
                      {p.empatePendiente && (
                        <span
                          title="Empate por definir: juego limpio / ranking FIFA"
                          className="ml-1 text-amber-600"
                        >
                          ⚖️
                        </span>
                      )}
                    </td>
                    <td className="px-1 py-1.5 text-center font-sans text-sm tabular-nums text-navy/70">
                      {p.pj}
                    </td>
                    <td className="hidden px-1 py-1.5 text-center font-sans text-sm tabular-nums text-navy/70 sm:table-cell">
                      {p.dg > 0 ? `+${p.dg}` : p.dg}
                    </td>
                    <td className="px-2 py-1.5 text-center font-serif text-base font-bold text-navy tabular-nums">
                      {p.pts}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* Mejores terceros */}
      <section className="mt-8">
        <h2 className="font-serif text-2xl font-bold text-navy">
          Mejores terceros (provisional)
        </h2>
        <p className="mb-3 font-sans text-sm text-navy/60">
          Los <strong>8 mejores</strong> de los 12 terceros clasifican. Criterio
          FIFA: puntos → dif. de goles → goles a favor.
        </p>
        <div className="overflow-hidden rounded-2xl border-2 border-navy/10 bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-navy text-crema font-sans text-[11px] uppercase tracking-wide">
                <th className="px-3 py-2">#</th>
                <th className="px-2 py-2">Grupo</th>
                <th className="px-2 py-2">Equipo</th>
                <th className="px-2 py-2 text-center">PJ</th>
                <th className="px-2 py-2 text-center">DG</th>
                <th className="px-3 py-2 text-center">Pts</th>
              </tr>
            </thead>
            <tbody>
              {tercerosRank.map((t, i) => (
                <tr
                  key={t.grupo}
                  className={`border-t border-navy/10 ${
                    i < 8 ? "bg-green-50" : "bg-white"
                  }`}
                >
                  <td className="px-3 py-1.5 font-sans text-sm font-bold text-navy/50">
                    {i + 1}
                  </td>
                  <td className="px-2 py-1.5 font-sans text-sm text-navy/70">
                    {t.grupo}
                  </td>
                  <td className="px-2 py-1.5 font-sans text-sm font-semibold text-navy">
                    {banderaDe(t.team)} {t.team}
                  </td>
                  <td className="px-2 py-1.5 text-center font-sans text-sm tabular-nums text-navy/70">
                    {t.pj}
                  </td>
                  <td className="px-2 py-1.5 text-center font-sans text-sm tabular-nums text-navy/70">
                    {t.dg > 0 ? `+${t.dg}` : t.dg}
                  </td>
                  <td className="px-3 py-1.5 text-center font-serif text-base font-bold text-navy tabular-nums">
                    {t.pts}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-6 font-sans text-xs text-navy/50">
        Nota: el juego limpio (tarjetas) y el ranking FIFA no se calculan aquí;
        los empates que llegan hasta ese punto se marcan con ⚖️. Posiciones
        provisionales según resultados cargados.
      </p>
    </main>
  );
}
