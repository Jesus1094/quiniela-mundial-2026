// Estructura del cuadro de eliminatorias del Mundial 2026 y resolución de equipos.
// La estructura (Anexo C de FIFA) está fija aquí; los equipos se resuelven desde
// las posiciones de grupo + asignación de terceros + ganadores previos.

import { calcularPosiciones, rankearTerceros, type TeamStanding } from "./standings";
import { GRUPOS } from "./teams";
import type { Match } from "./matches";

export type Ronda = "r32" | "r16" | "qf" | "sf" | "tercer" | "final";

type Src =
  | { t: "pos"; g: string; p: 1 | 2 } // 1º/2º de grupo
  | { t: "third"; m: number } // tercero asignado a la llave m
  | { t: "win"; m: number } // ganador del partido m
  | { t: "lose"; m: number }; // perdedor del partido m

export type BracketGame = {
  num: number;
  ronda: Ronda;
  home: Src;
  away: Src;
};

export const RONDA_LABEL: Record<Ronda, string> = {
  r32: "16avos de final",
  r16: "Octavos de final",
  qf: "Cuartos de final",
  sf: "Semifinales",
  tercer: "Tercer lugar",
  final: "Final",
};

// Conjuntos de grupos elegibles para cada llave con tercero (Anexo C).
export const THIRD_ELIGIBLE: Record<number, string[]> = {
  74: ["A", "B", "C", "D", "F"],
  77: ["C", "D", "F", "G", "H"],
  79: ["C", "E", "F", "H", "I"],
  80: ["E", "H", "I", "J", "K"],
  81: ["B", "E", "F", "I", "J"],
  82: ["A", "E", "H", "I", "J"],
  85: ["E", "F", "G", "I", "J"],
  87: ["D", "E", "I", "J", "L"],
};
export const THIRD_SLOTS = Object.keys(THIRD_ELIGIBLE).map(Number);

export const BRACKET: BracketGame[] = [
  { num: 73, ronda: "r32", home: { t: "pos", g: "A", p: 2 }, away: { t: "pos", g: "B", p: 2 } },
  { num: 74, ronda: "r32", home: { t: "pos", g: "E", p: 1 }, away: { t: "third", m: 74 } },
  { num: 75, ronda: "r32", home: { t: "pos", g: "F", p: 1 }, away: { t: "pos", g: "C", p: 2 } },
  { num: 76, ronda: "r32", home: { t: "pos", g: "C", p: 1 }, away: { t: "pos", g: "F", p: 2 } },
  { num: 77, ronda: "r32", home: { t: "pos", g: "I", p: 1 }, away: { t: "third", m: 77 } },
  { num: 78, ronda: "r32", home: { t: "pos", g: "E", p: 2 }, away: { t: "pos", g: "I", p: 2 } },
  { num: 79, ronda: "r32", home: { t: "pos", g: "A", p: 1 }, away: { t: "third", m: 79 } },
  { num: 80, ronda: "r32", home: { t: "pos", g: "L", p: 1 }, away: { t: "third", m: 80 } },
  { num: 81, ronda: "r32", home: { t: "pos", g: "D", p: 1 }, away: { t: "third", m: 81 } },
  { num: 82, ronda: "r32", home: { t: "pos", g: "G", p: 1 }, away: { t: "third", m: 82 } },
  { num: 83, ronda: "r32", home: { t: "pos", g: "K", p: 2 }, away: { t: "pos", g: "L", p: 2 } },
  { num: 84, ronda: "r32", home: { t: "pos", g: "H", p: 1 }, away: { t: "pos", g: "J", p: 2 } },
  { num: 85, ronda: "r32", home: { t: "pos", g: "B", p: 1 }, away: { t: "third", m: 85 } },
  { num: 86, ronda: "r32", home: { t: "pos", g: "J", p: 1 }, away: { t: "pos", g: "H", p: 2 } },
  { num: 87, ronda: "r32", home: { t: "pos", g: "K", p: 1 }, away: { t: "third", m: 87 } },
  { num: 88, ronda: "r32", home: { t: "pos", g: "D", p: 2 }, away: { t: "pos", g: "G", p: 2 } },
  { num: 89, ronda: "r16", home: { t: "win", m: 74 }, away: { t: "win", m: 77 } },
  { num: 90, ronda: "r16", home: { t: "win", m: 73 }, away: { t: "win", m: 75 } },
  { num: 91, ronda: "r16", home: { t: "win", m: 76 }, away: { t: "win", m: 78 } },
  { num: 92, ronda: "r16", home: { t: "win", m: 79 }, away: { t: "win", m: 80 } },
  { num: 93, ronda: "r16", home: { t: "win", m: 83 }, away: { t: "win", m: 84 } },
  { num: 94, ronda: "r16", home: { t: "win", m: 81 }, away: { t: "win", m: 82 } },
  { num: 95, ronda: "r16", home: { t: "win", m: 86 }, away: { t: "win", m: 88 } },
  { num: 96, ronda: "r16", home: { t: "win", m: 85 }, away: { t: "win", m: 87 } },
  { num: 97, ronda: "qf", home: { t: "win", m: 89 }, away: { t: "win", m: 90 } },
  { num: 98, ronda: "qf", home: { t: "win", m: 93 }, away: { t: "win", m: 94 } },
  { num: 99, ronda: "qf", home: { t: "win", m: 91 }, away: { t: "win", m: 92 } },
  { num: 100, ronda: "qf", home: { t: "win", m: 95 }, away: { t: "win", m: 96 } },
  { num: 101, ronda: "sf", home: { t: "win", m: 97 }, away: { t: "win", m: 98 } },
  { num: 102, ronda: "sf", home: { t: "win", m: 99 }, away: { t: "win", m: 100 } },
  { num: 103, ronda: "tercer", home: { t: "lose", m: 101 }, away: { t: "lose", m: 102 } },
  { num: 104, ronda: "final", home: { t: "win", m: 101 }, away: { t: "win", m: 102 } },
];

