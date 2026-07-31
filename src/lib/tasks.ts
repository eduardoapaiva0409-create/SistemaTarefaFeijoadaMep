import {
  PRIORIDADE_PESO,
  diasAtePrazo,
  formatDate,
  formatDateShort,
  labelPrazo,
  toISODate,
} from "@/lib/format";
import type { Prioridade, TaskStatus, TaskWithRelations } from "@/lib/types";

/**
 * Embed padrão das tarefas. `responsavel` e `autor` apontam para a MESMA tabela
 * (profiles), então o PostgREST exige desambiguar pela coluna da FK.
 */
export const TASK_SELECT = `
  *,
  responsavel:profiles!responsavel_id (id, nome, cargo),
  autor:profiles!criado_por (id, nome, cargo),
  task_items (id, concluido)
`;

/** Semáforo do prazo — o único uso de cor semântica nas tarefas. */
export type PrazoTom = "atrasada" | "hoje" | "proxima" | "neutra";

export function tomDoPrazo(task: TaskWithRelations): PrazoTom {
  if (task.status === "concluida") return "neutra";
  const dias = diasAtePrazo(task.prazo);
  if (dias === null) return "neutra";
  if (dias < 0) return "atrasada";
  if (dias === 0) return "hoje";
  if (dias <= 2) return "proxima";
  return "neutra";
}

export const PRAZO_TEXT: Record<PrazoTom, string> = {
  atrasada: "text-red-600 dark:text-red-400",
  hoje: "text-amber-600 dark:text-amber-400",
  proxima: "text-amber-600/80 dark:text-amber-400/80",
  neutra: "text-muted-foreground",
};

export const PRIORIDADE_BADGE: Record<Prioridade, string> = {
  urgente: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  alta: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  media: "bg-muted text-muted-foreground",
  baixa: "bg-muted text-muted-foreground/70",
};

