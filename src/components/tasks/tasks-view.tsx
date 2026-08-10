"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  Columns3,
  List,
  Milestone,
  Plus,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PRIORIDADE_LABELS, SETOR_LABELS, SETOR_ORDER } from "@/lib/format";
import { isAtrasada } from "@/lib/tasks";
import type {
  Prioridade,
  ProfileRef,
  TaskStatus,
  TaskWithRelations,
} from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Segmented } from "@/components/segmented";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { TaskCalendar } from "@/components/tasks/task-calendar";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { TaskPhases } from "@/components/tasks/task-phases";
import { TaskTable } from "@/components/tasks/task-table";

type Vista = "quadro" | "lista" | "calendario" | "fases";
type FiltroStatus = "todas" | "abertas" | "atrasadas" | "concluidas";

const VISTAS = [
  { value: "quadro" as const, label: "Quadro", icon: Columns3 },
  { value: "lista" as const, label: "Lista", icon: List },
  { value: "calendario" as const, label: "Calendário", icon: CalendarDays },
  { value: "fases" as const, label: "Fases", icon: Milestone },
];

const DESCRICAO: Record<Vista, string> = {
  // No celular não existe arrastar, então a descrição cita as duas formas.
  quadro: "Arraste o card ou use o menu dele para mudar o status.",
  lista: "Atrasadas primeiro. Toque na linha para abrir.",
  calendario: "Cada tarefa no dia do seu prazo.",
  fases: "Agrupadas pela proximidade da Feijoada.",
};

const STATUS_FILTROS = [
  { value: "todas", label: "Todas" },
  { value: "abertas", label: "Abertas" },
  { value: "atrasadas", label: "Atrasadas" },
  { value: "concluidas", label: "Concluídas" },
];

const PRIORIDADE_FILTROS = [
  { value: "todas", label: "Toda prioridade" },
  ...(["urgente", "alta", "media", "baixa"] as Prioridade[]).map((v) => ({
    value: v,
    label: PRIORIDADE_LABELS[v],
  })),
];

const SEM_RESPONSAVEL = "__sem__";
const SEM_SETOR = "__sem__";

const SETOR_FILTROS = [
  { value: "todos", label: "Todo setor" },
  ...SETOR_ORDER.map((v) => ({ value: v, label: SETOR_LABELS[v] })),
  { value: SEM_SETOR, label: "Sem setor" },
];

