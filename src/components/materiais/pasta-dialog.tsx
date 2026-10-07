"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { MaterialPasta } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PastaDialog({
  open,
  onOpenChange,
  pasta,
  meuId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = pasta nova. */
  pasta: MaterialPasta | null;
  meuId: string;
}) {
  const router = useRouter();
  const editando = pasta !== null;
  const [nome, setNome] = useState(pasta?.nome ?? "");
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nome.trim()) return;
    setSalvando(true);

    const supabase = createClient();
    // Sem permissão, o RLS não dá erro no update: só não muda nada. O
    // `select` devolve as linhas afetadas, e é assim que a tela fica sabendo.
    const { data, error } = editando
      ? await supabase
          .from("material_pastas")
          .update({ nome: nome.trim() })
          .eq("id", pasta.id)
          .select("id")
      : await supabase
          .from("material_pastas")
          .insert({ nome: nome.trim(), criado_por: meuId })
          .select("id");

    if (error || !data?.length) {
      toast.error(editando ? "Não foi possível renomear" : "Erro ao criar a pasta", {
        description:
          error?.message ?? "Só quem criou a pasta ou um admin pode renomeá-la.",
      });
      setSalvando(false);
      return;
    }

    toast.success(editando ? "Pasta renomeada" : "Pasta criada");
    setSalvando(false);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editando ? "Renomear pasta" : "Nova pasta"}</DialogTitle>
          {!editando && (
            <DialogDescription>
              Para separar artes, vídeos, fotos do evento…
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="pasta-nome">Nome *</Label>
            <Input
              id="pasta-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Artes para o Instagram"
              maxLength={80}
              required
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando || !nome.trim()}>
              {salvando ? "Salvando…" : editando ? "Salvar" : "Criar pasta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
