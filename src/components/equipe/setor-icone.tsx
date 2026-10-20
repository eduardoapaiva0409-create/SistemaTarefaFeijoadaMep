import {
  Bike,
  ClipboardList,
  Compass,
  CupSoda,
  Hammer,
  HeartHandshake,
  Megaphone,
  Music,
  Palette,
  Wallet,
} from "lucide-react";
import type { Setor } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Ícone de cada setor. Setor novo entra aqui também (o Record não deixa esquecer). */
export const SETOR_ICONE: Record<Setor, typeof Music> = {
  coordenacao: Compass,
  secretaria: ClipboardList,
  tesouraria: Wallet,
  marketing: Megaphone,
  infraestrutura: Hammer,
  decoracao: Palette,
  tios: HeartHandshake,
  entretenimento: Music,
  bebidas: CupSoda,
  delivery: Bike,
};

/** Selo do setor: o ícone no dourado da marca, como a pasta dos Materiais. */
export function SetorSelo({
  setor,
  className,
}: {
  setor: Setor;
  className?: string;
}) {
  const Icone = SETOR_ICONE[setor];
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg bg-(--brand-gold)/12 text-(--brand-gold)",
        className
      )}
    >
      <Icone className="size-[18px]" />
    </div>
  );
}
