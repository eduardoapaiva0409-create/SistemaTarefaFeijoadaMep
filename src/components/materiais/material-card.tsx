"use client";

import {
  Download,
  Folder,
  FolderInput,
  Link2,
  MoreVertical,
  Pencil,
  Play,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MaterialThumb } from "@/components/materiais/material-thumb";
import { formatRelative, primeiroNome } from "@/lib/format";
import { formatBytes, tipoDoArquivo } from "@/lib/materiais";
import type { MaterialPasta, MaterialWithRelations } from "@/lib/types";

export function MaterialCard({
  material,
  pastas,
  nomeDaPasta,
  podeExcluir,
  onAbrir,
  onCopiarLink,
  onMover,
  onExcluir,
}: {
  material: MaterialWithRelations;
  /** Destinos do "Mover para". */
  pastas: MaterialPasta[];
  /** Só na busca, que mistura arquivos de todas as pastas. */
  nomeDaPasta?: string | null;
  podeExcluir: boolean;
  onAbrir: () => void;
  onCopiarLink: () => void;
  onMover: (pastaId: string | null) => void;
  onExcluir: () => void;
}) {
  const video = tipoDoArquivo(material.mime, material.nome) === "video";
  const destinos = [
    ...(material.pasta_id ? [{ id: null, nome: "Fora das pastas" }] : []),
    ...pastas.filter((p) => p.id !== material.pasta_id),
  ];

  return (
    <Card className="group gap-0 py-0">
      <button
        type="button"
        onClick={onAbrir}
        aria-label={`Abrir ${material.nome}`}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-muted"
      >
        <MaterialThumb
          material={material}
          className="transition-transform duration-300 group-hover:scale-[1.02]"
        />
        {video && (
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-9 place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm">
              <Play className="size-4 translate-x-px fill-current" />
            </span>
          </span>
        )}
      </button>

      <div className="flex items-start gap-1 p-3 pr-1.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium" title={material.nome}>
            {material.nome}
          </p>
          <p className="mt-0.5 truncate text-xs tabular-nums text-muted-foreground">
            {formatBytes(material.tamanho)}
            {material.autor && ` · ${primeiroNome(material.autor.nome)}`}
            {` · ${formatRelative(material.created_at)}`}
          </p>
          {nomeDaPasta !== undefined && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground/80">
              <Folder className="size-3 shrink-0" />
              {nomeDaPasta ?? "Fora das pastas"}
            </p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Ações de ${material.nome}`}
                className="-mt-1 shrink-0 text-muted-foreground"
              />
            }
          >
            <MoreVertical className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={onAbrir}>
              <Pencil className="size-4" />
              Abrir e editar
            </DropdownMenuItem>
            <DropdownMenuItem
              render={
                <a href={material.urlDownload}>
                  <Download className="size-4" />
                  Baixar
                </a>
              }
            />
            <DropdownMenuItem onClick={onCopiarLink}>
              <Link2 className="size-4" />
              Copiar link
            </DropdownMenuItem>

            {destinos.length > 0 && (
              <>
                <DropdownMenuSeparator />
                {/* O Group é obrigatório: DropdownMenuLabel é o GroupLabel do
                    Base UI e lê o contexto do grupo — solto, ele lança. */}
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Mover para</DropdownMenuLabel>
                  {destinos.map((destino) => (
                    <DropdownMenuItem
                      key={destino.id ?? "raiz"}
                      onClick={() => onMover(destino.id)}
                    >
                      <FolderInput className="size-4" />
                      <span className="truncate">{destino.nome}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </>
            )}

            {podeExcluir && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={onExcluir}>
                  <Trash2 className="size-4" />
                  Excluir
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
