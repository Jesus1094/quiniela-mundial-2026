"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  guardarResultado,
  togglePago,
  guardarPartido,
  logout,
  type ResultadoState,
} from "./actions";
import { GRUPOS, TODOS_LOS_EQUIPOS, banderaDe } from "@/lib/teams";
import { TIPOS_FASE, calcularPozo, repartirPremio, FMT_MXN } from "@/lib/constants";
import { type Match, agruparPorDia, tieneResultado } from "@/lib/matches";

// Tipos de resultado que el admin puede cargar: 12 grupos + 4 fases.
const TIPOS_RESULTADO = [
  ...GRUPOS.map((g) => ({
    tipo: g.tipo,
    label: `Ganador Grupo ${g.letra}`,
    equipos: g.equipos,
  })),
  ...TIPOS_FASE.map((f) => ({
    tipo: f.tipo,
    label: f.label,
    equipos: TODOS_LOS_EQUIPOS,
  })),
];

const TOTAL_TIPOS_PREDICCION = GRUPOS.length + TIPOS_FASE.length + 1; // 17

export type AdminParticipant = {
  id: string;
  nombre: string;
  email: string;
  pago_confirmado: boolean;
  predsCount: number;
  total: number;
};

export type AdminResult = { tipo: string; equipo_ganador: string };

export default function AdminDashboard({
  participants,
  results,
  matches,
}: {
  participants: AdminParticipant[];
  results: AdminResult[];
  matches: Match[];
}) {
  const [tab, setTab] = useState<
    "resultados" | "partidos" | "participantes" | "premio"
  >("resultados");

  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-4xl font-bold text-navy">Panel admin</h1>
        <form action={logout}>
          <button className="rounded-xl border-2 border-navy/15 px-4 py-2 font-sans text-sm font-semibold text-navy hover:border-navy/40">
            Cerrar sesión
          </button>
        </form>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b-2 border-navy/10">
        <TabBtn activo={tab === "resultados"} onClick={() => setTab("resultados")}>
          Resultados
        </TabBtn>
        <TabBtn activo={tab === "partidos"} onClick={() => setTab("partidos")}>
          Partidos
        </TabBtn>
        <TabBtn
          activo={tab === "participantes"}
          onClick={() => setTab("participantes")}
        >
          Participantes
        </TabBtn>
        <TabBtn activo={tab === "premio"} onClick={() => setTab("premio")}>
          Premio
        </TabBtn>
      </div>

      {tab === "resultados" && <TabResultados results={results} />}
      {tab === "partidos" && <TabPartidos matches={matches} />}
      {tab === "participantes" && <TabParticipantes participants={participants} />}
      {tab === "premio" && <TabPremio participants={participants} />}
    </main>
  );
}

