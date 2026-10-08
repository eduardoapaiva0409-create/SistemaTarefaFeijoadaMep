import { redirect } from "next/navigation";
import { MateriaisView } from "@/components/materiais/materiais-view";
import { getCurrentProfile } from "@/lib/auth";
import { MATERIAIS_BUCKET, MATERIAL_SELECT } from "@/lib/materiais";
import { createClient } from "@/lib/supabase/server";
import type {
  Material,
  MaterialPasta,
  MaterialWithRelations,
  ProfileRef,
} from "@/lib/types";

export const metadata = { title: "Materiais" };

export default async function MateriaisPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const [{ data: pastas }, { data: materiais }] = await Promise.all([
    supabase.from("material_pastas").select("*").order("nome"),
    supabase
      .from("materiais")
      .select(MATERIAL_SELECT)
      .order("created_at", { ascending: false }),
  ]);

  // getPublicUrl só monta a string (sem rede). O bucket é público para
  // leitura — ver 0009_materiais.sql.
  const storage = supabase.storage.from(MATERIAIS_BUCKET);
  const comUrls = ((materiais ?? []) as (Material & { autor: ProfileRef | null })[]).map(
    (m): MaterialWithRelations => ({
      ...m,
      url: storage.getPublicUrl(m.caminho).data.publicUrl,
      urlDownload: storage.getPublicUrl(m.caminho, { download: m.nome }).data.publicUrl,
      urlMiniatura: m.miniatura
        ? storage.getPublicUrl(m.miniatura).data.publicUrl
        : null,
    })
  );

  return (
    <MateriaisView
      pastas={(pastas ?? []) as MaterialPasta[]}
      materiais={comUrls}
      meuId={profile.id}
      souAdmin={profile.papel === "admin"}
    />
  );
}
