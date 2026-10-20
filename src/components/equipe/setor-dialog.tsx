"use client";

import { useRef, useState } from "react";
import {
  ArrowRightLeft,
  ArrowUpDown,
  MoreVertical,
  Pencil,
  Plus,
  UserMinus,
} from "lucide-react";
import { FUNCAO_LABELS, SETOR_LABELS, SETOR_ORDER, plural } from "@/lib/format";
import type { EquipeMembro, MembroFuncao, Setor } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SETOR_ICONE, SetorSelo } from "@/components/equipe/setor-icone";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type CamposMembro = Partial<Pick<EquipeMembro, "nome" | "setor" | "funcao">>;

const FUNCOES: MembroFuncao[] = ["coordenacao", "apoio"];

const VAGA_ROTULO: Record<MembroFuncao, string> = {
  coordenacao: "Adicionar coordenação",
  apoio: "Adicionar apoio",
};

const OUTRA_FUNCAO: Record<MembroFuncao, MembroFuncao> = {
  coordenacao: "apoio",
  apoio: "coordenacao",
};

/**
 * Um setor aberto: coordenação e apoio como uma grade de vagas. A vaga
 * tracejada no fim de cada grupo é onde se escreve o próximo nome — o Enter
 * grava e já deixa a vaga seguinte aberta, para preencher o setor de uma vez.
 */
export function SetorDialog({
  setor,
  grupos,
  podeTirar,
  onOpenChange,
  onAdicionar,
  onAtualizar,
  onTirar,
}: {
  setor: Setor;
  grupos: Record<MembroFuncao, EquipeMembro[]>;
  podeTirar: (membro: EquipeMembro) => boolean;
  onOpenChange: (open: boolean) => void;
  onAdicionar: (funcao: MembroFuncao, nome: string) => void;
  onAtualizar: (membro: EquipeMembro, campos: CamposMembro) => void;
  onTirar: (membro: EquipeMembro) => void;
}) {
  const total = grupos.coordenacao.length + grupos.apoio.length;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 pr-8">
            <SetorSelo setor={setor} className="size-10" />
            <div className="grid min-w-0 gap-1.5">
              <DialogTitle className="text-[17px] font-semibold tracking-tight">
                {SETOR_LABELS[setor]}
              </DialogTitle>
              <DialogDescription className="tabular-nums">
                {total === 0
                  ? "Ninguém ainda — preencha as vagas abaixo."
                  : `${grupos.coordenacao.length} na coordenação · ${grupos.apoio.length} de apoio`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {FUNCOES.map((funcao) => (
          <section key={funcao}>
            <h3 className="mb-2 flex items-baseline gap-2 text-sm font-semibold tracking-tight text-muted-foreground">
              {FUNCAO_LABELS[funcao]}
              {grupos[funcao].length > 0 && (
                <span className="text-xs font-normal tabular-nums text-muted-foreground/80">
                  {plural(grupos[funcao].length, "pessoa", "pessoas")}
                </span>
              )}
            </h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {grupos[funcao].map((membro) => (
                <li key={membro.id}>
                  <MembroCelula
                    membro={membro}
                    podeTirar={podeTirar(membro)}
                    onAtualizar={(campos) => onAtualizar(membro, campos)}
                    onTirar={() => onTirar(membro)}
                  />
                </li>
              ))}
              <li>
                <Vaga
                  rotulo={VAGA_ROTULO[funcao]}
                  onAdicionar={(nome) => onAdicionar(funcao, nome)}
                />
              </li>
            </ul>
          </section>
        ))}
      </DialogContent>
    </Dialog>
  );
}

const CELULA = "flex min-h-12 items-center gap-2.5 rounded-lg py-1.5 pl-1.5";

