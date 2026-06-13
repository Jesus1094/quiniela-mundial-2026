"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login, type LoginState } from "./actions";

const initial: LoginState = {};

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-rojo px-6 py-4 font-sans text-lg font-bold text-white transition hover:bg-rojo/90 disabled:opacity-50"
    >
      {pending ? "Entrando…" : "Iniciar sesión"}
    </button>
  );
}

export default function LoginForm() {
  const [state, formAction] = useFormState(login, initial);
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

      <label className="flex flex-col gap-1 text-left">
        <span className="font-sans text-sm font-semibold text-navy">
          Contraseña
        </span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded-xl border-2 border-navy/15 bg-white px-4 py-3 font-sans text-navy outline-none focus:border-rojo"
          placeholder="Tu contraseña"
        />
      </label>

      {state.error && (
        <div className="rounded-xl border-2 border-rojo/30 bg-rojo/5 px-4 py-3 text-left">
          <p className="font-sans text-sm font-semibold text-rojo">
            {state.error}
          </p>
          {state.noExiste && (
            <Link
              href="/registro"
              className="font-sans text-sm font-semibold text-navy underline"
            >
              Crear una cuenta →
            </Link>
          )}
        </div>
      )}

      <SubmitBtn />

      <p className="text-center font-sans text-sm text-navy/60">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-rojo underline">
          Regístrate
        </Link>
      </p>
    </form>
  );
}
