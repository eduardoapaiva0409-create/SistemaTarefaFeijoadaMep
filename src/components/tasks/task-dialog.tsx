"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Repeat, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  PRIORIDADE_LABELS,
  RECORRENCIA_LABELS,
  STATUS_LABELS,
  STATUS_ORDER,
} from "@/lib/format";
import type {
  Prioridade,
  ProfileRef,
  Recorrencia,
  TaskEvent,
  TaskItem,
  TaskStatus,
  TaskWithRelations,
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
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  TaskChecklist,
  type ChecklistItem,
} from "@/components/tasks/task-checklist";
import { TaskActivity } from "@/components/tasks/task-activity";

/** Base UI não aceita "" como valor de item — sentinela para "nenhum". */
const SEM_RESPONSAVEL = "__none__";
const SEM_RECORRENCIA = "__nao__";

const STATUS_ITEMS = STATUS_ORDER.map((v) => ({
  value: v,
  label: STATUS_LABELS[v],
}));

const PRIORIDADE_ITEMS = (
  ["urgente", "alta", "media", "baixa"] as Prioridade[]
).map((v) => ({ value: v, label: PRIORIDADE_LABELS[v] }));

const RECORRENCIA_ITEMS = [
  { value: SEM_RECORRENCIA, label: "Não repete" },
  ...(["diaria", "semanal", "quinzenal", "mensal"] as Recorrencia[]).map(
    (v) => ({ value: v, label: RECORRENCIA_LABELS[v] })
  ),
];

