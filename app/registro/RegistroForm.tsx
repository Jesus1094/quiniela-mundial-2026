"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registrar, type RegistroState } from "./actions";
import { CUOTA, FMT_MXN } from "@/lib/constants";

const initial: RegistroState = {};

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-rojo px-6 py-4 font-sans text-lg font-bold text-white transition hover:bg-rojo/90 disabled:opacity-50"
    >
      {pending ? "Registrando…" : "Continuar a mis predicciones"}
    </button>
  );
}

export default function RegistroForm() {
  const [state, formAction] = useFormState(registrar, initial);
  const router = useRouter();

  useEffect(() => {
    if (state.participantId) {
      router.push(`/quiniela/${state.participantId}`);
    }
  }, [state.participantId, router]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-left">
        <span className="font-sans text-sm font-semibold text-navy">
          Nombre completo
        </span>
        <input
          name="nombre"
          type="text"
          required
          autoComplete="name"
          className="rounded-xl border-2 border-navy/15 bg-white px-4 py-3 font-sans text-navy outline-none focus:border-rojo"
          placeholder="Juan Pérez"
        />
      </label>

      <label className="flex flex-col gap-1 text-left">
        <span className="font-sans text-sm font-semibold text-navy">
          Correo electrónico
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-xl border-2 border-navy/15 bg-white px-4 py-3 font-sans text-navy outline-none focus:border-rojo"
          placeholder="juan@correo.com"
        />
      </label>

      {state.error && (
        <div className="rounded-xl border-2 border-rojo/30 bg-rojo/5 px-4 py-3 text-left">
          <p className="font-sans text-sm font-semibold text-rojo">
            {state.error}
          </p>
          {state.existingId && (
            <Link
              href={`/quiniela/${state.existingId}`}
              className="font-sans text-sm font-semibold text-navy underline"
            >
              Ir a mis predicciones →
            </Link>
          )}
        </div>
      )}

      <div className="rounded-xl bg-navy/5 px-4 py-3 text-left">
        <p className="font-sans text-sm text-navy/70">
          Cuota de participación:{" "}
          <strong className="text-navy">{FMT_MXN.format(CUOTA)}</strong> — El
          administrador confirmará tu pago.
        </p>
      </div>

      <SubmitBtn />
    </form>
  );
}
