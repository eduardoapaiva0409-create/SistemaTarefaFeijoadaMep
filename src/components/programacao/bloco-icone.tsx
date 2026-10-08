import {
  Coffee,
  Gift,
  Music,
  PartyPopper,
  Sparkles,
  Soup,
  Wrench,
} from "lucide-react";
import type { BlocoTipo } from "@/lib/types";

/**
 * Ícone de cada formato. A cor fica em lib/programacao.ts (BLOCO_COR) junto
 * com o resto da régua do cronograma — aqui mora só o desenho.
 */
export const BLOCO_ICONE: Record<BlocoTipo, typeof Music> = {
  operacional: Wrench,
  abertura: Sparkles,
  refeicao: Soup,
  apresentacao: Music,
  dinamica: Gift,
  intervalo: Coffee,
  encerramento: PartyPopper,
};
