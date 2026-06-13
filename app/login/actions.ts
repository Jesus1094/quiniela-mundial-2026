"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import {
  hashPassword,
  verifyPassword,
  setSession,
  clearSession,
} from "@/lib/auth";

export type LoginState = {
  error?: string;
  noExiste?: boolean;
  participantId?: string;
  definioPassword?: boolean;
};

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Escribe tu correo y contraseña." };
  }

  const admin = createAdminClient();
  const { data: p } = await admin
    .from("participants")
    .select("id, password_hash")
    .eq("email", email)
    .maybeSingle();

  if (!p) {
    return {
      error: "No encontramos una cuenta con ese correo.",
      noExiste: true,
    };
  }

  // Cuenta heredada sin contraseña: la define en este primer inicio de sesión.
  if (!p.password_hash) {
    if (password.length < 6) {
      return {
        error:
          "Tu cuenta aún no tiene contraseña. Crea una de al menos 6 caracteres.",
      };
    }
    const { error } = await admin
      .from("participants")
      .update({ password_hash: hashPassword(password) })
      .eq("id", p.id);
    if (error) return { error: "No se pudo guardar la contraseña." };
    setSession(p.id);
    return { participantId: p.id, definioPassword: true };
  }

  if (!verifyPassword(password, p.password_hash)) {
    return { error: "Contraseña incorrecta." };
  }

  setSession(p.id);
  return { participantId: p.id };
}

export async function logout(): Promise<void> {
  clearSession();
  redirect("/");
}
