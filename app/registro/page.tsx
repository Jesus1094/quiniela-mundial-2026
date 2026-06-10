import Link from "next/link";
import RegistroForm from "./RegistroForm";
import { corteAlcanzado, GRUPO_NOMBRE } from "@/lib/constants";
import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RegistroPage() {
  const supabase = createServerClient();
  const { data: lastMatch } = await supabase
    .from("matches")
    .select("kickoff")
    .order("kickoff", { ascending: false })
    .limit(1)
    .maybeSingle();
  const registroAbierto = lastMatch
    ? Date.now() < new Date(lastMatch.kickoff).getTime()
    : !corteAlcanzado();
  const cerrado = !registroAbierto;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <Link
        href="/"
        className="mb-6 font-sans text-sm text-navy/60 hover:text-rojo"
      >
        ← Volver al inicio
      </Link>

      <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-rojo">
        {GRUPO_NOMBRE}
      </p>
      <h1 className="mt-2 font-serif text-4xl font-bold text-navy">Registro</h1>
      <p className="mb-8 mt-2 font-sans text-navy/70">
        Crea tu participación para la Quiniela Mundial 2026.
      </p>

      {cerrado ? (
        <div className="rounded-xl border-2 border-rojo/30 bg-rojo/5 px-5 py-6 text-center">
          <p className="font-serif text-2xl font-semibold text-rojo">
            Registro cerrado
          </p>
          <p className="mt-2 font-sans text-sm text-navy/70">
            La fase de grupos ya terminó. Puedes consultar la tabla de
            posiciones.
          </p>
          <Link
            href="/tabla"
            className="mt-4 inline-block rounded-xl border-2 border-navy px-5 py-3 font-sans font-bold text-navy hover:bg-navy hover:text-crema"
          >
            Ver tabla de posiciones
          </Link>
        </div>
      ) : (
        <RegistroForm />
      )}
    </main>
  );
}