export function TaskDialog({
  open,
  onOpenChange,
  task,
  profiles,
  meuId,
  souAdmin,
  statusInicial = "a_fazer",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskWithRelations | null;
  profiles: ProfileRef[];
  meuId: string;
  souAdmin: boolean;
  /** Coluna do kanban de onde veio o "+", para a tarefa já nascer no lugar. */
  statusInicial?: TaskStatus;
}) {
  const router = useRouter();
  const editando = task !== null;
  const podeEditar =
    !editando ||
    souAdmin ||
    task.responsavel_id === meuId ||
    task.criado_por === meuId;

  const [titulo, setTitulo] = useState(task?.titulo ?? "");
  const [descricao, setDescricao] = useState(task?.descricao ?? "");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? statusInicial);
  const [prioridade, setPrioridade] = useState<Prioridade>(
    task?.prioridade ?? "media"
  );
  const [responsavelId, setResponsavelId] = useState(
    task?.responsavel_id ?? SEM_RESPONSAVEL
  );
  const [prazo, setPrazo] = useState(task?.prazo ?? "");
  const [recorrencia, setRecorrencia] = useState<string>(
    task?.recorrencia ?? SEM_RECORRENCIA
  );

  const [itens, setItens] = useState<ChecklistItem[]>([]);
  const [eventos, setEventos] = useState<TaskEvent[]>([]);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(editando);
  const [salvando, setSalvando] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const responsavelItems = [
    { value: SEM_RESPONSAVEL, label: "Sem responsável" },
    ...profiles.map((p) => ({ value: p.id, label: p.nome })),
  ];

  // Checklist e linha do tempo só existem depois que a tarefa existe.
  useEffect(() => {
    if (!open || !task) return;
    let ativo = true;

    (async () => {
      const supabase = createClient();
      const [{ data: itensData }, { data: eventosData }] = await Promise.all([
        supabase
          .from("task_items")
          .select("*")
          .eq("task_id", task.id)
          .order("ordem"),
        supabase
          .from("task_events")
          .select("*, autor:profiles!autor_id (id, nome, cargo)")
          .eq("task_id", task.id)
          .order("created_at", { ascending: false }),
      ]);

      if (!ativo) return;
      setItens(
        ((itensData ?? []) as TaskItem[]).map((i) => ({
          id: i.id,
          texto: i.texto,
          concluido: i.concluido,
        }))
      );
      setEventos((eventosData ?? []) as TaskEvent[]);
      setCarregandoDetalhe(false);
    })();

    return () => {
      ativo = false;
    };
  }, [open, task]);

  async function recarregarEventos() {
    if (!task) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("task_events")
      .select("*, autor:profiles!autor_id (id, nome, cargo)")
      .eq("task_id", task.id)
      .order("created_at", { ascending: false });
    setEventos((data ?? []) as TaskEvent[]);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!titulo.trim()) return;
    setSalvando(true);

    const supabase = createClient();
    const payload = {
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      status,
      prioridade,
      responsavel_id: responsavelId === SEM_RESPONSAVEL ? null : responsavelId,
      prazo: prazo || null,
      recorrencia: recorrencia === SEM_RECORRENCIA ? null : recorrencia,
    };

    if (editando) {
      const { error } = await supabase
        .from("tasks")
        .update(payload)
        .eq("id", task.id);
      if (error) {
        toast.error("Erro ao salvar", { description: error.message });
        setSalvando(false);
        return;
      }
      toast.success("Tarefa atualizada");
    } else {
      const { data, error } = await supabase
        .from("tasks")
        .insert({ ...payload, criado_por: meuId })
        .select("id")
        .single();

      if (error) {
        toast.error("Erro ao criar tarefa", { description: error.message });
        setSalvando(false);
        return;
      }

      if (itens.length > 0) {
        const { error: itensError } = await supabase.from("task_items").insert(
          itens.map((item, index) => ({
            task_id: data.id,
            texto: item.texto,
            ordem: index,
          }))
        );
        if (itensError) {
          toast.error("Tarefa criada, mas o checklist falhou", {
            description: itensError.message,
          });
        }
      }
      toast.success("Tarefa criada");
    }

    setSalvando(false);
    onOpenChange(false);
    router.refresh();
  }

  async function excluir() {
    if (!task) return;
    const supabase = createClient();
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) {
      toast.error("Erro ao excluir", { description: error.message });
      return;
    }
    toast.success("Tarefa excluída");
    setConfirmarExclusao(false);
    onOpenChange(false);
    router.refresh();
  }

  // ── Checklist ─────────────────────────────────────────────────────────────
  // Tarefa nova guarda os itens em memória (vão junto no insert); tarefa
  // existente grava na hora, para não perder o clique se o dialog fechar.
  async function adicionarItem(texto: string) {
    if (!editando) {
      setItens((atual) => [
        ...atual,
        { id: `tmp-${Date.now()}`, texto, concluido: false },
      ]);
      return;
    }
    const supabase = createClient();
    const { data, error } = await supabase
      .from("task_items")
      .insert({ task_id: task.id, texto, ordem: itens.length })
      .select("*")
      .single();
    if (error) {
      toast.error("Erro ao adicionar item", { description: error.message });
      return;
    }
    setItens((atual) => [...atual, { id: data.id, texto, concluido: false }]);
    router.refresh();
  }

  async function alternarItem(id: string, concluido: boolean) {
    setItens((atual) =>
      atual.map((i) => (i.id === id ? { ...i, concluido } : i))
    );
    if (!editando) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("task_items")
      .update({ concluido })
      .eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar item", { description: error.message });
      setItens((atual) =>
        atual.map((i) => (i.id === id ? { ...i, concluido: !concluido } : i))
      );
      return;
    }
    router.refresh();
  }

  async function removerItem(id: string) {
    const anterior = itens;
    setItens((atual) => atual.filter((i) => i.id !== id));
    if (!editando) return;
    const supabase = createClient();
    const { error } = await supabase.from("task_items").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover item", { description: error.message });
      setItens(anterior);
      return;
    }
    router.refresh();
  }

  // ── Comentários ───────────────────────────────────────────────────────────
  async function comentar(texto: string) {
    if (!task) return;
    const supabase = createClient();
    const { error } = await supabase.from("task_events").insert({
      task_id: task.id,
      autor_id: meuId,
      tipo: "comentario",
      texto,
    });
    if (error) {
      toast.error("Erro ao comentar", { description: error.message });
      return;
    }
    await recarregarEventos();
  }

  async function excluirComentario(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("task_events").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir comentário", { description: error.message });
      return;
    }
    setEventos((atual) => atual.filter((e) => e.id !== id));
  }

  const campos = (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="titulo">Tarefa *</Label>
        <Input
          id="titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex.: Polir capô do Civic prata"
          disabled={!podeEditar}
          required
          autoFocus={!editando}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea
          id="descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Ex.: Cliente pediu atenção no risco da porta traseira."
          rows={3}
          disabled={!podeEditar}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Responsável</Label>
          <Select
            items={responsavelItems}
            value={responsavelId}
            onValueChange={(v) => setResponsavelId(v as string)}
            disabled={!podeEditar}
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
        </div>

        <div className="grid gap-2">
          <Label htmlFor="prazo">Prazo</Label>
          <Input
            id="prazo"
            type="date"
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
            disabled={!podeEditar}
          />
        </div>

        <div className="grid gap-2">
          <Label>Prioridade</Label>
          <Select
            items={PRIORIDADE_ITEMS}
            value={prioridade}
            onValueChange={(v) => setPrioridade(v as Prioridade)}
            disabled={!podeEditar}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORIDADE_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>Status</Label>
          <Select
            items={STATUS_ITEMS}
            value={status}
            onValueChange={(v) => setStatus(v as TaskStatus)}
            disabled={!podeEditar}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-2 rounded-lg border border-input bg-muted/30 p-3">
        <Label className="flex items-center gap-2">
          <Repeat className="size-4 text-muted-foreground" />
          Repetição
        </Label>
        <Select
          items={RECORRENCIA_ITEMS}
          value={recorrencia}
          onValueChange={(v) => setRecorrencia(v as string)}
          disabled={!podeEditar}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RECORRENCIA_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Ao concluir, o sistema cria a próxima ocorrência já com o checklist.
        </p>
      </div>
    </div>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={editando ? "sm:max-w-lg" : "sm:max-w-md"}
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>
              {editando ? "Detalhes da tarefa" : "Nova tarefa"}
            </DialogTitle>
            {!editando && (
              <DialogDescription>
                Delegue para alguém da equipe e marque o prazo.
              </DialogDescription>
            )}
          </DialogHeader>

          {editando ? (
            <Tabs defaultValue="tarefa">
              <TabsList className="w-full">
                <TabsTrigger value="tarefa">Tarefa</TabsTrigger>
                <TabsTrigger value="checklist">
                  Checklist
                  {itens.length > 0 && (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {itens.filter((i) => i.concluido).length}/{itens.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="atividade">Atividade</TabsTrigger>
              </TabsList>

              <TabsContent value="tarefa" className="pt-2">
                <form id="task-form" onSubmit={handleSubmit}>
                  {campos}
                </form>
              </TabsContent>

              <TabsContent value="checklist" className="pt-2">
                <TaskChecklist
                  items={itens}
                  disabled={!podeEditar}
                  onAdd={adicionarItem}
                  onToggle={alternarItem}
                  onRemove={removerItem}
                />
              </TabsContent>

              <TabsContent value="atividade" className="pt-2">
                <TaskActivity
                  eventos={eventos}
                  carregando={carregandoDetalhe}
                  meuId={meuId}
                  souAdmin={souAdmin}
                  onComentar={comentar}
                  onExcluirComentario={excluirComentario}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <form id="task-form" onSubmit={handleSubmit} className="grid gap-4">
              {campos}
              <div>
                <p className="mb-3 text-sm font-semibold tracking-tight text-muted-foreground">
                  Checklist
                </p>
                <TaskChecklist
                  items={itens}
                  onAdd={adicionarItem}
                  onToggle={alternarItem}
                  onRemove={removerItem}
                />
              </div>
            </form>
          )}

          <DialogFooter>
            {editando && (souAdmin || task.criado_por === meuId) && (
              <Button
                type="button"
                variant="destructive"
                className="sm:mr-auto"
                onClick={() => setConfirmarExclusao(true)}
              >
                <Trash2 className="size-4" />
                Excluir
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {podeEditar ? "Cancelar" : "Fechar"}
            </Button>
            {podeEditar && (
              <Button type="submit" form="task-form" disabled={salvando}>
                {salvando ? "Salvando…" : "Salvar"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmarExclusao}
        onOpenChange={setConfirmarExclusao}
        title="Excluir tarefa?"
        description="O checklist e os comentários vão junto. Não dá para desfazer."
        confirmLabel="Excluir"
        destructive
        onConfirm={excluir}
      />
    </>
  );
}
