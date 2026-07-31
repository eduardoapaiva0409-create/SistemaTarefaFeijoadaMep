import { redirect } from "next/navigation";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TASK_SELECT } from "@/lib/tasks";
import type { ProfileRef, TaskWithRelations } from "@/lib/types";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const [{ data: tasks }, { data: profiles }] = await Promise.all([
    supabase.from("tasks").select(TASK_SELECT).order("ordem", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, nome, cargo")
      .eq("ativo", true)
      .order("nome"),
  ]);

  return (
    <DashboardView
      tasks={(tasks ?? []) as TaskWithRelations[]}
      profiles={(profiles ?? []) as ProfileRef[]}
      profile={profile}
    />
  );
}
