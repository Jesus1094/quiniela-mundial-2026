import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";

// Sesión y contraseñas para la quiniela (auth ligero, sin Supabase Auth).
// - Contraseña: scrypt con salt por usuario, almacenada como 'saltHex:hashHex'.
// - Sesión: cookie httpOnly con el participant_id firmado por HMAC-SHA256.

const COOKIE = "qm_session";

function secret(): string {
  const s = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("SUPABASE_SERVICE_ROLE_KEY no configurada.");
  return s;
}

export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(pw, salt, 64);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export function verifyPassword(pw: string, stored: string | null): boolean {
  if (!stored) return false;
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const derived = crypto.scryptSync(pw, Buffer.from(saltHex, "hex"), 64);
  return (
    expected.length === derived.length &&
    crypto.timingSafeEqual(expected, derived)
  );
}

function sign(pid: string): string {
  return crypto.createHmac("sha256", secret()).update(pid).digest("base64url");
}

export function setSession(participantId: string): void {
  cookies().set(COOKIE, `${participantId}.${sign(participantId)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 60, // 60 días
  });
}

export function clearSession(): void {
  cookies().delete(COOKIE);
}

export function getSession(): string | null {
  const v = cookies().get(COOKIE)?.value;
  if (!v) return null;
  const i = v.lastIndexOf(".");
  if (i < 0) return null;
  const pid = v.slice(0, i);
  const sig = v.slice(i + 1);
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(pid));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return pid;
}
