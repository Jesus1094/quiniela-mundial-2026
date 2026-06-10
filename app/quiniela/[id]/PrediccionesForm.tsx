"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { guardarPredicciones, type GuardarState } from "./actions";
import { GRUPOS, TODOS_LOS_EQUIPOS } from "@/lib/teams";
import { TIPOS_FASE } from "@/lib/constants";

type Selecciones = Record<string, string>;

const TODOS_LOS_TIPOS = [
  ...GRUPOS.map((g) => g.tipo),
  ...TIPOS_FASE.map((f) => f.tipo),
  "comodin",
];

function GuardarBtn({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="w-full rounded-xl bg-rojo px-6 py-4 font-sans text-lg font-bold text-white transition hover:bg-rojo/90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Guardando…" : "Guardar predicciones"}
    </button>
  );
}

export default function PrediccionesForm({
  participantId,
  iniciales,
  readOnly,
}: {
  participantId: string;
  iniciales: Selecciones;
  readOnly: boolean;
}) {
  const [sel, setSel] = useState<Selecciones>(iniciales);
  const [state, formAction] = useFormState<GuardarState, FormData>(
    guardarPredicciones,
    {}
  );

  const set = (tipo: string, equipo: string) =>
    setSel((s) => ({ ...s, [tipo]: equipo }));

  const completas = useMemo(
    () => TODOS_LOS_TIPOS.every((t) => sel[t]),
    [sel]
  );
  const faltan = TODOS_LOS_TIPOS.filter((t) => !sel[t]).length;

  return (
    <form action={formAction}>
      <input type="hidden" name="participantId" value={participantId} />
      {/* Inputs ocultos que reflejan el estado controlado para el submit. */}
      {TODOS_LOS_TIPOS.map((t) => (
        <input key={t} type="hidden" name={t} value={sel[t] ?? ""} />
      ))}

      {/* ── Sección 1: Ganadores de grupo ───────────────────────────── */}
      <section className="mb-10">
        <h2 className="font-serif text-3xl font-bold text-navy">
          1 · Ganadores de grupo
        </h2>
        <p className="mb-5 font-sans text-sm text-navy/60">
          Elige el equipo que terminará 1º en cada grupo. 3 pts por acierto.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {GRUPOS.map((g) => (
            <fieldset
              key={g.tipo}
              className="rounded-2xl border-2 border-navy/10 bg-white p-4"
            >
              <legend className="px-2 font-serif text-xl font-bold text-rojo">
                Grupo {g.letra}
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {g.equipos.map((eq) => {
                  const activo = sel[g.tipo] === eq.nombre;
                  return (
                    <button
                      type="button"
                      key={eq.nombre}
                      disabled={readOnly}
                      onClick={() => set(g.tipo, eq.nombre)}
                      className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-left font-sans text-sm font-semibold transition disabled:cursor-not-allowed ${
                        activo
                          ? "border-rojo bg-rojo text-white"
                          : "border-navy/15 bg-crema text-navy hover:border-navy/40"
                      }`}
                    >
                      <span className="text-lg leading-none">{eq.bandera}</span>
                      <span className="leading-tight">{eq.nombre}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      {/* ── Sección 2: Fase final ───────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="font-serif text-3xl font-bold text-navy">
          2 · Fase final
        </h2>
        <p className="mb-5 font-sans text-sm text-navy/60">
          ¿Quién quedará en cada posición del podio?
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {TIPOS_FASE.map((f) => (
            <label key={f.tipo} className="flex flex-col gap-1">
              <span className="font-sans text-sm font-semibold text-navy">
                {f.label}{" "}
                <span className="font-normal text-navy/50">
                  ({f.puntos} pts)
                </span>
              </span>
              <select
                disabled={readOnly}
                value={sel[f.tipo] ?? ""}
                onChange={(e) => set(f.tipo, e.target.value)}
                className="rounded-xl border-2 border-navy/15 bg-white px-4 py-3 font-sans text-navy outline-none focus:border-rojo disabled:opacity-70"
              >
                <option value="">— Selecciona un equipo —</option>
                {TODOS_LOS_EQUIPOS.map((eq) => (
                  <option key={eq.nombre} value={eq.nombre}>
                    {eq.bandera} {eq.nombre}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>

      {/* ── Sección 3: Comodín ──────────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="flex items-center gap-2 font-serif text-3xl font-bold text-navy">
          3 · Comodín
          <span className="group relative inline-flex">
            <span className="flex h-6 w-6 cursor-help items-center justify-center rounded-full bg-navy text-xs font-bold text-crema">
              ?
            </span>
            <span className="pointer-events-none absolute left-1/2 top-8 z-10 w-64 -translate-x-1/2 rounded-xl bg-navy px-4 py-3 font-sans text-xs font-normal leading-relaxed text-crema opacity-0 shadow-lg transition group-hover:opacity-100">
              El equipo que más sorprende: el que llegue más lejos de lo
              esperado. Ganas 10 pts si tu comodín llega a cuartos de final o
              más (cuartos, semifinal o final).
            </span>
          </span>
        </h2>
        <p className="mb-5 font-sans text-sm text-navy/60">
          El equipo sorpresa del torneo. 10 pts si llega a cuartos o más.
        </p>

        <label className="flex max-w-md flex-col gap-1">
          <span className="font-sans text-sm font-semibold text-navy">
            Mi comodín
          </span>
          <select
            disabled={readOnly}
            value={sel["comodin"] ?? ""}
            onChange={(e) => set("comodin", e.target.value)}
            className="rounded-xl border-2 border-navy/15 bg-white px-4 py-3 font-sans text-navy outline-none focus:border-rojo disabled:opacity-70"
          >
            <option value="">— Selecciona un equipo —</option>
            {TODOS_LOS_EQUIPOS.map((eq) => (
              <option key={eq.nombre} value={eq.nombre}>
                {eq.bandera} {eq.nombre}
              </option>
            ))}
          </select>
        </label>
      </section>

      {/* ── Guardar ─────────────────────────────────────────────────── */}
      {!readOnly && (
        <div className="sticky bottom-0 -mx-5 border-t-2 border-navy/10 bg-crema px-5 py-4">
          {state.error && (
            <p className="mb-3 rounded-xl border-2 border-rojo/30 bg-rojo/5 px-4 py-2 font-sans text-sm font-semibold text-rojo">
              {state.error}
            </p>
          )}
          {state.ok && (
            <p className="mb-3 rounded-xl border-2 border-green-600/30 bg-green-50 px-4 py-2 font-sans text-sm font-semibold text-green-700">
              ✅ ¡Predicciones guardadas! Puedes editarlas hasta la fecha de
              corte.
            </p>
          )}
          {!completas && (
            <p className="mb-3 font-sans text-sm text-navy/60">
              Te faltan {faltan} predicciones por completar.
            </p>
          )}
          <GuardarBtn disabled={!completas} />
        </div>
      )}
    </form>
  );
}
