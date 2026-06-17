import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { GRUPO_NOMBRE, TIMEZONE } from "@/lib/constants";

export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("es-MX", {
  timeZone: TIMEZONE,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export default async function IntegridadPage() {
  const supabase = createServerClient();
  const { data: log } = await supabase
    .from("result_audit")
    .select("id, ambito, referencia, detalle, changed_at")
    .order("changed_at", { ascending: false })
    .limit(500);

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <Link href="/" className="font-sans text-sm text-navy/60 hover:text-rojo">
        ← Inicio
      </Link>

      <header className="mb-6 mt-4">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-rojo">
          {GRUPO_NOMBRE}
        </p>
        <h1 className="mt-1 font-serif text-4xl font-bold text-navy">
          Bitácora de resultados
        </h1>
        <p className="mt-2 font-sans text-sm text-navy/70">
          Registro público de cada resultado cargado o modificado, con su fecha y
          hora. Todos los marcadores son de partidos reales del Mundial, así que
          puedes compararlos con cualquier fuente oficial. Esta bitácora existe
          para que el control de resultados sea transparente y verificable.
        </p>
      </header>

      {(!log || log.length === 0) && (
        <p className="rounded-2xl border-2 border-navy/10 bg-white px-5 py-8 text-center font-sans text-navy/60">
          Aún no se ha cargado ningún resultado.
        </p>
      )}

      <ol className="flex flex-col gap-2">
        {(log ?? []).map((e) => (
          <li
            key={e.id}
            className="flex items-center justify-between gap-3 rounded-xl border-2 border-navy/10 bg-white px-4 py-3"
          >
            <div>
              <span
                className={`mr-2 rounded-full px-2 py-0.5 font-sans text-[11px] font-bold uppercase tracking-wide ${
                  e.ambito === "partido"
                    ? "bg-navy/10 text-navy"
                    : "bg-rojo/10 text-rojo"
                }`}
              >
                {e.ambito}
              </span>
              <span className="font-sans text-sm font-semibold text-navy">
                {e.referencia}
              </span>
              <span className="font-sans text-sm text-navy/70">
                {" "}
                → {e.detalle}
              </span>
            </div>
            <span className="shrink-0 font-sans text-xs text-navy/50">
              {fmt.format(new Date(e.changed_at))} h
            </span>
          </li>
        ))}
      </ol>
    </main>
  );
}