// Calendario oficial de eliminatorias (num -> kickoff UTC + sede).
// Horas originales en ET (EDT = UTC-4); aquí ya convertidas a UTC.
export const KO_SCHEDULE: Record<number, { kickoff: string; sede: string }> = {
  73: { kickoff: "2026-06-28T19:00:00Z", sede: "Inglewood (SoFi)" },
  74: { kickoff: "2026-06-29T20:30:00Z", sede: "Foxborough (Gillette)" },
  75: { kickoff: "2026-06-30T00:00:00Z", sede: "Guadalupe (BBVA)" },
  76: { kickoff: "2026-06-29T17:00:00Z", sede: "Houston (NRG)" },
  77: { kickoff: "2026-06-30T21:00:00Z", sede: "East Rutherford (MetLife)" },
  78: { kickoff: "2026-06-30T17:00:00Z", sede: "Arlington (AT&T)" },
  79: { kickoff: "2026-07-01T00:00:00Z", sede: "Ciudad de México (Azteca)" },
  80: { kickoff: "2026-07-01T17:00:00Z", sede: "Atlanta (Mercedes-Benz)" },
  81: { kickoff: "2026-07-01T23:00:00Z", sede: "Santa Clara (Levi's)" },
  82: { kickoff: "2026-07-01T20:00:00Z", sede: "Seattle (Lumen)" },
  83: { kickoff: "2026-07-02T23:00:00Z", sede: "Toronto (BMO)" },
  84: { kickoff: "2026-07-02T19:00:00Z", sede: "Inglewood (SoFi)" },
  85: { kickoff: "2026-07-03T03:00:00Z", sede: "Vancouver (BC Place)" },
  86: { kickoff: "2026-07-03T22:00:00Z", sede: "Miami Gardens (Hard Rock)" },
  87: { kickoff: "2026-07-04T01:30:00Z", sede: "Kansas City (Arrowhead)" },
  88: { kickoff: "2026-07-03T18:00:00Z", sede: "Arlington (AT&T)" },
  89: { kickoff: "2026-07-04T21:00:00Z", sede: "Philadelphia (Lincoln Financial)" },
  90: { kickoff: "2026-07-04T16:00:00Z", sede: "Houston (NRG)" },
  91: { kickoff: "2026-07-05T20:00:00Z", sede: "East Rutherford (MetLife)" },
  92: { kickoff: "2026-07-05T23:00:00Z", sede: "Ciudad de México (Azteca)" },
  93: { kickoff: "2026-07-06T18:00:00Z", sede: "Arlington (AT&T)" },
  94: { kickoff: "2026-07-07T00:00:00Z", sede: "Seattle (Lumen)" },
  95: { kickoff: "2026-07-07T16:00:00Z", sede: "Atlanta (Mercedes-Benz)" },
  96: { kickoff: "2026-07-07T20:00:00Z", sede: "Vancouver (BC Place)" },
  97: { kickoff: "2026-07-09T20:00:00Z", sede: "Foxborough (Gillette)" },
  98: { kickoff: "2026-07-10T19:00:00Z", sede: "Inglewood (SoFi)" },
  99: { kickoff: "2026-07-11T21:00:00Z", sede: "Miami Gardens (Hard Rock)" },
  100: { kickoff: "2026-07-12T01:00:00Z", sede: "Kansas City (Arrowhead)" },
  101: { kickoff: "2026-07-14T18:00:00Z", sede: "Arlington (AT&T)" },
  102: { kickoff: "2026-07-15T19:00:00Z", sede: "Atlanta (Mercedes-Benz)" },
  103: { kickoff: "2026-07-18T21:00:00Z", sede: "Miami Gardens (Hard Rock)" },
  104: { kickoff: "2026-07-19T19:00:00Z", sede: "East Rutherford (MetLife)" },
};

