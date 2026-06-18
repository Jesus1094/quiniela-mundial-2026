// Cálculo de posiciones de grupo con los criterios de desempate FIFA 2026.
//
// Orden FIFA 2026 (tras igualdad de puntos):
//   1. Puntos entre los equipos empatados (head-to-head)
//   2. Diferencia de goles entre los empatados
//   3. Goles a favor entre los empatados
//   4. Diferencia de goles general
//   5. Goles a favor general
//   6. Juego limpio (tarjetas)  ← no disponible (no se registran tarjetas)
//   7. Ranking FIFA             ← no disponible
// Los criterios 6 y 7 no se pueden calcular aquí; si dos equipos quedan
// idénticos hasta el criterio 5, se marcan como "empate por definir".

import type { Match } from "./matches";

export type TeamStanding = {
  team: string;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
  pos: number;
  zona: "directo" | "tercero" | "fuera"; // 1-2 clasifican, 3 mejor tercero, 4 fuera
  empatePendiente: boolean; // tie irresoluble con los criterios disponibles
};

type S = {
  team: string;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  pts: number;
};

const dg = (s: S) => s.gf - s.gc;

function nuevo(team: string): S {
  return { team, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 };
}

function jugado(m: Match): boolean {
  return m.marcador_local !== null && m.marcador_visitante !== null;
}

function acumular(map: Map<string, S>, m: Match) {
  const L = map.get(m.equipo_local);
  const V = map.get(m.equipo_visitante);
  if (!L || !V) return; // solo cuenta equipos que estamos rastreando
  const gl = m.marcador_local as number;
  const gv = m.marcador_visitante as number;
  L.pj++;
  V.pj++;
  L.gf += gl;
  L.gc += gv;
  V.gf += gv;
  V.gc += gl;
  if (gl > gv) {
    L.g++;
    L.pts += 3;
    V.p++;
  } else if (gl < gv) {
    V.g++;
    V.pts += 3;
    L.p++;
  } else {
    L.e++;
    V.e++;
    L.pts++;
    V.pts++;
  }
}

function statsDe(teams: string[], matches: Match[]): Map<string, S> {
  const map = new Map<string, S>();
  for (const t of teams) map.set(t, nuevo(t));
  for (const m of matches) if (jugado(m)) acumular(map, m);
  return map;
}

// Compara dos equipos dentro de un cluster empatado en puntos.
// Devuelve >0 si b va antes que a (orden descendente), 0 si idénticos.
function comparar(a: string, b: string, h2h: Map<string, S>, overall: Map<string, S>): number {
  const ha = h2h.get(a)!;
  const hb = h2h.get(b)!;
  if (hb.pts !== ha.pts) return hb.pts - ha.pts;
  if (dg(hb) !== dg(ha)) return dg(hb) - dg(ha);
  if (hb.gf !== ha.gf) return hb.gf - ha.gf;
  const oa = overall.get(a)!;
  const ob = overall.get(b)!;
  if (dg(ob) !== dg(oa)) return dg(ob) - dg(oa);
  if (ob.gf !== oa.gf) return ob.gf - oa.gf;
  return 0;
}

// Ordena un grupo de 4 equipos aplicando los criterios FIFA 2026.
export function calcularPosiciones(
  teams: string[],
  matches: Match[]
): TeamStanding[] {
  const overall = statsDe(teams, matches);

  // Clusters por puntos (descendente).
  const ptsUnicos = Array.from(
    new Set(teams.map((t) => overall.get(t)!.pts))
  ).sort((a, b) => b - a);

  const ordenados: string[] = [];
  const pendientes = new Set<string>();

  for (const pts of ptsUnicos) {
    const cluster = teams.filter((t) => overall.get(t)!.pts === pts);
    if (cluster.length === 1) {
      ordenados.push(cluster[0]);
      continue;
    }
    // Head-to-head: solo partidos entre los equipos del cluster.
    const h2hMatches = matches.filter(
      (m) =>
        cluster.includes(m.equipo_local) && cluster.includes(m.equipo_visitante)
    );
    const h2h = statsDe(cluster, h2hMatches);
    const orden = [...cluster].sort((a, b) => comparar(a, b, h2h, overall));
    // Marcar empates irresolubles (comparador = 0 entre adyacentes).
    for (let i = 0; i < orden.length - 1; i++) {
      if (comparar(orden[i], orden[i + 1], h2h, overall) === 0) {
        pendientes.add(orden[i]);
        pendientes.add(orden[i + 1]);
      }
    }
    ordenados.push(...orden);
  }

  return ordenados.map((team, i) => {
    const s = overall.get(team)!;
    return {
      team,
      pj: s.pj,
      g: s.g,
      e: s.e,
      p: s.p,
      gf: s.gf,
      gc: s.gc,
      dg: dg(s),
      pts: s.pts,
      pos: i + 1,
      zona: i < 2 ? "directo" : i === 2 ? "tercero" : "fuera",
      empatePendiente: pendientes.has(team),
    };
  });
}

// Ranking provisional de los 12 terceros (criterio FIFA: pts, dg, gf).
export type TercerLugar = TeamStanding & { grupo: string };

export function rankearTerceros(terceros: TercerLugar[]): TercerLugar[] {
  return [...terceros].sort(
    (a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf
  );
}
