"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { login, type LoginState } from "./actions";

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-rojo px-6 py-3 font-sans font-bold text-white transition hover:bg-rojo/90 disabled:opacity-50"
    >
      {pending ? "Verificando…" : "Entrar"}
    </button>
  );
}

export default function LoginForm() {
  const [state, action] = useFormState<LoginState, FormData>(login, {});
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <Link href="/" className="mb-6 font-sans text-sm text-navy/60 hover:text-rojo">
        ← Inicio
      </Link>
      <h1 className="font-serif text-4xl font-bold text-navy">Panel admin</h1>
      <p className="mb-6 mt-1 font-sans text-navy/60">
        Acceso restringido al administrador de la quiniela.
      </p>
      <form action={action} className="flex flex-col gap-3">
        <input
          name="password"
          type="password"
          required
          autoFocus
          placeholder="Contraseña"
          className="rounded-xl border-2 border-navy/15 bg-white px-4 py-3 font-sans text-navy outline-none focus:border-rojo"
        />
        {state.error && (
          <p className="font-sans text-sm font-semibold text-rojo">
            {state.error}
          </p>
        )}
        <Btn />
      </form>
    </main>
  );
}
