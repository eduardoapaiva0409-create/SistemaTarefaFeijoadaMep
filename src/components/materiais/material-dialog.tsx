"use client";

/* eslint-disable @next/next/no-img-element -- URL do Storage; o original já vem no tamanho certo para a prévia */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, ExternalLink, Link2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatRelative } from "@/lib/format";
import { formatBytes, tipoDoArquivo } from "@/lib/materiais";
import type { MaterialPasta, MaterialWithRelations } from "@/lib/types";
import { MaterialThumb } from "@/components/materiais/material-thumb";
import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/** Base UI não aceita "" como valor de item — sentinela para "fora das pastas". */
const SEM_PASTA = "__raiz__";

export function MaterialDialog({
  open,
  onOpenChange,
  material,
  pastas,
  podeExcluir,
  onCopiarLink,
  onExcluir,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  material: MaterialWithRelations;
  pastas: MaterialPasta[];
  podeExcluir: boolean;
  onCopiarLink: () => void;
  onExcluir: () => void;
}) {
  const router = useRouter();
  const tipo = tipoDoArquivo(material.mime, material.nome);

  const [nome, setNome] = useState(material.nome);
  const [pastaId, setPastaId] = useState(material.pasta_id ?? SEM_PASTA);
  const [descricao, setDescricao] = useState(material.descricao ?? "");
  const [salvando, setSalvando] = useState(false);
  // O navegador não toca/mostra todo formato (HEIC no Chrome, alguns .mov):
  // aí a prévia vira a miniatura e o convite para baixar.
  const [semPrevia, setSemPrevia] = useState(false);

  const pastaItems = [
    { value: SEM_PASTA, label: "Fora das pastas" },
    ...pastas.map((p) => ({ value: p.id, label: p.nome })),
  ];

  const mudou =
    nome.trim() !== material.nome ||
    (pastaId === SEM_PASTA ? null : pastaId) !== material.pasta_id ||
    (descricao.trim() || null) !== material.descricao;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nome.trim() || !mudou) return;
    setSalvando(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("materiais")
      .update({
        nome: nome.trim(),
        pasta_id: pastaId === SEM_PASTA ? null : pastaId,
        descricao: descricao.trim() || null,
      })
      .eq("id", material.id);

    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
      setSalvando(false);
      return;
    }

    toast.success("Arquivo atualizado");
    setSalvando(false);
    onOpenChange(false);
    router.refresh();
  }

  function previa() {
    if (!semPrevia && tipo === "imagem") {
      return (
        <img
          src={material.url}
          alt={material.nome}
          className="mx-auto max-h-[55dvh] w-auto object-contain"
          onError={() => setSemPrevia(true)}
        />
      );
    }
    if (!semPrevia && tipo === "video") {
      return (
        <video
          src={material.url}
          poster={material.urlMiniatura ?? undefined}
          controls
          playsInline
          preload="metadata"
          className="max-h-[55dvh] w-full bg-black"
          onError={() => setSemPrevia(true)}
        />
      );
    }
    if (tipo === "audio") {
      return (
        <div className="p-6">
          <audio src={material.url} controls className="w-full" />
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center gap-3 p-6">
        <div className="aspect-[4/3] w-40 overflow-hidden rounded-lg bg-background ring-1 ring-black/5 dark:ring-white/10">
          <MaterialThumb material={material} />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          {semPrevia
            ? "O navegador não consegue mostrar este formato — baixe para ver."
            : "Sem prévia para este tipo de arquivo."}
        </p>
        {tipo === "pdf" && (
          <a
            href={material.url}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ExternalLink className="size-3.5" />
            Abrir em outra aba
          </a>
        )}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{material.nome}</DialogTitle>
          <DialogDescription className="tabular-nums">
            {formatBytes(material.tamanho)}
            {material.autor && ` · enviado por ${material.autor.nome}`}
            {` · ${formatRelative(material.created_at)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden rounded-lg bg-muted">{previa()}</div>

        <form id="material-form" onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="material-nome">Nome *</Label>
              <Input
                id="material-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={200}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Pasta</Label>
              <Select
                items={pastaItems}
                value={pastaId}
                onValueChange={(v) => setPastaId(v as string)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pastaItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="material-descricao">Descrição</Label>
            <Textarea
              id="material-descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: Versão final aprovada — usar no story do dia 25."
              rows={2}
            />
          </div>
        </form>

        <DialogFooter>
          {podeExcluir && (
            <Button
              type="button"
              variant="destructive"
              className="sm:mr-auto"
              onClick={onExcluir}
            >
              <Trash2 className="size-4" />
              Excluir
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onCopiarLink}>
            <Link2 className="size-4" />
            Copiar link
          </Button>
          <a
            href={material.urlDownload}
            className={buttonVariants({ variant: "outline" })}
          >
            <Download className="size-4" />
            Baixar
          </a>
          <Button
            type="submit"
            form="material-form"
            disabled={salvando || !mudou || !nome.trim()}
          >
            {salvando ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
