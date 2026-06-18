"use client";

import { useMemo, useState } from "react";
import { GRUPOS, banderaDe } from "@/lib/teams";
import type { Match } from "@/lib/matches";
import {
  calcularPosiciones,
  rankearTerceros,
  type TeamStanding,
  type TercerLugar,
} from "@/lib/standings";

type Hipo = Record<string, { l: string; v: string }>;

const zonaClase: Record<string, string> = {
  directo: "bg-green-50",
  tercero: "bg-amber-50",
  fuera: "bg-white",
};

function jugado(m: Match): boolean {
  return m.marcador_local !== null && m.marcador_visitante !== null;
}

export default function QuePasaSi({ matches }: { matches: Match[] }) {
  const [hipo, setHipo] = useState<Hipo>({});

  const set = (id: string, lado: "l" | "v", val: string) => {
    const limpio = val.replace(/[^0-9]/g, "").slice(0, 2);
    setHipo((h) => ({
      ...h,
      [id]: { l: h[id]?.l ?? "", v: h[id]?.v ?? "", [lado]: limpio },
    }));
  };

  // Matches efectivos: reales + hipotéticos para los no jugados con valores.
  const efectivos = useMemo<Match[]>(() => {
    return matches.map((m) => {
      if (jugado(m)) return m;
      const h = hipo[m.id];
      if (h && h.l !== "" && h.v !== "") {
        return {
          ...m,
          marcador_local: Number(h.l),
          marcador_visitante: Number(h.v),
        };
      }
      return m;
    });
  }, [matches, hipo]);

  const tablas = useMemo(() => {
    return GRUPOS.map((g) => {
      const teams = g.equipos.map((e) => e.nombre);
      const delGrupo = efectivos.filter((m) => m.grupo === g.letra);
      return { letra: g.letra, posiciones: calcularPosiciones(teams, delGrupo) };
    });
  }, [efectivos]);

  const tercerosRank = useMemo(() => {
    const ter: TercerLugar[] = tablas
      .map((t) => {
        const tercero = t.posiciones.find((p) => p.pos === 3);
        return tercero ? { ...tercero, grupo: t.letra } : null;
      })
      .filter((x): x is TercerLugar => x !== null);
    return rankearTerceros(ter);
  }, [tablas]);

  // Partidos por grupo (orden cronológico) para los inputs.
  const matchesPorGrupo = useMemo(() => {
    const map: Record<string, Match[]> = {};
    for (const g of GRUPOS) {
      map[g.letra] = matches
        .filter((m) => m.grupo === g.letra)
        .sort((a, b) => a.orden - b.orden);
    }
    return map;
  }, [matches]);

  return (
    <div>
      <button
        onClick={() => setHipo({})}
        className="mb-5 rounded-xl border-2 border-navy/20 px-4 py-2 font-sans text-sm font-semibold text-navy hover:border-navy"
      >
        ↺ Reiniciar escenario
      </button>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {tablas.map((t) => (
          <div
            key={t.letra}
            className="overflow-hidden rounded-2xl border-2 border-navy/10 bg-white"
          >
            <div className="bg-navy px-3 py-2 font-serif text-lg font-bold text-crema">
              Grupo {t.letra}
            </div>

            <Tabla posiciones={t.posiciones} />

            <div className="border-t-2 border-navy/10 px-3 py-2">
              <p className="mb-1 font-sans text-[11px] font-semibold uppercase tracking-wide text-navy/50">
                Partidos
              </p>
              <div className="flex flex-col gap-1">
                {matchesPorGrupo[t.letra].map((m) => {
                  const real = jugado(m);
                  return (
                    <div
                      key={m.id}
                      className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 font-sans text-xs"
                    >
                      <span className="truncate text-right font-medium text-navy">
                        {banderaDe(m.equipo_local)} {m.equipo_local}
                      </span>
                      {real ? (
                        <span className="rounded bg-navy/10 px-2 py-0.5 font-serif text-sm font-bold text-navy">
                          {m.marcador_local}–{m.marcador_visitante}
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5">
                          <input
                            inputMode="numeric"
                            value={hipo[m.id]?.l ?? ""}
                            onChange={(e) => set(m.id, "l", e.target.value)}
                            placeholder="–"
                            className="h-7 w-7 rounded border-2 border-rojo/30 bg-crema text-center font-serif text-sm font-bold text-navy outline-none focus:border-rojo"
                          />
                          <span className="text-navy/40">:</span>
                          <input
                            inputMode="numeric"
                            value={hipo[m.id]?.v ?? ""}
                            onChange={(e) => set(m.id, "v", e.target.value)}
                            placeholder="–"
                            className="h-7 w-7 rounded border-2 border-rojo/30 bg-crema text-center font-serif text-sm font-bold text-navy outline-none focus:border-rojo"
                          />
                        </span>
                      )}
                      <span className="truncate font-medium text-navy">
                        {m.equipo_visitante} {banderaDe(m.equipo_visitante)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="font-serif text-2xl font-bold text-navy">
          Mejores terceros (en este escenario)
        </h2>
        <p className="mb-3 font-sans text-sm text-navy/60">
          Los 8 mejores clasifican (puntos → dif. de goles → goles).
        </p>
        <div className="overflow-hidden rounded-2xl border-2 border-navy/10 bg-white">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-navy text-crema font-sans text-[11px] uppercase tracking-wide">
                <th className="px-3 py-2">#</th>
                <th className="px-2 py-2">Gpo</th>
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
    </div>
  );
}

function Tabla({ posiciones }: { posiciones: TeamStanding[] }) {
  return (
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
        {posiciones.map((p) => (
          <tr key={p.team} className={`border-t border-navy/10 ${zonaClase[p.zona]}`}>
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
  );
}