export const STATUS_BADGE: Record<TaskStatus, string> = {
  a_fazer: "bg-muted text-muted-foreground",
  em_andamento:
    "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  concluida:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

/**
 * Rótulo de prazo do card. Tarefa concluída não pode dizer "Atrasada 2 dias":
 * o prazo já não cobra nada, o que interessa é quando ficou pronta.
 */
export function labelPrazoTask(task: TaskWithRelations): string {
  if (task.status !== "concluida") return labelPrazo(task.prazo);
  if (task.concluida_em) {
    // concluida_em é timestamptz: converter para data LOCAL antes de formatar,
    // senão uma conclusão à noite no Brasil aparece como o dia seguinte.
    return `Feita ${formatDateShort(toISODate(new Date(task.concluida_em)))}`;
  }
  return formatDate(task.prazo);
}

export function isAtrasada(task: TaskWithRelations): boolean {
  return tomDoPrazo(task) === "atrasada";
}

export function isDeHoje(task: TaskWithRelations): boolean {
  return task.status !== "concluida" && diasAtePrazo(task.prazo) === 0;
}

export function progressoChecklist(task: TaskWithRelations) {
  const total = task.task_items?.length ?? 0;
  const feitos = task.task_items?.filter((i) => i.concluido).length ?? 0;
  return { total, feitos, pct: total ? Math.round((feitos / total) * 100) : 0 };
}

/**
 * Ordenação da lista: atrasadas primeiro, depois por prazo, depois prioridade.
 * Sem prazo vai para o fim — não compete com quem tem data marcada.
 */
export function ordenarPorUrgencia(tasks: TaskWithRelations[]) {
  return [...tasks].sort((a, b) => {
    // Concluída sai da fila da urgência: um prazo vencido de tarefa já feita
    // não pode liderar a lista à frente do que ainda é trabalho.
    const ca = a.status === "concluida" ? 1 : 0;
    const cb = b.status === "concluida" ? 1 : 0;
    if (ca !== cb) return ca - cb;
    if (ca === 1) {
      return (b.concluida_em ?? "").localeCompare(a.concluida_em ?? "");
    }

    const da = diasAtePrazo(a.prazo);
    const db = diasAtePrazo(b.prazo);
    if (da !== db) {
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db;
    }
    const pa = PRIORIDADE_PESO[a.prioridade];
    const pb = PRIORIDADE_PESO[b.prioridade];
    if (pa !== pb) return pa - pb;
    return a.titulo.localeCompare(b.titulo, "pt-BR");
  });
}

/** Ordem do kanban: posição manual (arrastar), mais recente no topo. */
export function ordenarPorPosicao(tasks: TaskWithRelations[]) {
  return [...tasks].sort((a, b) => b.ordem - a.ordem);
}

export type Metricas = {
  atrasadas: number;
  hoje: number;
  emAndamento: number;
  concluidasSemana: number;
  abertas: number;
};

export function calcularMetricas(tasks: TaskWithRelations[]): Metricas {
  const inicioSemana = new Date();
  inicioSemana.setHours(0, 0, 0, 0);
  // Semana começa na segunda (getDay(): domingo = 0).
  inicioSemana.setDate(
    inicioSemana.getDate() - ((inicioSemana.getDay() + 6) % 7)
  );

  return {
    atrasadas: tasks.filter(isAtrasada).length,
    hoje: tasks.filter(isDeHoje).length,
    emAndamento: tasks.filter((t) => t.status === "em_andamento").length,
    abertas: tasks.filter((t) => t.status !== "concluida").length,
    concluidasSemana: tasks.filter(
      (t) => t.concluida_em && new Date(t.concluida_em) >= inicioSemana
    ).length,
  };
}

/** Carga aberta por pessoa, para a barra de proporção do dashboard. */
export function cargaPorResponsavel(tasks: TaskWithRelations[]) {
  const mapa = new Map<
    string,
    { id: string | null; nome: string; abertas: number; atrasadas: number }
  >();

  for (const task of tasks) {
    if (task.status === "concluida") continue;
    const id = task.responsavel_id ?? "__sem__";
    const atual = mapa.get(id) ?? {
      id: task.responsavel_id,
      nome: task.responsavel?.nome ?? "Sem responsável",
      abertas: 0,
      atrasadas: 0,
    };
    atual.abertas += 1;
    if (isAtrasada(task)) atual.atrasadas += 1;
    mapa.set(id, atual);
  }

  return [...mapa.values()].sort((a, b) => b.abertas - a.abertas);
}

/** Série de criadas x concluídas por dia, para o gráfico do dashboard. */
export function serieDiaria(tasks: TaskWithRelations[], dias = 14) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const buckets = new Map<string, { criadas: number; concluidas: number }>();
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(hoje);
    d.setDate(d.getDate() - i);
    buckets.set(toISODate(d), { criadas: 0, concluidas: 0 });
  }

  for (const task of tasks) {
    const criadaEm = toISODate(new Date(task.created_at));
    const bCriada = buckets.get(criadaEm);
    if (bCriada) bCriada.criadas += 1;

    if (task.concluida_em) {
      const bFeita = buckets.get(toISODate(new Date(task.concluida_em)));
      if (bFeita) bFeita.concluidas += 1;
    }
  }

  return [...buckets.entries()].map(([dia, valores]) => {
    const d = new Date(`${dia}T00:00:00`);
    return {
      dia,
      label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      ...valores,
    };
  });
}

/**
 * Nova posição no kanban ao soltar entre dois cards. Ponto médio evita
 * reescrever a coluna inteira a cada arrasto.
 */
export function calcularOrdem(
  anterior: number | undefined,
  posterior: number | undefined
): number {
  if (anterior === undefined && posterior === undefined) return Date.now() / 1000;
  if (anterior === undefined) return posterior! + 1000;
  if (posterior === undefined) return anterior - 1000;
  return (anterior + posterior) / 2;
}
