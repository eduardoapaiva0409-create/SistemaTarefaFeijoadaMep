import { redirect } from "next/navigation";
import { EquipeView } from "@/components/equipe/equipe-view";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TASK_SELECT } from "@/lib/tasks";
import type { Profile, TaskWithRelations } from "@/lib/types";

export const metadata = { title: "Equipe" };

export default async function EquipePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const [{ data: pessoas }, { data: tasks }] = await Promise.all([
    supabase.from("profiles").select("*").order("nome"),
    supabase.from("tasks").select(TASK_SELECT).neq("status", "concluida"),
  ]);

  return (
    <EquipeView
      pessoas={(pessoas ?? []) as Profile[]}
      tasks={(tasks ?? []) as TaskWithRelations[]}
      meuId={profile.id}
      souAdmin={profile.papel === "admin"}
    />
  );
}
