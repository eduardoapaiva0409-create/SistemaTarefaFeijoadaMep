import { User } from "lucide-react";
import { iniciais } from "@/lib/format";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "size-6 text-[10px]",
  default: "size-9 text-xs",
} as const;

/**
 * Avatar de pessoa. Sem foto no sistema: iniciais sobre `bg-muted`, com o anel
 * fino do design system (nunca borda).
 */
export function UserAvatar({
  nome,
  size = "default",
  className,
}: {
  nome?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-muted font-medium text-muted-foreground ring-1 ring-black/10 dark:ring-white/10",
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
