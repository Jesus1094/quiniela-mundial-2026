"use client";

import { useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  guardarResultado,
  togglePago,
  guardarPartido,
  guardarKnockout,
  guardarTercero,
  logout,
  type ResultadoState,
} from "./actions";
import { GRUPOS, TODOS_LOS_EQUIPOS, banderaDe } from "@/lib/teams";
import { TIPOS_FASE, calcularPozo, repartirPremio, FMT_MXN } from "@/lib/constants";
import { type Match, agruparPorDia, tieneResultado } from "@/lib/matches";
import { calcularPosiciones, rankearTerceros } from "@/lib/standings";
import {
  BRACKET,
  RONDA_LABEL,
  THIRD_ELIGIBLE,
  THIRD_SLOTS,
  asignarTerceros,
  resolverCuadro,
  type KoState,
  type Ronda,
  type Tercero,
} from "@/lib/knockout";

type KoRow = {
  num: number;
  marcador_local: number | null;
  marcador_visitante: number | null;
  ganador: string | null;
};
type ThirdOv = { match_num: number; equipo: string };

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
  ko,
  thirds,
}: {
  participants: AdminParticipant[];
  results: AdminResult[];
  matches: Match[];
  ko: KoRow[];
  thirds: ThirdOv[];
}) {
  const [tab, setTab] = useState<
    "resultados" | "partidos" | "llave" | "participantes" | "premio"
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
        <TabBtn activo={tab === "llave"} onClick={() => setTab("llave")}>
          Llave
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
      {tab === "llave" && <TabLlave matches={matches} ko={ko} thirds={thirds} />}
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
  const [co, setCo] = useState(
    m.cierre_override ? isoToLocalInput(m.cierre_override) : ""
  );
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
        cierreOverride: co, // vacío = usar la regla por defecto (30 min antes)
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
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <label className="font-sans text-xs text-navy/50">
          Inicio (hora local):
        </label>
        <input
          type="datetime-local"
          value={ko}
          onChange={(e) => setKo(e.target.value)}
          className="rounded-lg border-2 border-navy/15 bg-crema px-2 py-1 font-sans text-xs text-navy outline-none focus:border-rojo"
        />
        <label className="font-sans text-xs text-navy/50">
          Cierre personalizado:
        </label>
        <input
          type="datetime-local"
          value={co}
          onChange={(e) => setCo(e.target.value)}
          className="rounded-lg border-2 border-navy/15 bg-crema px-2 py-1 font-sans text-xs text-navy outline-none focus:border-rojo"
        />
        {co && (
          <button
            type="button"
            onClick={() => setCo("")}
            className="font-sans text-xs text-rojo underline"
          >
            limpiar
          </button>
        )}
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
      <p className="mt-1 font-sans text-[11px] text-navy/40">
        Si dejas el cierre personalizado vacío, aplica el cierre normal: 30 min
        antes del inicio.
      </p>
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

// ── Tab: Llave (eliminatorias) ───────────────────────────────────────
function KoRowAdmin({
  num,
  ronda,
  home,
  away,
  homeLabel,
  awayLabel,
  ml,
  mv,
  ganadorActual,
}: {
  num: number;
  ronda: Ronda;
  home: string | null;
  away: string | null;
  homeLabel: string;
  awayLabel: string;
  ml: number | null;
  mv: number | null;
  ganadorActual: string | null;
}) {
  const [l, setL] = useState(ml?.toString() ?? "");
  const [v, setV] = useState(mv?.toString() ?? "");
  const [gan, setGan] = useState(ganadorActual ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const num2 = (s: string) => s.replace(/[^0-9]/g, "").slice(0, 2);

  const save = () => {
    setMsg(null);
    start(async () => {
      const res = await guardarKnockout({
        num,
        marcadorLocal: l.trim() === "" ? null : Number(l),
        marcadorVisitante: v.trim() === "" ? null : Number(v),
        ganador: gan || null,
      });
      setMsg(res.error ?? "✅");
    });
  };

  return (
    <div className="rounded-xl border-2 border-navy/10 bg-white p-2">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 text-xs">
        <span className="truncate text-right font-sans font-semibold text-navy">
          {home ? `${banderaDe(home)} ${home}` : <span className="italic text-navy/40">{homeLabel}</span>}
        </span>
        <span className="flex items-center gap-0.5">
          <input
            inputMode="numeric"
            value={l}
            onChange={(e) => setL(num2(e.target.value))}
            className="h-7 w-7 rounded border-2 border-navy/15 bg-crema text-center font-serif text-sm font-bold text-navy outline-none focus:border-rojo"
          />
          <span className="text-navy/40">:</span>
          <input
            inputMode="numeric"
            value={v}
            onChange={(e) => setV(num2(e.target.value))}
            className="h-7 w-7 rounded border-2 border-navy/15 bg-crema text-center font-serif text-sm font-bold text-navy outline-none focus:border-rojo"
          />
        </span>
        <span className="truncate font-sans font-semibold text-navy">
          {away ? `${banderaDe(away)} ${away}` : <span className="italic text-navy/40">{awayLabel}</span>}
        </span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="font-sans text-[11px] text-navy/50">#{num} · avanza:</span>
        <select
          value={gan}
          onChange={(e) => setGan(e.target.value)}
          className="rounded border-2 border-navy/15 bg-crema px-1 py-0.5 font-sans text-xs text-navy outline-none focus:border-rojo"
        >
          <option value="">(auto por marcador)</option>
          {home && <option value={home}>{home}</option>}
          {away && <option value={away}>{away}</option>}
        </select>
        <button
          onClick={save}
          disabled={pending}
          className="ml-auto rounded bg-rojo px-3 py-1 font-sans text-xs font-bold text-white hover:bg-rojo/90 disabled:opacity-50"
        >
          {pending ? "…" : "Guardar"}
        </button>
        {msg && <span className="font-sans text-xs font-semibold text-green-700">{msg}</span>}
      </div>
    </div>
  );
}

function TercSelect({
  slot,
  opciones,
  actual,
}: {
  slot: number;
  opciones: Tercero[];
  actual: string;
}) {
  const [val, setVal] = useState(actual);
  const [pending, start] = useTransition();
  const cambiar = (equipo: string) => {
    setVal(equipo);
    start(async () => {
      await guardarTercero(slot, equipo || null);
    });
  };
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border-2 border-navy/10 bg-white px-3 py-1.5">
      <span className="font-sans text-xs text-navy/70">
        Llave #{slot} — 3º de {THIRD_ELIGIBLE[slot].join("/")}
      </span>
      <select
        value={val}
        onChange={(e) => cambiar(e.target.value)}
        disabled={pending}
        className="rounded border-2 border-navy/15 bg-crema px-1 py-0.5 font-sans text-xs text-navy outline-none focus:border-rojo"
      >
        <option value="">(automático)</option>
        {opciones.map((o) => (
          <option key={o.team} value={o.team}>
            {o.team} (Gpo {o.grupo})
          </option>
        ))}
      </select>
    </div>
  );
}

function TabLlave({
  matches,
  ko,
  thirds,
}: {
  matches: Match[];
  ko: KoRow[];
  thirds: ThirdOv[];
}) {
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
      const p = posPorGrupo.get(g.letra)!.find((x) => x.pos === 3)!;
      return { ...p, grupo: g.letra };
    })
  )
    .slice(0, 8)
    .map((t) => ({ grupo: t.grupo, team: t.team }));
  const overrides = new Map(thirds.map((t) => [t.match_num, t.equipo]));
  const { mapa } = asignarTerceros(terc8, overrides);
  const koMap = new Map<number, KoState>(ko.map((k) => [k.num, k]));
  const resolved = resolverCuadro(posPorGrupo, koMap, mapa);

  const ordenRondas: Ronda[] = ["r32", "r16", "qf", "sf", "tercer", "final"];

  return (
    <div>
      <p className="mb-4 font-sans text-sm text-navy/60">
        Captura el marcador y quién avanza en cada partido (el podio campeón /
        subcampeón / 3º / 4º se escribe solo y puntúa la quiniela). Los terceros
        se asignan automáticamente; puedes forzarlos abajo si difieren del cuadro
        oficial.
      </p>

      <details className="mb-5 rounded-xl border-2 border-navy/10 bg-navy/[0.03] p-3">
        <summary className="cursor-pointer font-sans text-sm font-semibold text-navy">
          Asignación de terceros (override)
        </summary>
        <div className="mt-2 flex flex-col gap-1.5">
          {THIRD_SLOTS.map((slot) => (
            <TercSelect
              key={slot}
              slot={slot}
              opciones={terc8.filter((t) => THIRD_ELIGIBLE[slot].includes(t.grupo))}
              actual={overrides.get(slot) ?? ""}
            />
          ))}
        </div>
      </details>

      <div className="flex flex-col gap-5">
        {ordenRondas.map((ronda) => (
          <section key={ronda}>
            <h3 className="mb-2 font-serif text-xl font-bold text-navy">
              {RONDA_LABEL[ronda]}
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {BRACKET.filter((b) => b.ronda === ronda).map((b) => {
                const r = resolved.get(b.num)!;
                return (
                  <KoRowAdmin
                    key={b.num}
                    num={b.num}
                    ronda={ronda}
                    home={r.home}
                    away={r.away}
                    homeLabel={r.homeLabel}
                    awayLabel={r.awayLabel}
                    ml={r.marcador_local}
                    mv={r.marcador_visitante}
                    ganadorActual={r.ganador}
                  />
                );
              })}
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
