"use client";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Cliente del navegador con la anon key. Sujeto a RLS.
export function createBrowserClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
