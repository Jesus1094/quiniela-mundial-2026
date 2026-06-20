"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";
import { GRUPOS, TODOS_LOS_EQUIPOS } from "@/lib/teams";
import { calcularPosiciones, rankearTerceros } from "@/lib/standings";
import {
  asignarTerceros,
  resolverCuadro,
  type KoState,
  type Tercero,
} from "@/lib/knockout";
import type { Match } from "@/lib/matches";

const COOKIE = "admin_auth";

// Verifica la sesión admin comparando la cookie httpOnly contra ADMIN_PASSWORD.
function isAdmin(): boolean {
  const v = cookies().get(COOKIE)?.value;
  return !!v && !!process.env.ADMIN_PASSWORD && v === process.env.ADMIN_PASSWORD;
}

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  if (!process.env.ADMIN_PASSWORD) {
    return { error: "ADMIN_PASSWORD no está configurada en el servidor." };
  }
  if (password !== process.env.ADMIN_PASSWORD) {
    return { error: "Contraseña incorrecta." };
  }
  cookies().set(COOKIE, password, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 horas
  });
  revalidatePath("/admin");
  return {};
}

export async function logout(): Promise<void> {
  cookies().delete(COOKIE);
  revalidatePath("/admin");
}

// Validación de tipos/equipos válidos para resultados.
const TIPOS_GRUPO = new Set(GRUPOS.map((g) => g.tipo));
const TIPOS_FASE = new Set(["cuarto", "tercero", "subcampeon", "campeon"]);
const NOMBRES = new Set(TODOS_LOS_EQUIPOS.map((t) => t.nombre));
const EQUIPOS_POR_GRUPO: Record<string, Set<string>> = Object.fromEntries(
  GRUPOS.map((g) => [g.tipo, new Set(g.equipos.map((e) => e.nombre))])
);

export type ResultadoState = { ok?: boolean; error?: string };

