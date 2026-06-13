import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { getSession } from "@/lib/auth";
import { GRUPO_NOMBRE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  // Si ya hay sesión, ir directo a su quiniela.
  const sid = getSession();
  if (sid) redirect(`/quiniela/${sid}`);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-12">
      <Link href="/" className="mb-6 font-sans text-sm text-navy/60 hover:text-rojo">
        ← Volver al inicio
      </Link>

      <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-rojo">
        {GRUPO_NOMBRE}
      </p>
      <h1 className="mt-2 font-serif text-4xl font-bold text-navy">
        Iniciar sesión
      </h1>
      <p className="mb-8 mt-2 font-sans text-navy/70">
        Entra con tu correo y contraseña para ver y editar tus pronósticos.
      </p>

      <LoginForm />
    </main>
  );
}
