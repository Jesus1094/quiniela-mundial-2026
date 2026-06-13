"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { partidoAbierto } from "@/lib/matches";
import { getSession } from "@/lib/auth";

export type GuardarPartidosState = {
  ok?: boolean;
  error?: string;
  guardados?: number;
  cerrados?: number;
};

type Item = { matchId: string; local: number; visitante: number };

export async function guardarPronosticos(
  _prev: GuardarPartidosState,
  formData: FormData
): Promise<GuardarPartidosState> {
  const participantId = String(formData.get("participantId") ?? "");
  if (!participantId) return { error: "Participante no válido." };

  if (getSession() !== participantId) {
    return { error: "Tu sesión expiró. Inicia sesión de nuevo." };
  }

  let items: Item[] = [];
  try {
    items = JSON.parse(String(formData.get("payload") ?? "[]"));
  } catch {
    return { error: "Datos inválidos." };
  }
  if (!Array.isArray(items) || items.length === 0) {
    return { error: "No hay pronósticos para guardar." };
  }

  const supabase = createAdminClient();

  const { data: participant } = await supabase
    .from("participants")
    .select("id")
    .eq("id", participantId)
    .maybeSingle();
  if (!participant) return { error: "El participante no existe." };

  // Traer kickoff de los partidos referenciados para validar la ventana.
  const ids = Array.from(new Set(items.map((i) => i.matchId)));
  const { data: matches } = await supabase
    .from("matches")
    .select("id, kickoff, cierre_override")
    .in("id", ids);

  const porId = new Map((matches ?? []).map((m) => [m.id, m]));

  const now = new Date();
  const rows: {
    participant_id: string;
    match_id: string;
    pred_local: number;
    pred_visitante: number;
  }[] = [];
  let cerrados = 0;

  for (const it of items) {
    const m = porId.get(it.matchId);
    if (!m) continue;
    if (!partidoAbierto(m, now)) {
      cerrados++;
      continue;
    }
    const l = Number(it.local);
    const v = Number(it.visitante);
    if (
      !Number.isInteger(l) ||
      !Number.isInteger(v) ||
      l < 0 ||
      v < 0 ||
      l > 99 ||
      v > 99
    ) {
      return { error: "Los marcadores deben ser números enteros entre 0 y 99." };
    }
    rows.push({
      participant_id: participantId,
      match_id: it.matchId,
      pred_local: l,
      pred_visitante: v,
    });
  }

  if (rows.length === 0) {
    return {
      error:
        cerrados > 0
          ? "Esos partidos ya están cerrados (faltan menos de 30 minutos)."
          : "No hay pronósticos válidos para guardar.",
      cerrados,
    };
  }

  const { error } = await supabase
    .from("match_predictions")
    .upsert(rows, { onConflict: "participant_id,match_id" });

  if (error) {
    return { error: "No se pudieron guardar los pronósticos. Intenta de nuevo." };
  }

  revalidatePath(`/quiniela/${participantId}/partidos`);
  return { ok: true, guardados: rows.length, cerrados };
}
