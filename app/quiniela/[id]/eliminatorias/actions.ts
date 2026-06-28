"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth";
import { construirCuadro, koPronosticable, type KoState } from "@/lib/knockout";
import type { Match } from "@/lib/matches";

export type GuardarKoState = {
  ok?: boolean;
  error?: string;
  guardados?: number;
  cerrados?: number;
};

type Item = { matchNum: number; local: number; visitante: number };

const MSEL =
  "id, grupo, equipo_local, equipo_visitante, kickoff, marcador_local, marcador_visitante, cierre_override, orden";

export async function guardarPronosticosKo(
  _prev: GuardarKoState,
  formData: FormData
): Promise<GuardarKoState> {
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

  const admin = createAdminClient();

  const { data: participant } = await admin
    .from("participants")
    .select("id")
    .eq("id", participantId)
    .maybeSingle();
  if (!participant) return { error: "El participante no existe." };

  // Resolver el cuadro para validar equipos y ventana de cada partido.
  const [{ data: matches }, { data: ko }, { data: thirds }] = await Promise.all([
    admin.from("matches").select(MSEL).order("orden", { ascending: true }),
    admin
      .from("knockout_matches")
      .select("num, marcador_local, marcador_visitante, ganador"),
    admin.from("knockout_thirds_override").select("match_num, equipo"),
  ]);
  const cuadro = construirCuadro(
    (matches ?? []) as Match[],
    (ko ?? []) as KoState[],
    (thirds ?? []) as { match_num: number; equipo: string }[]
  );

  const now = new Date();
  const rows: {
    participant_id: string;
    match_num: number;
    pred_local: number;
    pred_visitante: number;
  }[] = [];
  let cerrados = 0;

  for (const it of items) {
    const g = cuadro.get(it.matchNum);
    if (!g) continue;
    if (!koPronosticable(g, now)) {
      cerrados++;
      continue;
    }
    const l = Number(it.local);
    const v = Number(it.visitante);
    if (!Number.isInteger(l) || !Number.isInteger(v) || l < 0 || v < 0 || l > 99 || v > 99) {
      return { error: "Los marcadores deben ser enteros entre 0 y 99." };
    }
    rows.push({ participant_id: participantId, match_num: it.matchNum, pred_local: l, pred_visitante: v });
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

  const { error } = await admin
    .from("knockout_predictions")
    .upsert(rows, { onConflict: "participant_id,match_num" });
  if (error) {
    return { error: "No se pudieron guardar los pronósticos. Intenta de nuevo." };
  }

  revalidatePath(`/quiniela/${participantId}/eliminatorias`);
  return { ok: true, guardados: rows.length, cerrados };
}
