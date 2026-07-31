import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Trio semântico do design system — o único uso de cor em número. */
export const TONE = {
  positive: "text-emerald-600 dark:text-emerald-400",
  negative: "text-red-600 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
  default: "",
} as const;

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  size = "lg",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: keyof typeof TONE;
  size?: "lg" | "sm";
}) {
  return (
    <Card>
      <CardContent className="px-5 py-1">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <p
          className={cn(
            "mt-1.5 font-semibold tracking-tight tabular-nums",
            size === "lg" ? "text-[26px] leading-8" : "text-[22px]",
            TONE[tone]
          )}
        >
          {value}
        </p>
        {hint && (
          <p className="mt-1 text-xs text-muted-foreground/80">{hint}</p>
        )}
      </CardContent>
    </Card>
  );
}
