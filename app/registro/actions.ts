"use server";

import { createServerClient } from "@/lib/supabase/server";
import { corteAlcanzado } from "@/lib/constants";

export type RegistroState = {
  error?: string;
  existingId?: string;
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

  if (!nombre) return { error: "Escribe tu nombre completo." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Escribe un correo electrónico válido." };
  }

  const supabase = createServerClient();

  // El registro sigue abierto mientras quede algún partido por jugarse.
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

  // Verificar si el correo ya está registrado.
  const { data: existente } = await supabase
    .from("participants")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existente) {
    return {
      error: "Ya existe un registro con ese correo.",
      existingId: existente.id,
    };
  }

  const { data, error } = await supabase
    .from("participants")
    .insert({ nombre, email })
    .select("id")
    .single();

  if (error || !data) {
    // Posible carrera con la verificación previa (violación de unicidad).
    const { data: dup } = await supabase
      .from("participants")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (dup) {
      return {
        error: "Ya existe un registro con ese correo.",
        existingId: dup.id,
      };
    }
    return { error: "No se pudo completar el registro. Intenta de nuevo." };
  }

  return { participantId: data.id };
}
