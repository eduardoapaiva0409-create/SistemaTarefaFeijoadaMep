"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : signInError.message
      );
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh">
      {/* Painel da marca (desktop) */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-(--brand-navy) p-16">
        <Image
          src="/logo-autorio.jpg"
          alt="AutoRio — Funilaria e Pintura"
          width={1000}
          height={485}
          priority
          className="w-full max-w-md"
        />
      </div>

      {/* Formulário */}
      <div className="flex flex-1 items-center justify-center bg-background p-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="w-full max-w-sm">
          <div className="mb-10 rounded-2xl bg-(--brand-navy) px-8 py-6 lg:hidden">
            <Image
              src="/logo-autorio.jpg"
              alt="AutoRio — Funilaria e Pintura"
              width={1000}
              height={485}
              priority
              className="mx-auto w-full max-w-56"
            />
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">Bem-vindo</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entre para ver e acompanhar as tarefas da AutoRio.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="voce@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11 rounded-xl bg-card px-4"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11 rounded-xl bg-card px-4"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl text-[15px]"
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
