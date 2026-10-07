"use client";

import {
  ActivityTimeline,
  type ActivityTimelineProps,
} from "@/components/activity-timeline";
import { PRIORIDADE_LABELS, STATUS_LABELS, formatDate } from "@/lib/format";
import type { Prioridade, TaskEvent, TaskStatus } from "@/lib/types";

function statusLabel(v: string | null) {
  return v ? (STATUS_LABELS[v as TaskStatus] ?? v) : "—";
}

function prioridadeLabel(v: string | null) {
  return v ? (PRIORIDADE_LABELS[v as Prioridade] ?? v) : "—";
}

/** Frase do evento de mudança. Comentário é tratado à parte (tem corpo). */
function descreverEvento(evento: TaskEvent): string {
  switch (evento.tipo) {
    case "criacao":
      return "criou a tarefa";
    case "status":
      return `moveu de ${statusLabel(evento.de)} para ${statusLabel(evento.para)}`;
    case "responsavel":
      if (!evento.para) return `tirou ${evento.de ?? "o responsável"} da tarefa`;
      if (!evento.de) return `delegou para ${evento.para}`;
      return `passou de ${evento.de} para ${evento.para}`;
    case "prazo":
      if (!evento.para) return "removeu o prazo";
      if (!evento.de) return `definiu o prazo para ${formatDate(evento.para)}`;
      return `mudou o prazo de ${formatDate(evento.de)} para ${formatDate(evento.para)}`;
    case "prioridade":
      return `mudou a prioridade de ${prioridadeLabel(evento.de)} para ${prioridadeLabel(evento.para)}`;
    default:
      return "";
  }
}

export function TaskActivity(props: ActivityTimelineProps<TaskEvent>) {
  return (
    <ActivityTimeline
      {...props}
      descrever={descreverEvento}
      placeholder="Ex.: Comprei as carnes, falta só o feijão."
    />
  );
}
