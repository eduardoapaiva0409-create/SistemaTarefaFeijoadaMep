import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Fallback das rotas (`loading.tsx`). Espelha o esqueleto real de cada página
 * para a navegação parecer instantânea: o Next mostra isso na hora do clique,
 * enquanto o Server Component busca os dados.
 */
export function PageSkeleton({
  cards = 4,
  rows = 6,
  chart = false,
  hero = false,
}: {
  cards?: number;
  rows?: number;
  chart?: boolean;
  hero?: boolean;
}) {
  return (
    <div>
      <PageHeaderSkeleton />

      {hero && (
        <Card className="mb-4">
          <CardContent className="space-y-2 py-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-40" />
          </CardContent>
        </Card>
      )}

      {cards > 0 && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: cards }).map((_, i) => (
            <Card key={i}>
              <CardContent className="px-5 py-1">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-2 h-7 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {chart && (
        <Card className="mb-4">
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-3 p-5">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/** Espelho do kanban: três colunas com cards de altura variada. */
export function BoardSkeleton() {
  const colunas = [
    [96, 120, 88],
    [110, 92],
    [88, 104, 96],
  ];

  return (
    <div>
      <PageHeaderSkeleton />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Skeleton className="h-8 w-full max-w-sm" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-36" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {colunas.map((coluna, i) => (
          <div key={i}>
            <Skeleton className="mb-3 h-4 w-28" />
            <div className="grid gap-3">
              {coluna.map((altura, j) => (
                <Skeleton
                  key={j}
                  className="w-full rounded-xl"
                  style={{ height: altura }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Espelho da programação: métricas e a fila de blocos com o trilho de horas. */
export function TimelineSkeleton() {
  const alturas = [64, 84, 64, 96, 72, 64];

  return (
    <div>
      <PageHeaderSkeleton />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="px-5 py-1">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-2 h-7 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-2.5">
        {alturas.map((altura, i) => (
          <div key={i} className="flex gap-3 sm:gap-4">
            <div className="w-12 shrink-0 space-y-1.5 pt-3 sm:w-14">
              <Skeleton className="ml-auto h-3.5 w-10" />
              <Skeleton className="ml-auto h-3 w-8" />
            </div>
            <Skeleton
              className="flex-1 rounded-xl"
              style={{ height: altura }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Espelho dos materiais: busca, pastas e a grade de miniaturas. */
export function GridSkeleton() {
  return (
    <div>
      <PageHeaderSkeleton />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Skeleton className="h-8 w-full max-w-sm" />
        <Skeleton className="h-8 w-64" />
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[62px] rounded-xl" />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/3.6] rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function PageHeaderSkeleton() {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-9 w-32 rounded-lg" />
    </div>
  );
}
