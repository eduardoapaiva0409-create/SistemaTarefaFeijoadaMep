"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { criarPessoa, redefinirSenha } from "@/app/(app)/equipe/actions";
import { createClient } from "@/lib/supabase/client";
import { PAPEL_LABELS } from "@/lib/format";
import type { Papel, Profile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAPEL_ITEMS = (["colaborador", "admin"] as Papel[]).map((v) => ({
  value: v,
  label: PAPEL_LABELS[v],
}));

const ATIVO_ITEMS = [
  { value: "sim", label: "Ativo" },
  { value: "nao", label: "Inativo" },
];

export function PessoaDialog({
  open,
  onOpenChange,
  pessoa,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pessoa: Profile | null;
}) {
  const router = useRouter();
  const editando = pessoa !== null;

  const [nome, setNome] = useState(pessoa?.nome ?? "");
  const [email, setEmail] = useState(pessoa?.email ?? "");
  const [senha, setSenha] = useState("");
  const [cargo, setCargo] = useState(pessoa?.cargo ?? "");
  const [papel, setPapel] = useState<Papel>(pessoa?.papel ?? "colaborador");
  const [ativo, setAtivo] = useState(pessoa?.ativo === false ? "nao" : "sim");
  const [salvando, setSalvando] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSalvando(true);

    if (!editando) {
      const resultado = await criarPessoa({
        nome,
        email,
        senha,
        cargo,
        papel,
      });
      if (!resultado.ok) {
        toast.error("Não foi possível criar o acesso", {
          description: resultado.erro,
        });
        setSalvando(false);
        return;
      }
      toast.success("Acesso criado", {
        description: `${nome} já pode entrar com esse e-mail e senha.`,
      });
    } else {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({
          nome: nome.trim(),
          cargo: cargo.trim() || null,
          papel,
          ativo: ativo === "sim",
        })
        .eq("id", pessoa.id);

      if (error) {
        toast.error("Erro ao salvar", { description: error.message });
        setSalvando(false);
        return;
      }

      if (senha) {
        const resultado = await redefinirSenha(pessoa.id, senha);
        if (!resultado.ok) {
          toast.error("Dados salvos, mas a senha não mudou", {
            description: resultado.erro,
          });
          setSalvando(false);
          onOpenChange(false);
          router.refresh();
          return;
        }
      }
      toast.success("Pessoa atualizada");
    }

    setSalvando(false);
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar pessoa" : "Nova pessoa"}</DialogTitle>
          <DialogDescription>
            {editando
              ? "Cargo, permissão e situação do acesso."
              : "Cria o acesso e já libera o login com e-mail e senha."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: João da Silva"
              required
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">E-mail *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ex.: joao@autorio.com.br"
              required
              disabled={editando}
            />
            {editando && (
              <p className="text-xs text-muted-foreground">
                O e-mail de login não muda por aqui.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="senha">
              {editando ? "Nova senha" : "Senha provisória *"}
            </Label>
            <Input
              id="senha"
              type="text"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Ex.: autorio2026"
              minLength={6}
              required={!editando}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              {editando
                ? "Deixe em branco para manter a senha atual."
                : "Mínimo de 6 caracteres. Passe para a pessoa trocar depois."}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cargo">Cargo</Label>
            <Input
              id="cargo"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              placeholder="Ex.: Funileiro"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Permissão</Label>
              <Select
                items={PAPEL_ITEMS}
                value={papel}
                onValueChange={(v) => setPapel(v as Papel)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAPEL_ITEMS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Administrador edita qualquer tarefa e gerencia a equipe.
              </p>
            </div>

            {editando && (
              <div className="grid gap-2">
                <Label>Situação</Label>
                <Select
                  items={ATIVO_ITEMS}
                  value={ativo}
                  onValueChange={(v) => setAtivo(v as string)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ATIVO_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Inativo some da lista de responsáveis.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
