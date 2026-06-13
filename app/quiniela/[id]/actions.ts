"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { corteAlcanzado, TIPOS_FASE } from "@/lib/constants";
import { GRUPOS, TODOS_LOS_EQUIPOS } from "@/lib/teams";
import { getSession } from "@/lib/auth";

export type GuardarState = { ok?: boolean; error?: string };

const TIPOS_GRUPO = GRUPOS.map((g) => g.tipo);
const TIPOS_FASE_KEYS = TIPOS_FASE.map((f) => f.tipo);
const TODOS_LOS_TIPOS = [...TIPOS_GRUPO, ...TIPOS_FASE_KEYS, "comodin"];

const NOMBRES_VALIDOS = new Set(TODOS_LOS_EQUIPOS.map((t) => t.nombre));
// Equipos válidos por grupo (el ganador de grupo debe pertenecer al grupo).
const EQUIPOS_POR_GRUPO: Record<string, Set<string>> = Object.fromEntries(
  GRUPOS.map((g) => [g.tipo, new Set(g.equipos.map((e) => e.nombre))])
);

export async function guardarPredicciones(
  _prev: GuardarState,
  formData: FormData
): Promise<GuardarState> {
  if (corteAlcanzado()) {
    return { error: "Las predicciones están cerradas: el torneo ya comenzó." };
  }

  const participantId = String(formData.get("participantId") ?? "");
  if (!participantId) return { error: "Participante no válido." };

  // Solo el dueño de la sesión puede guardar sus predicciones.
  if (getSession() !== participantId) {
    return { error: "Tu sesión expiró. Inicia sesión de nuevo." };
  }

  const supabase = createAdminClient();

  const { data: participant } = await supabase
    .from("participants")
    .select("id")
    .eq("id", participantId)
    .maybeSingle();

  if (!participant) return { error: "El participante no existe." };

  // Construir las filas a guardar validando cada tipo.
  const rows: {
    participant_id: string;
    tipo: string;
    equipo_seleccionado: string;
  }[] = [];

  for (const tipo of TODOS_LOS_TIPOS) {
    const equipo = String(formData.get(tipo) ?? "").trim();
    if (!equipo) {
      return { error: "Faltan predicciones por completar antes de guardar." };
    }
    if (!NOMBRES_VALIDOS.has(equipo)) {
      return { error: `Equipo no válido: ${equipo}` };
    }
    if (tipo.startsWith("grupo_") && !EQUIPOS_POR_GRUPO[tipo].has(equipo)) {
      return { error: `${equipo} no pertenece al ${tipo}.` };
    }
    rows.push({
      participant_id: participantId,
      tipo,
      equipo_seleccionado: equipo,
    });
  }

  const { error } = await supabase
    .from("predictions")
    .upsert(rows, { onConflict: "participant_id,tipo" });

  if (error) {
    return { error: "No se pudieron guardar las predicciones. Intenta de nuevo." };
  }

  revalidatePath(`/quiniela/${participantId}`);
  return { ok: true };
}
