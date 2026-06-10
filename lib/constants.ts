// Constantes de la quiniela: fechas, tipos de predicción y puntajes.

export const TIMEZONE = "America/Mexico_City";

// Fecha de corte: 11 de junio de 2026, 11:00 AM hora de Ciudad de México (UTC-6, sin horario de verano).
// 11:00 CDT == 17:00 UTC.
export const CUTOFF_ISO = "2026-06-11T17:00:00.000Z";
export const CUTOFF_DATE = new Date(CUTOFF_ISO);

// Inicio y fin del torneo (referencia).
export const TORNEO_INICIO = new Date("2026-06-11T17:00:00.000Z");
export const TORNEO_FIN = new Date("2026-07-19T23:00:00.000Z");

export const CUOTA = Number(process.env.NEXT_PUBLIC_CUOTA ?? "200");
export const GRUPO_NOMBRE =
  process.env.NEXT_PUBLIC_GRUPO_NOMBRE ?? "La Quiniela";

// Tipos de predicción de fase final (no-grupos).
export const TIPOS_FASE = [
  { tipo: "cuarto", label: "4º lugar del torneo", puntos: 5 },
  { tipo: "tercero", label: "3er lugar del torneo", puntos: 8 },
  { tipo: "subcampeon", label: "Subcampeón", puntos: 15 },
  { tipo: "campeon", label: "Campeón", puntos: 25 },
] as const;

export const PUNTOS_GRUPO = 3;
export const PUNTOS_COMODIN = 10;
export const PUNTAJE_MAXIMO = 99;

// Reparto del pozo.
export const REPARTO = {
  primero: 0.6,
  segundo: 0.25,
  tercero: 0.15,
} as const;

// Antes del corte se pueden registrar / guardar predicciones.
export function corteAlcanzado(now: Date = new Date()): boolean {
  return now.getTime() >= CUTOFF_DATE.getTime();
}

export function calcularPozo(participantesPagados: number): number {
  return participantesPagados * CUOTA;
}

export function repartirPremio(pozo: number) {
  return {
    primero: Math.round(pozo * REPARTO.primero),
    segundo: Math.round(pozo * REPARTO.segundo),
    tercero: Math.round(pozo * REPARTO.tercero),
  };
}

export const FMT_MXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});