export async function guardarResultado(
  _prev: ResultadoState,
  formData: FormData
): Promise<ResultadoState> {
  if (!isAdmin()) return { error: "No autorizado." };

  const tipo = String(formData.get("tipo") ?? "");
  const equipo = String(formData.get("equipo_ganador") ?? "").trim();

  const tipoValido = TIPOS_GRUPO.has(tipo) || TIPOS_FASE.has(tipo);
  if (!tipoValido) return { error: "Tipo de resultado no válido." };
  if (!NOMBRES.has(equipo)) return { error: "Equipo no válido." };
  if (TIPOS_GRUPO.has(tipo) && !EQUIPOS_POR_GRUPO[tipo].has(equipo)) {
    return { error: `${equipo} no pertenece al ${tipo}.` };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("results")
    .upsert(
      { tipo, equipo_ganador: equipo, updated_at: new Date().toISOString() },
      { onConflict: "tipo" }
    );

  if (error) return { error: "No se pudo guardar el resultado." };

  // El trigger calculate_scores() recalcula automáticamente.
  revalidatePath("/admin");
  revalidatePath("/tabla");
  return { ok: true };
}

export async function guardarPartido(input: {
  matchId: string;
  marcadorLocal: number | null;
  marcadorVisitante: number | null;
  kickoff?: string;
  cierreOverride?: string | null;
}): Promise<{ ok?: boolean; error?: string }> {
  if (!isAdmin()) return { error: "No autorizado." };

  const { matchId, marcadorLocal, marcadorVisitante, kickoff, cierreOverride } =
    input;

  // El marcador debe venir completo (ambos) o vacío (ambos null, para limpiar).
  const unoNull = marcadorLocal === null || marcadorVisitante === null;
  const ambosNull = marcadorLocal === null && marcadorVisitante === null;
  if (unoNull && !ambosNull) {
    return { error: "Captura ambos marcadores o deja ambos vacíos." };
  }
  for (const n of [marcadorLocal, marcadorVisitante]) {
    if (n !== null && (!Number.isInteger(n) || n < 0 || n > 99)) {
      return { error: "Los marcadores deben ser enteros entre 0 y 99." };
    }
  }

  const update: {
    marcador_local: number | null;
    marcador_visitante: number | null;
    updated_at: string;
    kickoff?: string;
    cierre_override?: string | null;
  } = {
    marcador_local: marcadorLocal,
    marcador_visitante: marcadorVisitante,
    updated_at: new Date().toISOString(),
  };
  if (kickoff) {
    const d = new Date(kickoff);
    if (isNaN(d.getTime())) return { error: "Fecha/hora inválida." };
    update.kickoff = d.toISOString();
  }
  if (cierreOverride !== undefined) {
    if (cierreOverride) {
      const c = new Date(cierreOverride);
      if (isNaN(c.getTime())) return { error: "Cierre personalizado inválido." };
      update.cierre_override = c.toISOString();
    } else {
      update.cierre_override = null; // limpiar → vuelve a la regla de 30 min
    }
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("matches")
    .update(update)
    .eq("id", matchId);

  if (error) return { error: "No se pudo guardar el partido." };

  // El trigger recalcula scores automáticamente al cambiar marcadores.
  revalidatePath("/admin");
  revalidatePath("/tabla");
  return { ok: true };
}

export async function togglePago(
  participantId: string,
  valor: boolean
): Promise<{ ok?: boolean; error?: string }> {
  if (!isAdmin()) return { error: "No autorizado." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("participants")
    .update({ pago_confirmado: valor })
    .eq("id", participantId);

  if (error) return { error: "No se pudo actualizar el pago." };

  revalidatePath("/admin");
  revalidatePath("/tabla");
  revalidatePath("/");
  return { ok: true };
}

const MSEL_KO =
  "id, grupo, equipo_local, equipo_visitante, kickoff, marcador_local, marcador_visitante, cierre_override, orden";

// Recalcula la llave y escribe campeón/subcampeón/3º/4º en results (alimenta
// el puntaje de la quiniela) cuando la final y el 3er lugar están definidos.
async function recomputarPodio(admin: ReturnType<typeof createAdminClient>) {
  const [{ data: matches }, { data: koRows }, { data: thirds }] =
    await Promise.all([
      admin.from("matches").select(MSEL_KO).order("orden", { ascending: true }),
      admin
        .from("knockout_matches")
        .select("num, marcador_local, marcador_visitante, ganador"),
      admin.from("knockout_thirds_override").select("match_num, equipo"),
    ]);

  const ms = (matches ?? []) as Match[];
  const posPorGrupo = new Map(
    GRUPOS.map((g) => [
      g.letra,
      calcularPosiciones(
        g.equipos.map((e) => e.nombre),
        ms.filter((m) => m.grupo === g.letra)
      ),
    ])
  );
  const terc8: Tercero[] = rankearTerceros(
    GRUPOS.map((g) => {
      const p = posPorGrupo.get(g.letra)!.find((x) => x.pos === 3)!;
      return { ...p, grupo: g.letra };
    })
  )
    .slice(0, 8)
    .map((t) => ({ grupo: t.grupo, team: t.team }));
  const overrides = new Map(
    (thirds ?? []).map((t: any) => [t.match_num as number, t.equipo as string])
  );
  const { mapa } = asignarTerceros(terc8, overrides);
  const koMap = new Map<number, KoState>(
    (koRows ?? []).map((k: any) => [k.num as number, k as KoState])
  );
  const resolved = resolverCuadro(posPorGrupo, koMap, mapa);

  const ups: { tipo: string; equipo_ganador: string }[] = [];
  const fin = resolved.get(104);
  if (fin?.ganador && fin.home && fin.away) {
    ups.push({ tipo: "campeon", equipo_ganador: fin.ganador });
    ups.push({
      tipo: "subcampeon",
      equipo_ganador: fin.ganador === fin.home ? fin.away : fin.home,
    });
  }
  const ter = resolved.get(103);
  if (ter?.ganador && ter.home && ter.away) {
    ups.push({ tipo: "tercero", equipo_ganador: ter.ganador });
    ups.push({
      tipo: "cuarto",
      equipo_ganador: ter.ganador === ter.home ? ter.away : ter.home,
    });
  }
  for (const u of ups) {
    await admin
      .from("results")
      .upsert(
        { tipo: u.tipo, equipo_ganador: u.equipo_ganador, updated_at: new Date().toISOString() },
        { onConflict: "tipo" }
      );
  }
}

export async function guardarKnockout(input: {
  num: number;
  marcadorLocal: number | null;
  marcadorVisitante: number | null;
  ganador: string | null;
}): Promise<{ ok?: boolean; error?: string }> {
  if (!isAdmin()) return { error: "No autorizado." };
  const { num, marcadorLocal, marcadorVisitante, ganador } = input;
  for (const n of [marcadorLocal, marcadorVisitante]) {
    if (n !== null && (!Number.isInteger(n) || n < 0 || n > 99)) {
      return { error: "Los marcadores deben ser enteros entre 0 y 99." };
    }
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("knockout_matches")
    .update({
      marcador_local: marcadorLocal,
      marcador_visitante: marcadorVisitante,
      ganador: ganador || null,
      updated_at: new Date().toISOString(),
    })
    .eq("num", num);
  if (error) return { error: "No se pudo guardar el partido." };
  await recomputarPodio(admin);
  revalidatePath("/llave");
  revalidatePath("/tabla");
  revalidatePath("/admin");
  return { ok: true };
}

export async function guardarTercero(
  matchNum: number,
  equipo: string | null
): Promise<{ ok?: boolean; error?: string }> {
  if (!isAdmin()) return { error: "No autorizado." };
  const admin = createAdminClient();
  if (equipo) {
    const { error } = await admin
      .from("knockout_thirds_override")
      .upsert({ match_num: matchNum, equipo }, { onConflict: "match_num" });
    if (error) return { error: "No se pudo guardar el tercero." };
  } else {
    await admin
      .from("knockout_thirds_override")
      .delete()
      .eq("match_num", matchNum);
  }
  await recomputarPodio(admin);
  revalidatePath("/llave");
  revalidatePath("/admin");
  return { ok: true };
}
