import { cookies } from "next/headers";
import LoginForm from "./LoginForm";
import AdminDashboard, {
  type AdminParticipant,
  type AdminResult,
} from "./AdminDashboard";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function isAdmin(): boolean {
  const v = cookies().get("admin_auth")?.value;
  return !!v && !!process.env.ADMIN_PASSWORD && v === process.env.ADMIN_PASSWORD;
}

export default async function AdminPage() {
  if (!isAdmin()) {
    return <LoginForm />;
  }

  const supabase = createAdminClient();

  const [{ data: parts }, { data: results }] = await Promise.all([
    supabase
      .from("participants")
      .select(
        "id, nombre, email, pago_confirmado, scores(total), predictions(count)"
      )
      .order("created_at", { ascending: true }),
    supabase.from("results").select("tipo, equipo_ganador"),
  ]);

  const participants: AdminParticipant[] = (parts ?? []).map((p: any) => {
    const score = Array.isArray(p.scores) ? p.scores[0] : p.scores;
    const predsCount = Array.isArray(p.predictions)
      ? p.predictions[0]?.count ?? 0
      : p.predictions?.count ?? 0;
    return {
      id: p.id,
      nombre: p.nombre,
      email: p.email,
      pago_confirmado: p.pago_confirmado,
      predsCount,
      total: score?.total ?? 0,
    };
  });

  return (
    <AdminDashboard
      participants={participants}
      results={(results ?? []) as AdminResult[]}
    />
  );
}
