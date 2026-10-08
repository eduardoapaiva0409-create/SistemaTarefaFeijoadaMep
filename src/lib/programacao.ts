import { FEIJOADA_NOME, dataExtensoFeijoada } from "@/lib/feijoada";
import type { BlocoTipo, BlocoWithRelations } from "@/lib/types";

/**
 * Embed padrão dos blocos. `bloco_events (id)` vira a contagem de comentários
 * do card — a query filtra `bloco_events.tipo = comentario`, senão o histórico
 * automático inflaria o número. Sem `!inner`, o filtro recorta só o embed e
 * não some com bloco que não tem comentário.
 */
export const BLOCO_SELECT = `
  *,
  responsavel:profiles!responsavel_id (id, nome, funcao, foto_url),
  bloco_events (id)
`;

/** Onde a cascata começa quando o primeiro bloco não marca hora fixa. */
export const INICIO_PADRAO = 11 * 60;

// ── Minutos desde a meia-noite ─────────────────────────────────────────────
// O cronograma inteiro é feito em minutos: somar 15 a um número é trivial,
// somar 15 a "09:45" não é.

/** "07:30" ou "07:30:00" → 450. */
export function minutosDeTime(valor: string | null | undefined): number | null {
  if (!valor) return null;
  const [h, m] = valor.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

/** 450 → "07:30". Passa da meia-noite dando a volta, como um relógio. */
export function horaDeMinutos(total: number): string {
  const normalizado = ((Math.round(total) % 1440) + 1440) % 1440;
  const h = Math.floor(normalizado / 60);
  const m = normalizado % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 95 → "1h35", 60 → "1h", 45 → "45 min". */
export function formatDuracao(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** A duração cabe entre 5 min e 12 h — o mesmo check da coluna no banco. */
export function limitarDuracao(valor: number): number {
  if (!Number.isFinite(valor) || valor <= 0) return 30;
  return Math.min(720, Math.max(5, Math.round(valor)));
}

// ── Cascata ────────────────────────────────────────────────────────────────

export type BlocoAgendado = {
  bloco: BlocoWithRelations;
  /** Minutos desde a meia-noite. */
  inicio: number;
  fim: number;
  /**
   * Só em bloco com hora marcada: minutos entre o fim do anterior e a âncora.
   * Positivo = buraco no dia. Negativo = a fila estourou por cima da âncora.
   */
  folga: number | null;
};

/**
 * Transforma a fila de blocos em horários. Cada bloco começa quando o
 * anterior termina; um bloco com `inicio_fixo` reancora a cascata na hora
 * marcada — e é aí que aparecem os buracos e os conflitos do dia.
 */
export function montarAgenda(blocos: BlocoWithRelations[]): BlocoAgendado[] {
  const fila = [...blocos].sort((a, b) => a.ordem - b.ordem);
  let cursor = minutosDeTime(fila[0]?.inicio_fixo) ?? INICIO_PADRAO;

  return fila.map((bloco) => {
    const ancora = minutosDeTime(bloco.inicio_fixo);
    const folga = ancora === null ? null : ancora - cursor;
    const inicio = ancora ?? cursor;
    const fim = inicio + bloco.duracao_min;
    cursor = fim;
    return { bloco, inicio, fim, folga };
  });
}

export type ResumoAgenda = {
  inicio: number | null;
  fim: number | null;
  ancorados: number;
  semResponsavel: number;
  conflitos: number;
};

export function resumirAgenda(agenda: BlocoAgendado[]): ResumoAgenda {
  return {
    inicio: agenda[0]?.inicio ?? null,
    fim: agenda[agenda.length - 1]?.fim ?? null,
    ancorados: agenda.filter((a) => a.bloco.inicio_fixo).length,
    semResponsavel: agenda.filter((a) => !a.bloco.responsavel_id).length,
    conflitos: agenda.filter((a) => a.folga !== null && a.folga < 0).length,
  };
}

/**
 * Nova posição ao soltar entre dois blocos. Aqui a ordem cresce para baixo
 * (o dia lê de cima para baixo), ao contrário do kanban — por isso a conta é
 * espelhada em relação a `calcularOrdem` de lib/tasks.
 */
export function ordemNaFila(
  anterior: number | undefined,
  posterior: number | undefined
): number {
  if (anterior === undefined && posterior === undefined) return Date.now() / 1000;
  if (anterior === undefined) return posterior! - 1000;
  if (posterior === undefined) return anterior + 1000;
  return (anterior + posterior) / 2;
}

// ── Formatos ───────────────────────────────────────────────────────────────

export const BLOCO_TIPO_ORDER: BlocoTipo[] = [
  "operacional",
  "abertura",
  "refeicao",
  "apresentacao",
  "dinamica",
  "intervalo",
  "encerramento",
];

export const BLOCO_TIPO_LABELS: Record<BlocoTipo, string> = {
  operacional: "Operacional",
  abertura: "Abertura",
  refeicao: "Refeição",
  apresentacao: "Apresentação",
  dinamica: "Dinâmica",
  intervalo: "Intervalo",
  encerramento: "Encerramento",
};

export const BLOCO_TIPO_HINT: Record<BlocoTipo, string> = {
  operacional: "Montagem, recepção, desmontagem.",
  abertura: "Boas-vindas e recados.",
  refeicao: "Feijoada servida, sobremesa.",
  apresentacao: "Banda, roda de samba, show.",
  dinamica: "Sorteio, brincadeira, leilão.",
  intervalo: "Pausa entre uma coisa e outra.",
  encerramento: "Agradecimentos e saída.",
};

/**
 * Faixa lateral do card e ponto do trilho — o formato do dia lido sem ler.
 * Só cores do design system: navy e dourado da marca, o azul de dado e cinzas.
 * O trio emerald/red/amber fica de fora: ele é o semáforo de estado.
 */
export const BLOCO_COR: Record<BlocoTipo, string> = {
  operacional: "bg-muted-foreground/40",
  abertura: "bg-primary",
  refeicao: "bg-(--brand-gold)",
  apresentacao: "bg-primary",
  dinamica: "bg-(--chart-concluida)",
  intervalo: "bg-border",
  encerramento: "bg-primary",
};

/** Pausa e bastidor: o card fica mais discreto que o que acontece no palco. */
export function ehRespiro(tipo: BlocoTipo): boolean {
  return tipo === "intervalo" || tipo === "operacional";
}

/**
 * A programação em texto puro, para colar no grupo do WhatsApp — o formato
 * em que ela circula de verdade.
 */
export function programacaoEmTexto(agenda: BlocoAgendado[]): string {
  const linhas = agenda.map(({ bloco, inicio }) => {
    const quem = bloco.conduzido_por ? ` — ${bloco.conduzido_por}` : "";
    return `${horaDeMinutos(inicio)} → ${bloco.titulo}${quem}`;
  });
  return `*PROGRAMAÇÃO — ${FEIJOADA_NOME.toUpperCase()}*\n${dataExtensoFeijoada()}\n\n${linhas.join("\n")}`;
}
