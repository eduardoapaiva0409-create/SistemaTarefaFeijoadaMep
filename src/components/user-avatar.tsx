import { User } from "lucide-react";
import { iniciais } from "@/lib/format";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-6 text-[10px]",
  default: "size-9 text-xs",
  lg: "size-16 text-lg",
} as const;

const RING = "ring-1 ring-black/10 dark:ring-white/10";

/**
 * Avatar de pessoa. Com foto: `<img>` simples (não `next/image`, pra não
 * exigir configurar `remotePatterns` pro domínio do Supabase Storage — o
 * volume de fotos aqui é pequeno demais pra justificar isso). Sem foto:
 * iniciais sobre `bg-muted`, com o anel fino do design system (nunca borda).
 */
export function UserAvatar({
  nome,
  fotoUrl,
  size = "default",
  className,
}: {
  nome?: string | null;
  fotoUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  if (fotoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- URL do Storage, volume pequeno demais pra exigir remotePatterns do next/image
      <img
        src={fotoUrl}
        alt={nome ?? "Foto"}
        title={nome ?? undefined}
        className={cn(
          "shrink-0 rounded-full object-cover",
          RING,
          SIZES[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground",
        RING,
        SIZES[size],
        className
      )}
      title={nome ?? "Sem responsável"}
      aria-hidden
    >
      {nome ? (
        iniciais(nome)
      ) : (
        <User className={size === "sm" ? "size-3" : "size-4"} />
      )}
    </div>
  );
}
