"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  PUNTOS_GRUPO,
  calcularPozo,
  repartirPremio,
  FMT_MXN,
} from "@/lib/constants";

export type Fila = {
  participant_id: string;
  nombre: string;
  pago_confirmado: boolean;
  puntos_grupos: number;
  puntos_fases: number;
  puntos_comodin: number;
  puntos_partidos: number;
  total: number;
};

const MEDALLAS = ["🥇", "🥈", "🥉"];
const HIGHLIGHT = [
  "bg-amber-100 border-amber-400",
  "bg-slate-100 border-slate-400",
  "bg-orange-100 border-orange-400",
];

export default function Leaderboard({
  filasIniciales,
  hayResultadosInicial,
}: {
  filasIniciales: Fila[];
  hayResultadosInicial: boolean;
}) {
  const [filas, setFilas] = useState<Fila[]>(filasIniciales);
  const [hayResultados, setHayResultados] = useState(hayResultadosInicial);
  const [soloConfirmados, setSoloConfirmados] = useState(true);
  const supabase = useMemo(() => createBrowserClient(), []);

  const recargar = useCallback(async () => {
    const { data } = await supabase
      .from("participants")
      .select(
        "id, nombre, pago_confirmado, scores(puntos_grupos, puntos_fases, puntos_comodin, puntos_partidos, total)"
      );
    if (!data) return;
    const mapped: Fila[] = data.map((p: any) => {
      const s = Array.isArray(p.scores) ? p.scores[0] : p.scores;
      return {
        participant_id: p.id,
        nombre: p.nombre,
        pago_confirmado: p.pago_confirmado,
        puntos_grupos: s?.puntos_grupos ?? 0,
        puntos_fases: s?.puntos_fases ?? 0,
        puntos_comodin: s?.puntos_comodin ?? 0,
        puntos_partidos: s?.puntos_partidos ?? 0,
        total: s?.total ?? 0,
      };
    });
    setFilas(mapped);

    const { count } = await supabase
      .from("results")
      .select("id", { count: "exact", head: true });
    setHayResultados((count ?? 0) > 0);
  }, [supabase]);

  // Suscripción Realtime: ante cualquier cambio en scores o results, recargar.
  useEffect(() => {
    const channel = supabase
      .channel("leaderboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scores" },
        () => recargar()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "results" },
        () => recargar()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, recargar]);

  const visibles = useMemo(() => {
    const f = soloConfirmados
      ? filas.filter((x) => x.pago_confirmado)
      : filas;
    return [...f].sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre));
  }, [filas, soloConfirmados]);

  const confirmados = filas.filter((f) => f.pago_confirmado).length;
  const pozo = calcularPozo(confirmados);
  const premio = repartirPremio(pozo);

  return (
    <div>
      {/* Badge EN VIVO + pozo */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {hayResultados ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-rojo px-4 py-1.5 font-sans text-sm font-bold text-white">
            <span className="live-dot text-base leading-none">🔴</span> EN VIVO
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-navy/10 px-4 py-1.5 font-sans text-sm font-semibold text-navy/70">
            Aún sin resultados
          </span>
        )}
        <span className="font-sans text-sm text-navy/60">
          Pozo: <strong className="text-navy">{FMT_MXN.format(pozo)}</strong> ·{" "}
          {confirmados} confirmados
        </span>
      </div>

      {/* Panel de premio */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <PremioCard medalla="🥇" label="1er lugar" monto={premio.primero} />
        <PremioCard medalla="🥈" label="2do lugar" monto={premio.segundo} />
        <PremioCard medalla="🥉" label="3er lugar" monto={premio.tercero} />
      </div>

      {/* Toggle filtro */}
      <div className="mb-4 inline-flex overflow-hidden rounded-xl border-2 border-navy/15">
        <button
          onClick={() => setSoloConfirmados(true)}
          className={`px-4 py-2 font-sans text-sm font-semibold transition ${
            soloConfirmados ? "bg-navy text-crema" : "bg-white text-navy"
          }`}
        >
          Solo confirmados
        </button>
        <button
          onClick={() => setSoloConfirmados(false)}
          className={`px-4 py-2 font-sans text-sm font-semibold transition ${
            !soloConfirmados ? "bg-navy text-crema" : "bg-white text-navy"
          }`}
        >
          Ver todos
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border-2 border-navy/10 bg-white">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-navy text-crema">
              <th className="px-3 py-3 font-sans text-xs font-bold uppercase tracking-wider">
                #
              </th>
              <th className="px-3 py-3 font-sans text-xs font-bold uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-3 py-3 text-center font-sans text-xs font-bold uppercase tracking-wider">
                Grupos
              </th>
              <th className="hidden px-3 py-3 text-center font-sans text-xs font-bold uppercase tracking-wider sm:table-cell">
                Fases
              </th>
              <th className="hidden px-3 py-3 text-center font-sans text-xs font-bold uppercase tracking-wider sm:table-cell">
                Comodín
              </th>
              <th className="hidden px-3 py-3 text-center font-sans text-xs font-bold uppercase tracking-wider sm:table-cell">
                Partidos
              </th>
              <th className="px-3 py-3 text-center font-sans text-xs font-bold uppercase tracking-wider">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {visibles.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-8 text-center font-sans text-navy/50"
                >
                  Aún no hay participantes que mostrar.
                </td>
              </tr>
            )}
            {visibles.map((f, i) => (
              <tr
                key={f.participant_id}
                className={`border-t border-navy/10 ${
                  i < 3 ? HIGHLIGHT[i] : "bg-white"
                }`}
              >
                <td className="px-3 py-3 font-sans font-bold text-navy">
                  {i < 3 ? MEDALLAS[i] : i + 1}
                </td>
                <td className="px-3 py-3 font-sans font-semibold text-navy">
                  {f.nombre}
                  {!f.pago_confirmado && (
                    <span className="ml-2 align-middle text-xs font-normal text-amber-600">
                      ⏳
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-center font-sans tabular-nums text-navy">
                  {f.puntos_grupos / PUNTOS_GRUPO}/12
                </td>
                <td className="hidden px-3 py-3 text-center font-sans tabular-nums text-navy sm:table-cell">
                  {f.puntos_fases}
                </td>
                <td className="hidden px-3 py-3 text-center font-sans tabular-nums text-navy sm:table-cell">
                  {f.puntos_comodin}
                </td>
                <td className="hidden px-3 py-3 text-center font-sans tabular-nums text-navy sm:table-cell">
                  {f.puntos_partidos}
                </td>
                <td className="px-3 py-3 text-center font-serif text-xl font-bold text-rojo tabular-nums">
                  {f.total}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PremioCard({
  medalla,
  label,
  monto,
}: {
  medalla: string;
  label: string;
  monto: number;
}) {
  return (
    <div className="rounded-2xl border-2 border-navy/10 bg-white p-3 text-center">
      <p className="text-2xl">{medalla}</p>
      <p className="font-sans text-xs font-semibold uppercase tracking-wider text-navy/50">
        {label}
      </p>
      <p className="font-serif text-xl font-bold text-navy sm:text-2xl">
        {FMT_MXN.format(monto)}
      </p>
    </div>
  );
}
