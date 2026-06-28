"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { guardarPronosticosKo, type GuardarKoState } from "./actions";
import { banderaDe } from "@/lib/teams";
import {
  RONDA_LABEL,
  KO_SCHEDULE,
  koPronosticable,
  type ResolvedGame,
  type Ronda,
} from "@/lib/knockout";

const ORDEN: Ronda[] = ["r32", "r16", "qf", "sf", "tercer", "final"];

const fmt = new Intl.DateTimeFormat("es-MX", {
  timeZone: "America/Mexico_City",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function pts(g: ResolvedGame, p?: { pred_local: number; pred_visitante: number }) {
  if (g.marcador_local === null || g.marcador_visitante === null) return null;
  if (!p) return 0;
  const sg = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);
  if (p.pred_local === g.marcador_local && p.pred_visitante === g.marcador_visitante) return 5;
  if (sg(p.pred_local - p.pred_visitante) === sg(g.marcador_local - g.marcador_visitante)) return 2;
  return 0;
}

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

export default function EliminatoriasForm({
  participantId,
  games,
  iniciales,
}: {
  participantId: string;
  games: ResolvedGame[];
  iniciales: Record<number, { pred_local: number; pred_visitante: number }>;
}) {
  const [vals, setVals] = useState<Record<number, { l: string; v: string }>>(() => {
    const o: Record<number, { l: string; v: string }> = {};
    for (const g of games) {
      const p = iniciales[g.num];
      o[g.num] = { l: p ? String(p.pred_local) : "", v: p ? String(p.pred_visitante) : "" };
    }
    return o;
  });
  const [state, formAction] = useFormState<GuardarKoState, FormData>(guardarPronosticosKo, {});

  const set = (num: number, lado: "l" | "v", val: string) => {
    const limpio = val.replace(/[^0-9]/g, "").slice(0, 2);
    setVals((s) => ({ ...s, [num]: { ...s[num], [lado]: limpio } }));
  };

  const abiertos = useMemo(() => games.filter((g) => koPronosticable(g)), [games]);

  const payload = useMemo(() => {
    const now = new Date();
    return games
      .filter((g) => koPronosticable(g, now))
      .filter((g) => vals[g.num]?.l !== "" && vals[g.num]?.v !== "")
      .map((g) => ({ matchNum: g.num, local: Number(vals[g.num].l), visitante: Number(vals[g.num].v) }));
  }, [games, vals]);

  return (
    <form action={formAction}>
      <input type="hidden" name="participantId" value={participantId} />
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      <div className="flex flex-col gap-6">
        {ORDEN.map((ronda) => {
          const delRonda = games.filter((g) => g.ronda === ronda);
          return (
            <section key={ronda}>
              <h2 className="mb-2 font-serif text-2xl font-bold text-navy">
                {RONDA_LABEL[ronda]}
              </h2>
              <div className="flex flex-col gap-2">
                {delRonda.map((g) => {
                  const abierto = koPronosticable(g);
                  const definido = !!g.home && !!g.away;
                  const pred = iniciales[g.num];
                  const punt = pts(g, pred);
                  const sch = KO_SCHEDULE[g.num];
                  return (
                    <div
                      key={g.num}
                      className={`rounded-2xl border-2 p-3 ${
                        abierto ? "border-navy/10 bg-white" : "border-navy/10 bg-navy/[0.03]"
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between font-sans text-[11px] text-navy/50">
                        <span>
                          #{g.num}
                          {sch ? ` · ${fmt.format(new Date(sch.kickoff))} h · ${sch.sede}` : ""}
                        </span>
                        {abierto ? (
                          <span className="font-semibold text-green-700">Abierto</span>
                        ) : definido ? (
                          <span className="font-semibold text-rojo">🔒 Cerrado</span>
                        ) : (
                          <span className="text-navy/40">por definir</span>
                        )}
                      </div>

                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                        <div className="flex items-center justify-end gap-2 text-right">
                          <span className="font-sans text-sm font-semibold leading-tight text-navy">
                            {g.home ?? <span className="italic text-navy/40">{g.homeLabel}</span>}
                          </span>
                          {g.home && <span className="text-xl leading-none">{banderaDe(g.home)}</span>}
                        </div>

                        {abierto ? (
                          <div className="flex items-center gap-1">
                            <input
                              inputMode="numeric"
                              value={vals[g.num]?.l ?? ""}
                              onChange={(e) => set(g.num, "l", e.target.value)}
                              className="h-11 w-11 rounded-lg border-2 border-navy/15 bg-crema text-center font-serif text-xl font-bold text-navy outline-none focus:border-rojo"
                              placeholder="–"
                            />
                            <span className="font-bold text-navy/40">:</span>
                            <input
                              inputMode="numeric"
                              value={vals[g.num]?.v ?? ""}
                              onChange={(e) => set(g.num, "v", e.target.value)}
                              className="h-11 w-11 rounded-lg border-2 border-navy/15 bg-crema text-center font-serif text-xl font-bold text-navy outline-none focus:border-rojo"
                              placeholder="–"
                            />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <div className="font-serif text-xl font-bold text-navy">
                              {pred ? `${pred.pred_local} : ${pred.pred_visitante}` : "– : –"}
                            </div>
                            {g.marcador_local !== null && g.marcador_visitante !== null && (
                              <div className="font-sans text-[11px] text-navy/50">
                                real: {g.marcador_local} : {g.marcador_visitante}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          {g.away && <span className="text-xl leading-none">{banderaDe(g.away)}</span>}
                          <span className="font-sans text-sm font-semibold leading-tight text-navy">
                            {g.away ?? <span className="italic text-navy/40">{g.awayLabel}</span>}
                          </span>
                        </div>
                      </div>

                      {punt !== null && (
                        <div className="mt-2 text-center">
                          <span
                            className={`rounded-full px-3 py-0.5 font-sans text-xs font-bold ${
                              punt === 5
                                ? "bg-green-600 text-white"
                                : punt === 2
                                ? "bg-amber-400 text-navy"
                                : "bg-navy/10 text-navy/60"
                            }`}
                          >
                            {punt === 5 ? "🎯 Exacto +5" : punt === 2 ? "✔ Resultado +2" : "0 pts"}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="sticky bottom-0 -mx-5 mt-6 border-t-2 border-navy/10 bg-crema px-5 py-4">
        {state.error && (
          <p className="mb-3 rounded-xl border-2 border-rojo/30 bg-rojo/5 px-4 py-2 font-sans text-sm font-semibold text-rojo">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p className="mb-3 rounded-xl border-2 border-green-600/30 bg-green-50 px-4 py-2 font-sans text-sm font-semibold text-green-700">
            ✅ {state.guardados} pronóstico(s) guardado(s).
          </p>
        )}
        {abiertos.length === 0 ? (
          <p className="text-center font-sans text-sm text-navy/60">
            No hay partidos de eliminatoria abiertos por ahora. Se irán abriendo
            cuando se definan los equipos de cada llave.
          </p>
        ) : (
          <>
            <p className="mb-2 font-sans text-sm text-navy/60">
              {payload.length} de {abiertos.length} partidos abiertos con marcador
              capturado. Cada llave cierra 30 min antes de jugarse.
            </p>
            <GuardarBtn disabled={payload.length === 0} />
          </>
        )}
      </div>
    </form>
  );
}