export type Tercero = { grupo: string; team: string };

// Asigna los 8 mejores terceros a las 8 llaves por emparejamiento válido
// (cada grupo a una llave cuyo conjunto elegible lo contenga). Los overrides
// (match_num -> equipo) fijan llaves manualmente. Devuelve match_num -> equipo.
export function asignarTerceros(
  mejores8: Tercero[],
  overrides: Map<number, string> = new Map()
): { mapa: Map<number, string>; ok: boolean } {
  const mapa = new Map<number, string>(overrides);
  const usados = new Set(overrides.values());
  const slots = THIRD_SLOTS.filter((s) => !overrides.has(s));
  const pendientes = mejores8.filter((t) => !usados.has(t.team));

  // backtracking: asignar slot más restringido primero
  const orden = [...slots].sort(
    (a, b) =>
      THIRD_ELIGIBLE[a].length - THIRD_ELIGIBLE[b].length || a - b
  );

  const asignados = new Map<number, string>();
  const usadosLocal = new Set<string>();

  function backtrack(i: number): boolean {
    if (i === orden.length) return true;
    const slot = orden[i];
    for (const t of pendientes) {
      if (usadosLocal.has(t.team)) continue;
      if (!THIRD_ELIGIBLE[slot].includes(t.grupo)) continue;
      asignados.set(slot, t.team);
      usadosLocal.add(t.team);
      if (backtrack(i + 1)) return true;
      asignados.delete(slot);
      usadosLocal.delete(t.team);
    }
    return false;
  }

  const ok = backtrack(0);
  if (ok) for (const [slot, team] of asignados) mapa.set(slot, team);
  return { mapa, ok };
}

export type KoState = {
  num: number;
  marcador_local: number | null;
  marcador_visitante: number | null;
  ganador: string | null;
};

export type ResolvedGame = {
  num: number;
  ronda: Ronda;
  home: string | null;
  away: string | null;
  homeLabel: string;
  awayLabel: string;
  marcador_local: number | null;
  marcador_visitante: number | null;
  ganador: string | null;
};