function MembroCelula({
  membro,
  podeTirar,
  onAtualizar,
  onTirar,
}: {
  membro: EquipeMembro;
  podeTirar: boolean;
  onAtualizar: (campos: CamposMembro) => void;
  onTirar: () => void;
}) {
  const [renomeando, setRenomeando] = useState(false);
  const outra = OUTRA_FUNCAO[membro.funcao];

  if (renomeando) {
    return (
      <div className={cn(CELULA, "pr-3 ring-3 ring-ring/50 border border-ring")}>
        <UserAvatar nome={membro.nome} />
        <CampoNome
          inicial={membro.nome}
          rotulo={`Novo nome de ${membro.nome}`}
          onSalvar={(nome) => onAtualizar({ nome })}
          onFechar={() => setRenomeando(false)}
        />
      </div>
    );
  }

  return (
    <div className={cn(CELULA, "border border-transparent bg-muted/60 pr-1 dark:bg-muted/40")}>
      <UserAvatar nome={membro.nome} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{membro.nome}</span>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Ações de ${membro.nome}`}
              className="shrink-0 text-muted-foreground"
            />
          }
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => setRenomeando(true)}>
            <Pencil className="size-4" />
            Renomear
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAtualizar({ funcao: outra })}>
            <ArrowUpDown className="size-4" />
            Passar para {FUNCAO_LABELS[outra]}
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ArrowRightLeft className="size-4" />
              Mover para outro setor
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-60">
              {SETOR_ORDER.filter((s) => s !== membro.setor).map((destino) => {
                const Icone = SETOR_ICONE[destino];
                return (
                  <DropdownMenuItem
                    key={destino}
                    onClick={() => onAtualizar({ setor: destino })}
                  >
                    <Icone className="size-4" />
                    <span className="truncate">{SETOR_LABELS[destino]}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {podeTirar && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={onTirar}>
                <UserMinus className="size-4" />
                Tirar da equipe
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/** A vaga tracejada: um toque vira campo de nome. */
function Vaga({
  rotulo,
  onAdicionar,
}: {
  rotulo: string;
  onAdicionar: (nome: string) => void;
}) {
  const [preenchendo, setPreenchendo] = useState(false);

  if (preenchendo) {
    return (
      <div className={cn(CELULA, "pr-3 ring-3 ring-ring/50 border border-ring")}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-ring text-muted-foreground">
          <Plus className="size-4" />
        </span>
        <CampoNome
          continuar
          rotulo={rotulo}
          onSalvar={onAdicionar}
          onFechar={() => setPreenchendo(false)}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPreenchendo(true)}
      className={cn(
        CELULA,
        "w-full border border-dashed border-border pr-3 text-left text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-current/40">
        <Plus className="size-4" />
      </span>
      <span className="text-sm">{rotulo}</span>
    </button>
  );
}

/**
 * Campo de nome que grava no Enter e ao sair dele; Esc descarta. Com
 * `continuar`, o Enter limpa o campo e espera o próximo nome — e um Enter
 * com o campo vazio encerra.
 */
function CampoNome({
  inicial = "",
  rotulo,
  continuar = false,
  onSalvar,
  onFechar,
}: {
  inicial?: string;
  rotulo: string;
  continuar?: boolean;
  onSalvar: (nome: string) => void;
  onFechar: () => void;
}) {
  const [nome, setNome] = useState(inicial);
  // Fechar desmonta o campo, e o navegador pode disparar o blur nessa hora:
  // sem a trava, o blur gravaria de novo o que o Esc mandou descartar.
  const encerrado = useRef(false);

  function encerrar() {
    encerrado.current = true;
    onFechar();
  }

  function salvar() {
    const limpo = nome.trim();
    if (limpo && limpo !== inicial) onSalvar(limpo);
  }

  return (
    <input
      autoFocus
      value={nome}
      onChange={(e) => setNome(e.target.value)}
      maxLength={80}
      placeholder="Nome"
      aria-label={rotulo}
      enterKeyHint={continuar ? "next" : "done"}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (continuar && nome.trim()) {
            salvar();
            setNome("");
            return;
          }
          salvar();
          encerrar();
        } else if (e.key === "Escape") {
          // Só fecha o campo, não o setor inteiro.
          e.preventDefault();
          e.stopPropagation();
          encerrar();
        }
      }}
      onBlur={() => {
        if (encerrado.current) return;
        salvar();
        encerrar();
      }}
      className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-sm"
    />
  );
}
