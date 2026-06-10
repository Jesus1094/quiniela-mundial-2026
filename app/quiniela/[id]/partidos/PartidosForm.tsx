"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { guardarPronosticos, type GuardarPartidosState } from "./actions";
import { banderaDe } from "@/lib/teams";
import {
  type Match,
  agruparPorDia,
  partidoAbierto,
  horaDe,
  tieneResultado,
  puntosDePronostico,
} from "@/lib/matches";

type Val = { local: string; visitante: string };

function GuardarBtn({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="w-full rounded-xl bg-rojo px-6 py-4 font-sans text-lg font-bold text-white transition hover:bg-rojo/90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Guardando…" : "Guardar pronósticos"}
    </button>
  );
}

export default function PartidosForm({
  participantId,
  matches,
  iniciales,
}: {
  participantId: string;
  matches: Match[];
  iniciales: Record<string, { pred_local: number; pred_visitante: number }>;
}) {
  const [vals, setVals] = useState<Record<string, Val>>(() => {
    const o: Record<string, Val> = {};
    for (const m of matches) {
      const p = iniciales[m.id];
      o[m.id] = {
        local: p ? String(p.pred_local) : "",
        visitante: p ? String(p.pred_visitante) : "",
      };
    }
    return o;
  });

  const [state, formAction] = useFormState<GuardarPartidosState, FormData>(
    guardarPronosticos,
    {}
  );

  const dias = useMemo(() => agruparPorDia(matches), [matches]);

  const set = (id: string, lado: keyof Val, v: string) => {
    const limpio = v.replace(/[^0-9]/g, "").slice(0, 2);
    setVals((s) => ({ ...s, [id]: { ...s[id], [lado]: limpio } }));
  };

  // Payload = solo partidos ABIERTOS con ambos marcadores capturados.
  const payload = useMemo(() => {
    const now = new Date();
    return matches
      .filter((m) => partidoAbierto(m, now))
      .filter((m) => vals[m.id]?.local !== "" && vals[m.id]?.visitante !== "")
      .map((m) => ({
        matchId: m.id,
        local: Number(vals[m.id].local),
        visitante: Number(vals[m.id].visitante),
      }));
  }, [matches, vals]);

  const abiertos = useMemo(
    () => matches.filter((m) => partidoAbierto(m)).length,
    [matches]
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="participantId" value={participantId} />
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      <div className="flex flex-col gap-6">
        {dias.map(({ dia, partidos }) => (
          <section key={dia}>
            <h2 className="sticky top-0 z-10 -mx-5 bg-crema px-5 py-2 font-serif text-2xl font-bold capitalize text-navy">
              {dia}
            </h2>
            <div className="flex flex-col gap-2">
              {partidos.map((m) => {
                const abierto = partidoAbierto(m);
                const conResultado = tieneResultado(m);
                const pred = iniciales[m.id];
                const pts = puntosDePronostico(m, pred);
                return (
                  <div
                    key={m.id}
                    className={`rounded-2xl border-2 p-3 ${
                      abierto
                        ? "border-navy/10 bg-white"
                        : "border-navy/10 bg-navy/[0.03]"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between font-sans text-xs text-navy/50">
                      <span>
                        Grupo {m.grupo} · {horaDe(m)} h
                      </span>
                      {abierto ? (
                        <span className="font-semibold text-green-700">
                          Abierto
                        </span>
                      ) : (
                        <span className="font-semibold text-rojo">
                          🔒 Cerrado
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      {/* Local */}
                      <div className="flex items-center justify-end gap-2 text-right">
                        <span className="font-sans text-sm font-semibold leading-tight text-navy">
                          {m.equipo_local}
                        </span>
                        <span className="text-xl leading-none">
                          {banderaDe(m.equipo_local)}
                        </span>
                      </div>

                      {/* Marcadores */}
                      {abierto ? (
                        <div className="flex items-center gap-1">
                          <input
                            inputMode="numeric"
                            value={vals[m.id]?.local ?? ""}
                            onChange={(e) => set(m.id, "local", e.target.value)}
                            className="h-11 w-11 rounded-lg border-2 border-navy/15 bg-crema text-center font-serif text-xl font-bold text-navy outline-none focus:border-rojo"
                            placeholder="–"
                          />
                          <span className="font-bold text-navy/40">:</span>
                          <input
                            inputMode="numeric"
                            value={vals[m.id]?.visitante ?? ""}
                            onChange={(e) =>
                              set(m.id, "visitante", e.target.value)
                            }
                            className="h-11 w-11 rounded-lg border-2 border-navy/15 bg-crema text-center font-serif text-xl font-bold text-navy outline-none focus:border-rojo"
                            placeholder="–"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          {/* Tu pronóstico (read-only) */}
                          <div className="font-serif text-xl font-bold text-navy">
                            {pred ? `${pred.pred_local} : ${pred.pred_visitante}` : "– : –"}
                          </div>
                          {conResultado && (
                            <div className="font-sans text-[11px] text-navy/50">
                              real: {m.marcador_local} : {m.marcador_visitante}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Visitante */}
                      <div className="flex items-center gap-2">
                        <span className="text-xl leading-none">
                          {banderaDe(m.equipo_visitante)}
                        </span>
                        <span className="font-sans text-sm font-semibold leading-tight text-navy">
                          {m.equipo_visitante}
                        </span>
                      </div>
                    </div>

                    {pts !== null && (
                      <div className="mt-2 text-center">
                        <span
                          className={`rounded-full px-3 py-0.5 font-sans text-xs font-bold ${
                            pts === 5
                              ? "bg-green-600 text-white"
                              : pts === 2
                              ? "bg-amber-400 text-navy"
                              : "bg-navy/10 text-navy/60"
                          }`}
                        >
                          {pts === 5
                            ? "🎯 ¡Marcador exacto! +5"
                            : pts === 2
                            ? "✔ Resultado +2"
                            : "0 pts"}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Guardar */}
      <div className="sticky bottom-0 -mx-5 mt-6 border-t-2 border-navy/10 bg-crema px-5 py-4">
        {state.error && (
          <p className="mb-3 rounded-xl border-2 border-rojo/30 bg-rojo/5 px-4 py-2 font-sans text-sm font-semibold text-rojo">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="mb-3 rounded-xl border-2 border-green-600/30 bg-green-50 px-4 py-2 font-sans text-sm font-semibold text-green-700">
            ✅ {state.guardados} pronóstico(s) guardado(s).
            {state.cerrados ? ` (${state.cerrados} ya estaban cerrados)` : ""}
          </p>
        )}
        {abiertos === 0 ? (
          <p className="text-center font-sans text-sm text-navy/60">
            No hay partidos abiertos para pronosticar en este momento.
          </p>
        ) : (
          <>
            <p className="mb-2 font-sans text-sm text-navy/60">
              {payload.length} de {abiertos} partidos abiertos con marcador
              capturado. Puedes editar hasta 30 min antes de cada partido.
            </p>
            <GuardarBtn disabled={payload.length === 0} />
          </>
        )}
      </div>
    </form>
  );
}
