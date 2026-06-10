import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Cliente público (anon) para lecturas en el servidor (Server Components).
export function createServerClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
}

// Cliente con service_role: SOLO para operaciones admin server-side.
// NUNCA debe importarse desde un Client Component.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