export function TasksView({
  tasks: tasksIniciais,
  profiles,
  meuId,
  souAdmin,
}: {
  tasks: TaskWithRelations[];
  profiles: ProfileRef[];
  meuId: string;
  souAdmin: boolean;
}) {
  const router = useRouter();

  // Espelho local para o arrastar do kanban responder na hora; o
  // router.refresh() traz a versão do servidor logo depois. O ajuste é feito
  // durante o render (padrão "adjusting state on prop change" do React), não
  // num efeito — efeito aqui causaria um segundo commit a cada refresh.
  const [tasks, setTasks] = useState(tasksIniciais);
  const [ultimasDoServidor, setUltimasDoServidor] = useState(tasksIniciais);
  if (tasksIniciais !== ultimasDoServidor) {
    setUltimasDoServidor(tasksIniciais);
    setTasks(tasksIniciais);
  }

  const [vista, setVista] = useState<Vista>("quadro");
  const [busca, setBusca] = useState("");
  const [filtroResponsavel, setFiltroResponsavel] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todas");
  const [filtroPrioridade, setFiltroPrioridade] = useState("todas");
  const [filtroSetor, setFiltroSetor] = useState("todos");

  const [dialogAberto, setDialogAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<TaskWithRelations | null>(null);
  const [statusInicial, setStatusInicial] = useState<TaskStatus>("a_fazer");

  const responsavelFiltros = [
    { value: "todos", label: "Todos" },
    { value: meuId, label: "Minhas tarefas" },
    ...profiles
      .filter((p) => p.id !== meuId)
      .map((p) => ({ value: p.id, label: p.nome })),
    { value: SEM_RESPONSAVEL, label: "Sem responsável" },
  ];

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return tasks.filter((task) => {
      if (termo && !task.titulo.toLowerCase().includes(termo)) {
        if (!task.descricao?.toLowerCase().includes(termo)) return false;
      }

      if (filtroResponsavel === SEM_RESPONSAVEL) {
        if (task.responsavel_id) return false;
      } else if (filtroResponsavel !== "todos") {
        if (task.responsavel_id !== filtroResponsavel) return false;
      }

      if (filtroStatus === "abertas" && task.status === "concluida") return false;
      if (filtroStatus === "concluidas" && task.status !== "concluida")
        return false;
      if (filtroStatus === "atrasadas" && !isAtrasada(task)) return false;

      if (filtroPrioridade !== "todas" && task.prioridade !== filtroPrioridade)
        return false;

      if (filtroSetor === SEM_SETOR) {
        if (task.setor) return false;
      } else if (filtroSetor !== "todos") {
        if (task.setor !== filtroSetor) return false;
      }

      return true;
    });
  }, [
    tasks,
    busca,
    filtroResponsavel,
    filtroStatus,
    filtroPrioridade,
    filtroSetor,
  ]);

  function abrirNova(status: TaskStatus = "a_fazer") {
    setEmEdicao(null);
    setStatusInicial(status);
    setDialogAberto(true);
  }

  function abrir(task: TaskWithRelations) {
    setEmEdicao(task);
    setDialogAberto(true);
  }

  async function persistir(
    task: TaskWithRelations,
    campos: Partial<TaskWithRelations>,
    mensagem: string
  ) {
    const anterior = tasks;
    setTasks((atual) =>
      atual.map((t) => (t.id === task.id ? { ...t, ...campos } : t))
    );

    const supabase = createClient();
    const { error } = await supabase
      .from("tasks")
      .update(campos)
      .eq("id", task.id);

    if (error) {
      setTasks(anterior);
      toast.error("Não foi possível salvar", { description: error.message });
      return;
    }

    toast.success(mensagem);
    router.refresh();
  }

  function mover(task: TaskWithRelations, status: TaskStatus, ordem: number) {
    const virouConcluida = status === "concluida" && task.status !== "concluida";
    persistir(
      task,
      { status, ordem },
      virouConcluida && task.recorrencia
        ? "Concluída — a próxima já foi criada"
        : "Tarefa movida"
    );
  }

  function alternarConclusao(task: TaskWithRelations) {
    const concluida = task.status === "concluida";
    persistir(
      task,
      { status: concluida ? "a_fazer" : "concluida" },
      concluida
        ? "Tarefa reaberta"
        : task.recorrencia
          ? "Concluída — a próxima já foi criada"
          : "Tarefa concluída"
    );
  }

  return (
    <div>
      <PageHeader title="Tarefas" description={DESCRICAO[vista]}>
        <Segmented options={VISTAS} value={vista} onChange={setVista} />
        <Button onClick={() => abrirNova()}>
          <Plus className="size-4" />
          Nova tarefa
        </Button>
      </PageHeader>

      {/* No celular: busca em uma linha e os filtros numa grade de 2 colunas.
          Enfileirar os três daria ~110px cada e todo rótulo truncaria. */}
      <div className="mb-4 space-y-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3 sm:space-y-0">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefa…"
            className="pl-8"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
          <Select
            items={responsavelFiltros}
            value={filtroResponsavel}
            onValueChange={(v) => setFiltroResponsavel(v as string)}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {responsavelFiltros.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={STATUS_FILTROS}
            value={filtroStatus}
            onValueChange={(v) => setFiltroStatus(v as FiltroStatus)}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTROS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={PRIORIDADE_FILTROS}
            value={filtroPrioridade}
            onValueChange={(v) => setFiltroPrioridade(v as string)}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORIDADE_FILTROS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            items={SETOR_FILTROS}
            value={filtroSetor}
            onValueChange={(v) => setFiltroSetor(v as string)}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SETOR_FILTROS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="self-center text-xs tabular-nums text-muted-foreground">
            {filtradas.length} de {tasks.length}
          </span>
        </div>
      </div>

      {vista === "quadro" && (
        <KanbanBoard
          tasks={filtradas}
          onOpen={abrir}
          onNova={abrirNova}
          onMover={mover}
        />
      )}
      {vista === "lista" && (
        <TaskTable
          tasks={filtradas}
          onOpen={abrir}
          onAlternarConclusao={alternarConclusao}
        />
      )}
      {vista === "calendario" && (
        <TaskCalendar tasks={filtradas} onOpen={abrir} />
      )}
      {vista === "fases" && <TaskPhases tasks={filtradas} onOpen={abrir} />}

      {dialogAberto && (
        <TaskDialog
          key={emEdicao?.id ?? "nova"}
          open={dialogAberto}
          onOpenChange={setDialogAberto}
          task={emEdicao}
          profiles={profiles}
          meuId={meuId}
          souAdmin={souAdmin}
          statusInicial={statusInicial}
        />
      )}
    </div>
  );
}
