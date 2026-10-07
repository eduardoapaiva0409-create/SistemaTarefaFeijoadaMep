"use client";

import {
  ActivityTimeline,
  type ActivityTimelineProps,
} from "@/components/activity-timeline";
import { BLOCO_TIPO_LABELS, formatDuracao } from "@/lib/programacao";
import type { BlocoEvent, BlocoTipo } from "@/lib/types";

function formatoLabel(v: string | null) {
  return v ? (BLOCO_TIPO_LABELS[v as BlocoTipo] ?? v) : "—";
}

/** Duração vem gravada em minutos crus ("60") — a frase mostra "1h". */
function duracaoLabel(v: string | null) {
  const minutos = Number(v);
  return v && Number.isFinite(minutos) ? formatDuracao(minutos) : "—";
}

/** Frase do evento de mudança. Comentário é tratado à parte (tem corpo). */
function descreverEvento(evento: BlocoEvent): string {
  switch (evento.tipo) {
    case "criacao":
      return "criou o bloco";
    case "titulo":
      return `renomeou de “${evento.de}” para “${evento.para}”`;
    case "duracao":
      return `mudou a duração de ${duracaoLabel(evento.de)} para ${duracaoLabel(evento.para)}`;
    case "horario":
      if (!evento.para) return `tirou a hora marcada (${evento.de})`;
      if (!evento.de) return `marcou hora fixa às ${evento.para}`;
      return `mudou a hora marcada de ${evento.de} para ${evento.para}`;
    case "responsavel":
      if (!evento.para) return `tirou ${evento.de ?? "o responsável"} do bloco`;
      if (!evento.de) return `passou o bloco para ${evento.para}`;
      return `passou de ${evento.de} para ${evento.para}`;
    case "formato":
      return `mudou o formato de ${formatoLabel(evento.de)} para ${formatoLabel(evento.para)}`;
    default:
      return "";
  }
}

export function BlocoActivity(props: ActivityTimelineProps<BlocoEvent>) {
  return (
    <ActivityTimeline
      {...props}
      descrever={descreverEvento}
      placeholder="Ex.: 40 min é pouco pra banda — dá pra puxar o sorteio?"
    />
  );
}
