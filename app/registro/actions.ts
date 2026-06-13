"use server";

import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { corteAlcanzado } from "@/lib/constants";
import { hashPassword, setSession } from "@/lib/auth";

export type RegistroState = {
  error?: string;
  yaExiste?: boolean;
  participantId?: string;
};

export async function registrar(
  _prev: RegistroState,
  formData: FormData
): Promise<RegistroState> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!nombre) return { error: "Escribe tu nombre completo." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Escribe un correo electrónico válido." };
  }
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const supabase = createServerClient();
  const admin = createAdminClient();

  // Registro abierto mientras quede algún partido por jugarse.
  const { data: lastMatch } = await supabase
    .from("matches")
    .select("kickoff")
    .order("kickoff", { ascending: false })
    .limit(1)
    .maybeSingle();
  const registroAbierto = lastMatch
    ? Date.now() < new Date(lastMatch.kickoff).getTime()
    : !corteAlcanzado();
  if (!registroAbierto) {
    return { error: "El registro está cerrado: la fase de grupos ya terminó." };
  }

  // ¿Correo ya registrado? → debe iniciar sesión. (service role: email no es legible por anon)
  const { data: existente } = await admin
    .from("participants")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existente) {
    return {
      error: "Ya existe una cuenta con ese correo. Inicia sesión.",
      yaExiste: true,
    };
  }

  // Crear con service role (la escritura pública está deshabilitada).
  const { data, error } = await admin
    .from("participants")
    .insert({ nombre, email, password_hash: hashPassword(password) })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "No se pudo completar el registro. Intenta de nuevo." };
  }

  setSession(data.id);
  return { participantId: data.id };
}
