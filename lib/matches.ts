// Helpers para el módulo de pronósticos por partido.
import { TIMEZONE } from "./constants";

export type Match = {
  id: string;
  grupo: string;
  equipo_local: string;
  equipo_visitante: string;
  kickoff: string; // ISO UTC
  marcador_local: number | null;
  marcador_visitante: number | null;
  orden: number;
};

export type MatchPrediction = {
  match_id: string;
  pred_local: number;
  pred_visitante: number;
};

// Puntaje: 5 pts marcador exacto, 2 pts solo el resultado (1-X-2), 0 si falla.
export const PTS_MARCADOR_EXACTO = 5;
export const PTS_RESULTADO = 2;

// Cierre de pronóstico: 30 minutos antes del kickoff.
export const MINUTOS_CIERRE_ANTES = 30;

export function cierreDe(match: { kickoff: string }): Date {
  return new Date(
    new Date(match.kickoff).getTime() - MINUTOS_CIERRE_ANTES * 60_000
  );
}

export function partidoAbierto(
  match: { kickoff: string },
  now: Date = new Date()
): boolean {
  return now.getTime() < cierreDe(match).getTime();
}

export function tieneResultado(m: {
  marcador_local: number | null;
  marcador_visitante: number | null;
}): boolean {
  return m.marcador_local !== null && m.marcador_visitante !== null;
}

const signo = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);

// Puntos de un pronóstico contra el marcador real. Devuelve null si aún no hay resultado.
export function puntosDePronostico(
  m: { marcador_local: number | null; marcador_visitante: number | null },
  pred: { pred_local: number; pred_visitante: number } | undefined
): number | null {
  if (!tieneResultado(m)) return null;
  if (!pred) return 0;
  const ml = m.marcador_local as number;
  const mv = m.marcador_visitante as number;
  if (pred.pred_local === ml && pred.pred_visitante === mv) {
    return PTS_MARCADOR_EXACTO;
  }
  if (signo(pred.pred_local - pred.pred_visitante) === signo(ml - mv)) {
    return PTS_RESULTADO;
  }
  return 0;
}

// Etiqueta de día (jornada) en zona horaria de México, p.ej. "jueves 11 de junio".
const fmtDia = new Intl.DateTimeFormat("es-MX", {
  timeZone: TIMEZONE,
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function diaDe(match: { kickoff: string }): string {
  return fmtDia.format(new Date(match.kickoff));
}

// Hora local de México, p.ej. "11:00".
const fmtHora = new Intl.DateTimeFormat("es-MX", {
  timeZone: TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function horaDe(match: { kickoff: string }): string {
  return fmtHora.format(new Date(match.kickoff));
}

// Agrupa partidos por día (en orden cronológico), preservando el orden interno.
export function agruparPorDia<T extends { kickoff: string; orden: number }>(
  matches: T[]
): { dia: string; partidos: T[] }[] {
  const orden = [...matches].sort((a, b) => a.orden - b.orden);
  const grupos: { dia: string; partidos: T[] }[] = [];
  for (const m of orden) {
    const d = diaDe(m);
    let g = grupos.find((x) => x.dia === d);
    if (!g) {
      g = { dia: d, partidos: [] };
      grupos.push(g);
    }
    g.partidos.push(m);
  }
  return grupos;
}
