"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pin, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  BLOCO_TIPO_HINT,
  BLOCO_TIPO_LABELS,
  BLOCO_TIPO_ORDER,
  formatDuracao,
  horaDeMinutos,
  limitarDuracao,
  minutosDeTime,
} from "@/lib/programacao";
import type {
  BlocoEvent,
  BlocoTipo,
  BlocoWithRelations,
  ProfileRef,
} from "@/lib/types";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BlocoActivity } from "@/components/programacao/bloco-activity";

/** Base UI não aceita "" como valor de item — sentinela para "nenhum". */
const SEM_RESPONSAVEL = "__none__";

const TIPO_ITEMS = BLOCO_TIPO_ORDER.map((v) => ({
  value: v,
  label: BLOCO_TIPO_LABELS[v],
}));

const EVENTOS_SELECT = "*, autor:profiles!autor_id (id, nome, funcao, foto_url)";

export function BlocoDialog({
  open,
  onOpenChange,
  bloco,
  inicioNaFila,
  ordemNova,
  profiles,
  meuId,
  souAdmin,
  onExcluir,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = bloco novo, que entra no fim do dia. */
  bloco: BlocoWithRelations | null;
  /**
   * Onde a cascata deixaria este bloco sem hora marcada: o fim do anterior.
   * Serve só para mostrar "vai das X às Y" enquanto a pessoa edita.
   */
  inicioNaFila: number;
  /** Posição do bloco novo na fila (depois do último). */
  ordemNova: number;
  profiles: ProfileRef[];
  meuId: string;
  souAdmin: boolean;
  onExcluir: (bloco: BlocoWithRelations) => void;
}) {
  const router = useRouter();
  const editando = bloco !== null;
  const podeExcluir = editando && (souAdmin || bloco.criado_por === meuId);

  const [titulo, setTitulo] = useState(bloco?.titulo ?? "");
  const [tipo, setTipo] = useState<BlocoTipo>(bloco?.tipo ?? "apresentacao");
  // Texto, não número: corrigir a cada tecla atrapalha quem digita ("45"
  // passa por "4" e viraria 5 no caminho). O ajuste fica no blur e no salvar.
  const [duracao, setDuracao] = useState(String(bloco?.duracao_min ?? 30));
  const [horaFixa, setHoraFixa] = useState(bloco?.inicio_fixo?.slice(0, 5) ?? "");
  const [conduzidoPor, setConduzidoPor] = useState(bloco?.conduzido_por ?? "");
  const [responsavelId, setResponsavelId] = useState(
    bloco?.responsavel_id ?? SEM_RESPONSAVEL
  );
  const [local, setLocal] = useState(bloco?.local ?? "");
  const [descricao, setDescricao] = useState(bloco?.descricao ?? "");

  const [eventos, setEventos] = useState<BlocoEvent[]>([]);
  const [carregandoEventos, setCarregandoEventos] = useState(editando);
  const [salvando, setSalvando] = useState(false);

  // Inativo some da lista — a não ser que já seja o dono deste bloco.
  const responsavelItems = [
    { value: SEM_RESPONSAVEL, label: "Sem responsável" },
    ...profiles.map((p) => ({ value: p.id, label: p.nome })),
    ...(bloco?.responsavel && !profiles.some((p) => p.id === bloco.responsavel_id)
      ? [{ value: bloco.responsavel.id, label: bloco.responsavel.nome }]
      : []),
  ];

  const minutos = limitarDuracao(Number(duracao));
  const inicio = minutosDeTime(horaFixa) ?? inicioNaFila;

  // Comentários e histórico só existem depois que o bloco existe.
  useEffect(() => {
    if (!open || !bloco) return;
    let ativo = true;

    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("bloco_events")
        .select(EVENTOS_SELECT)
        .eq("bloco_id", bloco.id)
        .order("created_at", { ascending: false });
      if (!ativo) return;
      setEventos((data ?? []) as BlocoEvent[]);
      setCarregandoEventos(false);
    })();

    return () => {
      ativo = false;
    };
  }, [open, bloco]);

  async function recarregarEventos() {
    if (!bloco) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("bloco_events")
      .select(EVENTOS_SELECT)
      .eq("bloco_id", bloco.id)
      .order("created_at", { ascending: false });
    setEventos((data ?? []) as BlocoEvent[]);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!titulo.trim()) return;
    setSalvando(true);

    const supabase = createClient();
    const payload = {
      titulo: titulo.trim(),
      tipo,
      duracao_min: minutos,
      inicio_fixo: horaFixa || null,
      conduzido_por: conduzidoPor.trim() || null,
      responsavel_id: responsavelId === SEM_RESPONSAVEL ? null : responsavelId,
      local: local.trim() || null,
      descricao: descricao.trim() || null,
    };

    const { error } = editando
      ? await supabase.from("blocos").update(payload).eq("id", bloco.id)
      : await supabase
          .from("blocos")
          .insert({ ...payload, ordem: ordemNova, criado_por: meuId });

    if (error) {
      toast.error(editando ? "Erro ao salvar" : "Erro ao criar o bloco", {
        description: error.message,
      });
      setSalvando(false);
      return;
    }

    toast.success(editando ? "Bloco atualizado" : "Bloco adicionado ao dia");
    setSalvando(false);
    onOpenChange(false);
    router.refresh();
  }

  async function comentar(texto: string) {
    if (!bloco) return;
    const supabase = createClient();
    const { error } = await supabase.from("bloco_events").insert({
      bloco_id: bloco.id,
      autor_id: meuId,
      tipo: "comentario",
      texto,
    });
    if (error) {
      toast.error("Erro ao comentar", { description: error.message });
      return;
    }
    await recarregarEventos();
    router.refresh(); // contador de comentários do card
  }

  async function excluirComentario(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("bloco_events").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir comentário", { description: error.message });
      return;
    }
    setEventos((atual) => atual.filter((e) => e.id !== id));
    router.refresh();
  }

  const campos = (
    <div className="grid gap-4">
      <p className="rounded-lg bg-muted/60 px-3 py-2 text-[13px] tabular-nums text-muted-foreground">
        {editando ? "Neste lugar do dia, vai" : "Entrando no fim do dia, vai"} das{" "}
        <span className="font-semibold text-foreground">{horaDeMinutos(inicio)}</span>{" "}
        às{" "}
        <span className="font-semibold text-foreground">
          {horaDeMinutos(inicio + minutos)}
        </span>{" "}
        · {formatDuracao(minutos)}
      </p>

      <div className="grid gap-2">
        <Label htmlFor="bloco-titulo">Bloco *</Label>
        <Input
          id="bloco-titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex.: Feijoada servida"
          required
          autoFocus={!editando}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Formato</Label>
          <Select
            items={TIPO_ITEMS}
            value={tipo}
            onValueChange={(v) => setTipo(v as BlocoTipo)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPO_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{BLOCO_TIPO_HINT[tipo]}</p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="bloco-duracao">Duração (min) *</Label>
          <Input
            id="bloco-duracao"
            type="number"
            inputMode="numeric"
            min={5}
            max={720}
            step={5}
            value={duracao}
            onChange={(e) => setDuracao(e.target.value)}
            onBlur={() => setDuracao(String(minutos))}
            required
          />
          <p className="text-xs text-muted-foreground">
            Mudou aqui, o resto do dia se reacomoda.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="bloco-conduz">Quem conduz ou se apresenta</Label>
          <Input
            id="bloco-conduz"
            value={conduzidoPor}
            onChange={(e) => setConduzidoPor(e.target.value)}
            placeholder="Ex.: Banda do Escalada"
          />
          <p className="text-xs text-muted-foreground">
            Texto livre — convidado de fora não tem perfil aqui.
          </p>
        </div>

        <div className="grid gap-2">
          <Label>Responsável</Label>
          <Select
            items={responsavelItems}
            value={responsavelId}
            onValueChange={(v) => setResponsavelId(v as string)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {responsavelItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Quem da equipe garante que isso aconteça.
          </p>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="bloco-local">Local</Label>
          <Input
            id="bloco-local"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            placeholder="Ex.: Salão principal"
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="bloco-hora">Hora marcada</Label>
          <Input
            id="bloco-hora"
            type="time"
            step={300}
            value={horaFixa}
            onChange={(e) => setHoraFixa(e.target.value)}
          />
          {horaFixa ? (
            <button
              type="button"
              onClick={() => setHoraFixa("")}
              className="justify-self-start text-xs text-muted-foreground hover:text-foreground"
            >
              Tirar a hora marcada
            </button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Só para o que não desliza: almoço, banda, saída do espaço.
            </p>
          )}
        </div>
      </div>

      {horaFixa && (
        <p className="flex items-start gap-2 rounded-lg border border-input bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">
          <Pin className="mt-px size-3.5 shrink-0" />
          Com hora marcada o bloco vira âncora: não desliza quando algo antes
          dele estica, e a programação avisa se a fila estourar por cima dele.
        </p>
      )}

      <div className="grid gap-2">
        <Label htmlFor="bloco-descricao">Notas</Label>
        <Textarea
          id="bloco-descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex.: Precisa de duas caixas de som e extensão até o palco."
          rows={3}
        />
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{editando ? "Detalhes do bloco" : "Novo bloco"}</DialogTitle>
          {!editando && (
            <DialogDescription>
              Ele entra no fim do dia — depois é só arrastar para o lugar.
            </DialogDescription>
          )}
        </DialogHeader>

        {editando ? (
          <Tabs defaultValue="bloco">
            <TabsList className="w-full">
              <TabsTrigger value="bloco">Bloco</TabsTrigger>
              <TabsTrigger value="atividade">Atividade</TabsTrigger>
            </TabsList>

            <TabsContent value="bloco" className="pt-2">
              <form id="bloco-form" onSubmit={handleSubmit}>
                {campos}
              </form>
            </TabsContent>

            <TabsContent value="atividade" className="pt-2">
              <BlocoActivity
                eventos={eventos}
                carregando={carregandoEventos}
                meuId={meuId}
                souAdmin={souAdmin}
                onComentar={comentar}
                onExcluirComentario={excluirComentario}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <form id="bloco-form" onSubmit={handleSubmit}>
            {campos}
          </form>
        )}

        <DialogFooter>
          {podeExcluir && (
            <Button
              type="button"
              variant="destructive"
              className="sm:mr-auto"
              onClick={() => onExcluir(bloco)}
            >
              <Trash2 className="size-4" />
              Remover
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="bloco-form" disabled={salvando || !titulo.trim()}>
            {salvando ? "Salvando…" : editando ? "Salvar" : "Adicionar ao dia"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
