// Constantes e lógica de fase da Feijoada do Escalada — evento único, 29/11/2026.
// "Fase" é derivada do `prazo` da tarefa comparado à data do evento; não
// existe coluna nova no banco. Nome do módulo é "feijoada", não "evento" —
// esse nome já é usado pelo histórico/timeline da tarefa (EventoTipo,
// TaskEvent, task_events).

import { diasAtePrazo, parseDate, todayISO } from "@/lib/format";

export const FEIJOADA_NOME = "Feijoada do Escalada";
export const FEIJOADA_DATA = "2026-11-29";

export type Fase =
  | "preparacao"
  | "duas_semanas"
  | "ultima_semana"
  | "vespera"
  | "dia_evento"
  | "pos_evento"
  | "sem_prazo";

export const FASE_ORDER: Fase[] = [
  "preparacao",
  "duas_semanas",
  "ultima_semana",
  "vespera",
  "dia_evento",
  "pos_evento",
  "sem_prazo",
];

export const FASE_LABELS: Record<Fase, string> = {
  preparacao: "Preparação",
  duas_semanas: "2 semanas antes",
  ultima_semana: "Última semana",
  vespera: "Véspera",
  dia_evento: "Dia do evento",
  pos_evento: "Depois do evento",
  sem_prazo: "Sem prazo",
};

function diasEntre(de: string, ate: string): number | null {
  const a = parseDate(de);
  const b = parseDate(ate);
  if (!a || !b) return null;
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Bucket de fase a partir do prazo da tarefa, relativo à data do evento. */
export function calcularFase(prazo: string | null): Fase {
  if (!prazo) return "sem_prazo";
  const dias = diasEntre(prazo, FEIJOADA_DATA);
  if (dias === null) return "sem_prazo";
  if (dias < 0) return "pos_evento";
  if (dias === 0) return "dia_evento";
  if (dias === 1) return "vespera";
  if (dias <= 7) return "ultima_semana";
  if (dias <= 14) return "duas_semanas";
  return "preparacao";
}

/** Dias entre hoje e a Feijoada. Negativo = já passou. */
export function diasParaFeijoada(): number {
  return diasAtePrazo(FEIJOADA_DATA) as number;
}

/** Fase em que a organização está HOJE (não a de uma tarefa específica). */
export function faseAtual(): Fase {
  return calcularFase(todayISO());
}

/** "Domingo, 29 de novembro" — cabeçalho da programação. */
export function dataExtensoFeijoada(): string {
  const data = parseDate(FEIJOADA_DATA)!;
  const texto = data.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
