import {
  FASE_LABELS,
  FEIJOADA_DATA,
  FEIJOADA_NOME,
  diasParaFeijoada,
  faseAtual,
} from "@/lib/feijoada";
import { formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";

export function EventCountdown() {
  const dias = diasParaFeijoada();
  const fase = faseAtual();

  const destaque =
    dias > 1
      ? `${dias} dias`
      : dias === 1
        ? "Amanhã"
        : dias === 0
          ? "É hoje!"
          : `Há ${Math.abs(dias)} dias`;

  const legenda =
    dias > 0
      ? `para a ${FEIJOADA_NOME}`
      : dias === 0
        ? FEIJOADA_NOME
        : `desde a ${FEIJOADA_NOME}`;

  return (
    <Card className="bg-(--brand-navy) text-white">
      <CardContent className="flex flex-wrap items-end justify-between gap-4 py-2">
        <div>
          <p className="text-[13px] font-medium text-white/60">
            {FASE_LABELS[fase]}
          </p>
          <p className="mt-1 text-[26px] leading-8 font-semibold tracking-tight tabular-nums">
            {destaque}
          </p>
          <p className="text-sm text-white/70">{legenda}</p>
        </div>
        <p className="text-sm font-medium tabular-nums text-white/80">
          {formatDate(FEIJOADA_DATA)}
        </p>
      </CardContent>
    </Card>
  );
}