function TabBtn({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-0.5 border-b-2 px-4 py-2 font-sans text-sm font-bold transition ${
        activo
          ? "border-rojo text-rojo"
          : "border-transparent text-navy/50 hover:text-navy"
      }`}
    >
      {children}
    </button>
  );
}

// ── Tab 1: Resultados ────────────────────────────────────────────────
function GuardarResultadoBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-rojo px-6 py-3 font-sans font-bold text-white transition hover:bg-rojo/90 disabled:opacity-50"
    >
      {pending ? "Guardando…" : "Guardar resultado"}
    </button>
  );
}

function TabResultados({ results }: { results: AdminResult[] }) {
  const [state, action] = useFormState<ResultadoState, FormData>(
    guardarResultado,
    {}
  );
  const [tipoSel, setTipoSel] = useState("");
  const [equipoSel, setEquipoSel] = useState("");

  const cfg = TIPOS_RESULTADO.find((t) => t.tipo === tipoSel);
  const cargados = new Map(results.map((r) => [r.tipo, r.equipo_ganador]));

  return (
    <div>
      <p className="mb-4 font-sans text-sm text-navy/60">
        Al guardar un resultado, el sistema recalcula automáticamente los
        puntajes de todos los participantes.
      </p>

      <form
        action={action}
        className="mb-8 flex flex-col gap-3 rounded-2xl border-2 border-navy/10 bg-white p-5 sm:flex-row sm:items-end"
      >
        <label className="flex flex-1 flex-col gap-1">
          <span className="font-sans text-sm font-semibold text-navy">
            Tipo de resultado
          </span>
          <select
            name="tipo"
            value={tipoSel}
            onChange={(e) => {
              setTipoSel(e.target.value);
              setEquipoSel("");
            }}
            required
            className="rounded-xl border-2 border-navy/15 bg-crema px-4 py-3 font-sans text-navy outline-none focus:border-rojo"
          >
            <option value="">— Selecciona —</option>
            {TIPOS_RESULTADO.map((t) => (
              <option key={t.tipo} value={t.tipo}>
                {t.label} {cargados.has(t.tipo) ? "✓" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="font-sans text-sm font-semibold text-navy">
            Equipo ganador
          </span>
          <select
            name="equipo_ganador"
            value={equipoSel}
            onChange={(e) => setEquipoSel(e.target.value)}
            required
            disabled={!cfg}
            className="rounded-xl border-2 border-navy/15 bg-crema px-4 py-3 font-sans text-navy outline-none focus:border-rojo disabled:opacity-50"
          >
            <option value="">— Selecciona —</option>
            {cfg?.equipos.map((eq) => (
              <option key={eq.nombre} value={eq.nombre}>
                {eq.bandera} {eq.nombre}
              </option>
            ))}
          </select>
        </label>

        <GuardarResultadoBtn />
      </form>

      {state.error && (
        <p className="mb-4 font-sans text-sm font-semibold text-rojo">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="mb-4 font-sans text-sm font-semibold text-green-700">
          ✅ Resultado guardado y puntajes recalculados.
        </p>
      )}

      <h3 className="mb-3 font-serif text-2xl font-bold text-navy">
        Resultados cargados ({results.length}/{TIPOS_RESULTADO.length})
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {TIPOS_RESULTADO.map((t) => {
          const ganador = cargados.get(t.tipo);
          return (
            <div
              key={t.tipo}
              className={`flex items-center justify-between rounded-xl border-2 px-4 py-2 ${
                ganador
                  ? "border-green-600/30 bg-green-50"
                  : "border-navy/10 bg-white"
              }`}
            >
              <span className="font-sans text-sm font-semibold text-navy">
                {t.label}
              </span>
              <span className="font-sans text-sm text-navy/70">
                {ganador ? (
                  <>
                    {banderaDe(ganador)} {ganador}
                  </>
                ) : (
                  <span className="text-navy/30">pendiente</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab: Partidos ────────────────────────────────────────────────────
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(
    d.getHours()
  )}:${p(d.getMinutes())}`;
}

function MatchRowAdmin({ m }: { m: Match }) {
  const [local, setLocal] = useState(m.marcador_local?.toString() ?? "");
  const [visit, setVisit] = useState(m.marcador_visitante?.toString() ?? "");
  const [ko, setKo] = useState(isoToLocalInput(m.kickoff));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const num = (s: string) => s.replace(/[^0-9]/g, "").slice(0, 2);

  const save = () => {
    setMsg(null);
    const ml = local.trim() === "" ? null : Number(local);
    const mv = visit.trim() === "" ? null : Number(visit);
    start(async () => {
      const res = await guardarPartido({
        matchId: m.id,
        marcadorLocal: ml,
        marcadorVisitante: mv,
        kickoff: new Date(ko).toISOString(),
      });
      setMsg(res.error ?? "✅");
    });
  };

  return (
    <div className="rounded-xl border-2 border-navy/10 bg-white p-3">
      <div className="mb-2 flex items-center justify-between font-sans text-xs text-navy/50">
        <span>Grupo {m.grupo}</span>
        <span>{tieneResultado(m) ? "resultado cargado ✓" : ""}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span className="text-right font-sans text-sm font-semibold text-navy">
          {banderaDe(m.equipo_local)} {m.equipo_local}
        </span>
        <div className="flex items-center gap-1">
          <input
            inputMode="numeric"
            value={local}
            onChange={(e) => setLocal(num(e.target.value))}
            placeholder="–"
            className="h-10 w-10 rounded-lg border-2 border-navy/15 bg-crema text-center font-serif text-lg font-bold text-navy outline-none focus:border-rojo"
          />
          <span className="font-bold text-navy/40">:</span>
          <input
            inputMode="numeric"
            value={visit}
            onChange={(e) => setVisit(num(e.target.value))}
            placeholder="–"
            className="h-10 w-10 rounded-lg border-2 border-navy/15 bg-crema text-center font-serif text-lg font-bold text-navy outline-none focus:border-rojo"
          />
        </div>
        <span className="font-sans text-sm font-semibold text-navy">
          {banderaDe(m.equipo_visitante)} {m.equipo_visitante}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="font-sans text-xs text-navy/50">
          Inicio (tu hora local):
        </label>
        <input
          type="datetime-local"
          value={ko}
          onChange={(e) => setKo(e.target.value)}
          className="rounded-lg border-2 border-navy/15 bg-crema px-2 py-1 font-sans text-xs text-navy outline-none focus:border-rojo"
        />
        <button
          onClick={save}
          disabled={pending}
          className="ml-auto rounded-lg bg-rojo px-4 py-1.5 font-sans text-xs font-bold text-white hover:bg-rojo/90 disabled:opacity-50"
        >
          {pending ? "…" : "Guardar"}
        </button>
        {msg && (
          <span className="font-sans text-xs font-semibold text-green-700">
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}

function TabPartidos({ matches }: { matches: Match[] }) {
  const dias = agruparPorDia(matches);
  const conResultado = matches.filter(tieneResultado).length;

  return (
    <div>
      <p className="mb-4 font-sans text-sm text-navy/60">
        Carga el marcador final de cada partido (ambos números). Al guardar, los
        puntos por partido se recalculan automáticamente. También puedes ajustar
        la fecha/hora de inicio de cada partido.{" "}
        <strong>{conResultado}</strong> de {matches.length} con resultado.
      </p>
      <div className="flex flex-col gap-6">
        {dias.map(({ dia, partidos }) => (
          <section key={dia}>
            <h3 className="mb-2 font-serif text-xl font-bold capitalize text-navy">
              {dia}
            </h3>
            <div className="flex flex-col gap-2">
              {partidos.map((m) => (
                <MatchRowAdmin key={m.id} m={m} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

// ── Tab 2: Participantes ─────────────────────────────────────────────
function TabParticipantes({
  participants,
}: {
  participants: AdminParticipant[];
}) {
  const [isPending, startTransition] = useTransition();
  const [optimista, setOptimista] = useState<Record<string, boolean>>({});

  const estado = (p: AdminParticipant) =>
    optimista[p.id] ?? p.pago_confirmado;

  const confirmados = participants.filter((p) => estado(p)).length;
  const pozo = calcularPozo(confirmados);

  const toggle = (p: AdminParticipant) => {
    const nuevo = !estado(p);
    setOptimista((o) => ({ ...o, [p.id]: nuevo }));
    startTransition(async () => {
      const res = await togglePago(p.id, nuevo);
      if (res.error) {
        // revertir
        setOptimista((o) => ({ ...o, [p.id]: !nuevo }));
        alert(res.error);
      }
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-4 rounded-2xl border-2 border-navy/10 bg-white p-4 font-sans text-sm">
        <span>
          <strong className="text-navy">{participants.length}</strong>{" "}
          participantes
        </span>
        <span>
          <strong className="text-green-700">{confirmados}</strong> pagos
          confirmados
        </span>
        <span>
          Pozo: <strong className="text-rojo">{FMT_MXN.format(pozo)}</strong>
        </span>
        {isPending && <span className="text-navy/40">guardando…</span>}
      </div>

      <div className="overflow-x-auto rounded-2xl border-2 border-navy/10 bg-white">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-navy text-crema">
              <th className="px-3 py-3 font-sans text-xs font-bold uppercase">
                Nombre
              </th>
              <th className="px-3 py-3 font-sans text-xs font-bold uppercase">
                Email
              </th>
              <th className="px-3 py-3 text-center font-sans text-xs font-bold uppercase">
                Predicciones
              </th>
              <th className="px-3 py-3 text-center font-sans text-xs font-bold uppercase">
                Puntos
              </th>
              <th className="px-3 py-3 text-center font-sans text-xs font-bold uppercase">
                Pago
              </th>
            </tr>
          </thead>
          <tbody>
            {participants.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-navy/50">
                  Aún no hay participantes registrados.
                </td>
              </tr>
            )}
            {participants.map((p) => {
              const completas = p.predsCount >= TOTAL_TIPOS_PREDICCION;
              const pagado = estado(p);
              return (
                <tr key={p.id} className="border-t border-navy/10">
                  <td className="px-3 py-3 font-sans font-semibold text-navy">
                    {p.nombre}
                  </td>
                  <td className="px-3 py-3 font-sans text-sm text-navy/70">
                    {p.email}
                  </td>
                  <td className="px-3 py-3 text-center font-sans text-sm">
                    {completas ? (
                      <span className="font-semibold text-green-700">
                        Sí ({p.predsCount}/{TOTAL_TIPOS_PREDICCION})
                      </span>
                    ) : (
                      <span className="text-amber-600">
                        No ({p.predsCount}/{TOTAL_TIPOS_PREDICCION})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center font-serif text-lg font-bold text-navy">
                    {p.total}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <button
                      onClick={() => toggle(p)}
                      className={`rounded-full px-3 py-1.5 font-sans text-xs font-bold transition ${
                        pagado
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                      }`}
                    >
                      {pagado ? "✅ Confirmado" : "⏳ Pendiente"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab 3: Premio ────────────────────────────────────────────────────
function TabPremio({ participants }: { participants: AdminParticipant[] }) {
  const confirmados = participants.filter((p) => p.pago_confirmado).length;
  const pozo = calcularPozo(confirmados);
  const premio = repartirPremio(pozo);

  return (
    <div>
      <div className="mb-6 rounded-2xl border-2 border-navy/10 bg-white p-6 text-center">
        <p className="font-sans text-xs font-semibold uppercase tracking-widest text-navy/50">
          Pozo total ({confirmados} confirmados)
        </p>
        <p className="font-serif text-5xl font-bold text-rojo">
          {FMT_MXN.format(pozo)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PremioCard medalla="🥇" label="1er lugar (60%)" monto={premio.primero} />
        <PremioCard medalla="🥈" label="2do lugar (25%)" monto={premio.segundo} />
        <PremioCard medalla="🥉" label="3er lugar (15%)" monto={premio.tercero} />
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
    <div className="rounded-2xl border-2 border-navy/10 bg-white p-5 text-center">
      <p className="text-3xl">{medalla}</p>
      <p className="font-sans text-xs font-semibold uppercase tracking-wider text-navy/50">
        {label}
      </p>
      <p className="font-serif text-3xl font-bold text-navy">
        {FMT_MXN.format(monto)}
      </p>
    </div>
  );
}