// Construye el cuadro resuelto a partir de los datos crudos (partidos de grupo,
// estado de eliminatoria y overrides de terceros). Centraliza la lógica usada
// por la llave, el admin y los pronósticos de eliminatoria.
export function construirCuadro(
  matchesGrupo: Match[],
  koRows: KoState[],
  thirdsOverrides: { match_num: number; equipo: string }[]
): Map<number, ResolvedGame> {
  const posPorGrupo = new Map(
    GRUPOS.map((g) => [
      g.letra,
      calcularPosiciones(
        g.equipos.map((e) => e.nombre),
        matchesGrupo.filter((m) => m.grupo === g.letra)
      ),
    ])
  );
  const terc8: Tercero[] = rankearTerceros(
    GRUPOS.map((g) => {
      const p = posPorGrupo.get(g.letra)!.find((x) => x.pos === 3)!;
      return { ...p, grupo: g.letra };
    })
  )
    .slice(0, 8)
    .map((t) => ({ grupo: t.grupo, team: t.team }));
  const overrides = new Map(thirdsOverrides.map((t) => [t.match_num, t.equipo]));
  const { mapa } = asignarTerceros(terc8, overrides);
  const koMap = new Map<number, KoState>(koRows.map((k) => [k.num, k]));
  return resolverCuadro(posPorGrupo, koMap, mapa);
}

// Cierre de pronóstico de un partido de eliminatoria: 30 min antes del kickoff.
export function cierreKo(num: number): Date | null {
  const s = KO_SCHEDULE[num];
  if (!s) return null;
  return new Date(new Date(s.kickoff).getTime() - 30 * 60_000);
}

// Un partido de eliminatoria es pronosticable si ya se conocen sus dos equipos
// y aún no llega el cierre.
export function koPronosticable(
  g: ResolvedGame,
  now: Date = new Date()
): boolean {
  if (!g.home || !g.away) return false;
  const c = cierreKo(g.num);
  return !!c && now.getTime() < c.getTime();
}

function labelSrc(src: Src): string {
  if (src.t === "pos") return `${src.p}º Grupo ${src.g}`;
  if (src.t === "third")
    return `3º (${THIRD_ELIGIBLE[src.m].join("/")})`;
  if (src.t === "win") return `Ganador #${src.m}`;
  return `Perdedor #${src.m}`;
}

// Resuelve todo el cuadro a partir de posiciones de grupo, estado de
// eliminatoria y asignación de terceros.
export function resolverCuadro(
  posicionesPorGrupo: Map<string, TeamStanding[]>,
  ko: Map<number, KoState>,
  terceros: Map<number, string>
): Map<number, ResolvedGame> {
  const out = new Map<number, ResolvedGame>();

  const resolver = (src: Src): string | null => {
    if (src.t === "pos") {
      const st = posicionesPorGrupo.get(src.g);
      return st?.[src.p - 1]?.team ?? null;
    }
    if (src.t === "third") return terceros.get(src.m) ?? null;
    const prev = out.get(src.m);
    if (!prev || !prev.ganador) return null;
    if (src.t === "win") return prev.ganador;
    // perdedor
    if (!prev.home || !prev.away) return null;
    return prev.ganador === prev.home ? prev.away : prev.home;
  };

  for (const g of BRACKET) {
    const home = resolver(g.home);
    const away = resolver(g.away);
    const st = ko.get(g.num);
    let ganador = st?.ganador ?? null;
    // Auto-deriva ganador si el marcador es decisivo y no se fijó manualmente.
    if (!ganador && st && st.marcador_local !== null && st.marcador_visitante !== null) {
      if (st.marcador_local > st.marcador_visitante) ganador = home;
      else if (st.marcador_visitante > st.marcador_local) ganador = away;
    }
    // El ganador debe ser uno de los dos equipos resueltos.
    if (ganador && ganador !== home && ganador !== away) ganador = null;
    out.set(g.num, {
      num: g.num,
      ronda: g.ronda,
      home,
      away,
      homeLabel: labelSrc(g.home),
      awayLabel: labelSrc(g.away),
      marcador_local: st?.marcador_local ?? null,
      marcador_visitante: st?.marcador_visitante ?? null,
      ganador,
    });
  }
  return out;
}
