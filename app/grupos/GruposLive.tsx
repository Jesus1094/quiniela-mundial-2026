"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { GRUPOS, banderaDe } from "@/lib/teams";
import type { Match } from "@/lib/matches";
import {
  calcularPosiciones,
  rankearTerceros,
  type TeamStanding,
  type TercerLugar,
} from "@/lib/standings";

const SEL =
  "id, grupo, equipo_local, equipo_visitante, kickoff, marcador_local, marcador_visitante, cierre_override, orden";

const zonaClase: Record<string, string> = {
  directo: "bg-green-50",
  tercero: "bg-amber-50",
  fuera: "bg-white",
};

export default function GruposLive({
  initialMatches,
}: {
  initialMatches: Match[];
}) {
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const supabase = useMemo(() => createBrowserClient(), []);

  const recargar = useCallback(async () => {
    const { data } = await supabase
      .from("matches")
      .select(SEL)
      .order("orden", { ascending: true });
    if (data) setMatches(data as Match[]);
  }, [supabase]);

  // Realtime: cualquier cambio en matches (marcadores, horarios) refresca.
  useEffect(() => {
    const ch = supabase
      .channel("grupos-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        () => recargar()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, recargar]);

  const tablas = useMemo(
    () =>
      GRUPOS.map((g) => ({
        letra: g.letra,
        posiciones: calcularPosiciones(
          g.equipos.map((e) => e.nombre),
          matches.filter((m) => m.grupo === g.letra)
        ),
      })),
    [matches]
  );

  const tercerosRank = useMemo(() => {
    const ter: TercerLugar[] = tablas
      .map((t) => {
        const tercero = t.posiciones.find((p) => p.pos === 3);
        return tercero ? { ...tercero, grupo: t.letra } : null;
      })
      .filter((x): x is TercerLugar => x !== null);
    return rankearTerceros(ter);
  }, [tablas]);

  const jugados = matches.filter(
    (m) => m.marcador_local !== null && m.marcador_visitante !== null
  ).length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-rojo px-3 py-1 font-sans text-xs font-bold text-white">
          <span className="live-dot text-sm leading-none">🔴</span> EN VIVO
        </span>
        <span className="font-sans text-sm text-navy/60">
          {jugados} partidos jugados · se actualiza solo al cargar resultados
        </span>
      </div>

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
                {t.posiciones.map((p: TeamStanding) => (
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
    </div>
  );
}
