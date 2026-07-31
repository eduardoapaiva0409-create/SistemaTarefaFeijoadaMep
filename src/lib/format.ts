import type {
  Papel,
  Prioridade,
  Recorrencia,
  TaskStatus,
} from "@/lib/types";

/** Data "date" do Postgres (YYYY-MM-DD) é local — nunca passar pelo fuso. */
export function parseDate(value: string): Date | null {
  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = parseDate(value);
  return date ? date.toLocaleDateString("pt-BR") : "—";
}

/** "29/07" — para chips e cards, onde o ano é ruído. */
export function formatDateShort(value: string | null | undefined): string {
  if (!value) return "—";
  const date = parseDate(value);
  if (!date) return "—";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "há 5 min", "há 3 h", "ontem", "12/07" — para a linha do tempo. */
export function formatRelative(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const horas = Math.floor(min / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return "ontem";
  if (dias < 7) return `há ${dias} dias`;
  return new Date(value).toLocaleDateString("pt-BR");
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Dias entre hoje e o prazo. Negativo = atrasada. `null` = sem prazo. */
export function diasAtePrazo(prazo: string | null): number | null {
  if (!prazo) return null;
  const alvo = parseDate(prazo);
  if (!alvo) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  alvo.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
}

/** Rótulo humano do prazo: "Atrasada 3 dias", "Hoje", "Amanhã", "12/08". */
export function labelPrazo(prazo: string | null): string {
  const dias = diasAtePrazo(prazo);
  if (dias === null) return "Sem prazo";
  if (dias < -1) return `Atrasada ${Math.abs(dias)} dias`;
  if (dias === -1) return "Atrasada 1 dia";
  if (dias === 0) return "Hoje";
  if (dias === 1) return "Amanhã";
  if (dias <= 6) return `Em ${dias} dias`;
  return formatDate(prazo);
}

export const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const STATUS_LABELS: Record<TaskStatus, string> = {
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};

export const STATUS_ORDER: TaskStatus[] = [
  "a_fazer",
  "em_andamento",
  "concluida",
];

export const PRIORIDADE_LABELS: Record<Prioridade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

/** Peso para ordenar: urgente primeiro. */
export const PRIORIDADE_PESO: Record<Prioridade, number> = {
  urgente: 0,
  alta: 1,
  media: 2,
  baixa: 3,
};

export const RECORRENCIA_LABELS: Record<Recorrencia, string> = {
  diaria: "Todo dia",
  semanal: "Toda semana",
  quinzenal: "A cada 15 dias",
  mensal: "Todo mês",
};

export const PAPEL_LABELS: Record<Papel, string> = {
  admin: "Administrador",
  colaborador: "Colaborador",
};

/** Iniciais para o avatar sem foto: "João da Silva" → "JS". */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter((p) => p.length > 2);
  const base = partes.length ? partes : nome.trim().split(/\s+/);
  return base
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function primeiroNome(nome: string | null | undefined): string {
  if (!nome) return "";
  return nome.trim().split(/\s+/)[0];
}

/** Plural simples: 3 → "3 tarefas", 1 → "1 tarefa". */
export function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}
