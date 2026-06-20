"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { GRUPOS, banderaDe } from "@/lib/teams";
import { TIMEZONE } from "@/lib/constants";
import type { Match } from "@/lib/matches";
import { calcularPosiciones, rankearTerceros } from "@/lib/standings";
import {
  BRACKET,
  RONDA_LABEL,
  KO_SCHEDULE,
  asignarTerceros,
  resolverCuadro,
  type KoState,
  type ResolvedGame,
  type Ronda,
  type Tercero,
} from "@/lib/knockout";

const fmtFecha = new Intl.DateTimeFormat("es-MX", {
  timeZone: TIMEZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const MSEL =
  "id, grupo, equipo_local, equipo_visitante, kickoff, marcador_local, marcador_visitante, cierre_override, orden";

type KoRow = {
  num: number;
  marcador_local: number | null;
  marcador_visitante: number | null;
  ganador: string | null;
};
type ThirdOv = { match_num: number; equipo: string };

const ORDEN_RONDAS: Ronda[] = ["r32", "r16", "qf", "sf", "tercer", "final"];

export default function LlaveLive({
  initialMatches,
  initialKo,
  initialThirds,
}: {
  initialMatches: Match[];
  initialKo: KoRow[];
  initialThirds: ThirdOv[];
}) {
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [ko, setKo] = useState<KoRow[]>(initialKo);
  const [thirds, setThirds] = useState<ThirdOv[]>(initialThirds);
  const supabase = useMemo(() => createBrowserClient(), []);

  const recargar = useCallback(async () => {
    const [m, k, t] = await Promise.all([
      supabase.from("matches").select(MSEL).order("orden", { ascending: true }),
      supabase.from("knockout_matches").select("num, marcador_local, marcador_visitante, ganador"),
      supabase.from("knockout_thirds_override").select("match_num, equipo"),
    ]);
    if (m.data) setMatches(m.data as Match[]);
    if (k.data) setKo(k.data as KoRow[]);
    if (t.data) setThirds(t.data as ThirdOv[]);
  }, [supabase]);

  useEffect(() => {
    const ch = supabase
      .channel("llave-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => recargar())
      .on("postgres_changes", { event: "*", schema: "public", table: "knockout_matches" }, () => recargar())
      .on("postgres_changes", { event: "*", schema: "public", table: "knockout_thirds_override" }, () => recargar())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, recargar]);

  const resolved = useMemo(() => {
    const posPorGrupo = new Map(
      GRUPOS.map((g) => [
        g.letra,
        calcularPosiciones(
          g.equipos.map((e) => e.nombre),
          matches.filter((m) => m.grupo === g.letra)
        ),
      ])
    );
    const terc8: Tercero[] = rankearTerceros(
      GRUPOS.map((g) => {
        const pos = posPorGrupo.get(g.letra)!.find((p) => p.pos === 3)!;
        return { ...pos, grupo: g.letra };
      })
    )
      .slice(0, 8)
      .map((t) => ({ grupo: t.grupo, team: t.team }));
    const overrides = new Map(thirds.map((t) => [t.match_num, t.equipo]));
    const { mapa } = asignarTerceros(terc8, overrides);
    const koMap = new Map<number, KoState>(ko.map((k) => [k.num, k]));
    return resolverCuadro(posPorGrupo, koMap, mapa);
  }, [matches, ko, thirds]);

  const gruposCompletos = matches.length > 0 &&
    matches.every((m) => m.marcador_local !== null && m.marcador_visitante !== null);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-rojo px-3 py-1 font-sans text-xs font-bold text-white">
          <span className="live-dot text-sm leading-none">🔴</span> EN VIVO
        </span>
        {!gruposCompletos && (
          <span className="font-sans text-sm text-navy/60">
            Provisional: se confirma al terminar la fase de grupos.
          </span>
        )}
      </div>

      <div className="flex flex-col gap-8">
        {ORDEN_RONDAS.map((ronda) => {
          const juegos = BRACKET.filter((b) => b.ronda === ronda).map(
            (b) => resolved.get(b.num)!
          );
          return (
            <section key={ronda}>
              <h2 className="mb-3 font-serif text-2xl font-bold text-navy">
                {RONDA_LABEL[ronda]}
              </h2>
              <div
                className={`grid grid-cols-1 gap-2 ${
                  ronda === "r32" || ronda === "r16" ? "sm:grid-cols-2" : ""
                }`}
              >
                {juegos.map((g) => (
                  <GameCard key={g.num} g={g} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Lado({
  team,
  label,
  marcador,
  ganador,
}: {
  team: string | null;
  label: string;
  marcador: number | null;
  ganador: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-1.5 ${
        ganador ? "font-bold text-navy" : "text-navy/80"
      }`}
    >
      <span className="truncate font-sans text-sm">
        {team ? (
          <>
            {banderaDe(team)} {team}
          </>
        ) : (
          <span className="italic text-navy/40">{label}</span>
        )}
      </span>
      <span className="font-serif text-base tabular-nums">
        {marcador ?? ""}
      </span>
    </div>
  );
}

function GameCard({ g }: { g: ResolvedGame }) {
  const sch = KO_SCHEDULE[g.num];
  return (
    <div className="overflow-hidden rounded-xl border-2 border-navy/10 bg-white">
      <div className="flex items-center justify-between gap-2 bg-navy/5 px-3 py-1">
        <span className="truncate font-sans text-[10px] text-navy/50">
          {sch ? `${fmtFecha.format(new Date(sch.kickoff))} h · ${sch.sede}` : ""}
        </span>
        <span className="shrink-0 font-sans text-[10px] font-semibold uppercase tracking-wide text-navy/40">
          #{g.num}
        </span>
      </div>
      <Lado
        team={g.home}
        label={g.homeLabel}
        marcador={g.marcador_local}
        ganador={!!g.ganador && g.ganador === g.home}
      />
      <div className="border-t border-navy/10" />
      <Lado
        team={g.away}
        label={g.awayLabel}
        marcador={g.marcador_visitante}
        ganador={!!g.ganador && g.ganador === g.away}
      />
    </div>
  );
}
