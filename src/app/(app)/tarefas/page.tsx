import { redirect } from "next/navigation";
import { TasksView } from "@/components/tasks/tasks-view";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TASK_SELECT } from "@/lib/tasks";
import type { ProfileRef, TaskWithRelations } from "@/lib/types";

export const metadata = { title: "Tarefas" };

export default async function TarefasPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const [{ data: tasks }, { data: profiles }] = await Promise.all([
    supabase.from("tasks").select(TASK_SELECT).order("ordem", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, nome, funcao")
      .eq("ativo", true)
      .order("nome"),
  ]);

  return (
    <TasksView
      tasks={(tasks ?? []) as TaskWithRelations[]}
      profiles={(profiles ?? []) as ProfileRef[]}
      meuId={profile.id}
      souAdmin={profile.papel === "admin"}
    />
  );
}
