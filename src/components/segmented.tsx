"use client";

import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
};

/** Filtro de 2–4 opções. Mesmo visual do TabsList; preferir a um Select. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex h-8 items-center rounded-lg bg-muted p-[3px]",
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            // Com ícone, o rótulo some no celular (o ícone já identifica) —
            // senão três opções mais um botão estouram a largura do telefone.
            aria-label={option.icon ? option.label : undefined}
            className={cn(
              "inline-flex h-full items-center gap-1.5 rounded-md px-2.5 text-sm font-medium whitespace-nowrap transition-all",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-foreground/60 hover:text-foreground"
            )}
          >
            {option.icon && <option.icon className="size-4" />}
            <span className={option.icon ? "hidden sm:inline" : undefined}>
              {option.label}
            </span>
            {option.count !== undefined && (
              <span className="text-xs tabular-nums text-muted-foreground">
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
