"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { PAPEL_LABELS } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutDashboard, ListChecks, LogOut, Menu, Users } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/tarefas", label: "Tarefas", icon: ListChecks },
  { href: "/equipe", label: "Equipe", icon: Users },
];

function useLogout() {
  const router = useRouter();
  return async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppSidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const logout = useLogout();

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:h-dvh md:self-start">
      <div className="px-6 pt-8 pb-6">
        <Image
          src="/logo-autorio.jpg"
          alt="AutoRio — Funilaria e Pintura"
          width={1000}
          height={485}
          priority
          className="w-full"
        />
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-white/12 text-white"
                  : "text-white/60 hover:bg-white/8 hover:text-white"
              )}
            >
              <item.icon
                className={cn(
                  "size-4",
                  active ? "text-(--brand-gold)" : "text-white/50"
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1 p-3">
        {profile && (
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <UserAvatar
              nome={profile.nome}
              size="sm"
              className="bg-white/12 text-white ring-white/15"
            />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-white">
                {profile.nome}
              </p>
              <p className="truncate text-xs text-white/50">
                {profile.cargo ?? PAPEL_LABELS[profile.papel]}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-white/60 transition-colors hover:bg-white/8 hover:text-white"
        >
          <LogOut className="size-4 text-white/50" />
          Sair
        </button>
      </div>
    </aside>
  );
}

export function MobileHeader() {
  const logout = useLogout();

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between bg-sidebar px-4 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] text-sidebar-foreground md:hidden"
    >
      <Image
        src="/logo-autorio.jpg"
        alt="AutoRio — Funilaria e Pintura"
        width={1000}
        height={485}
        priority
        className="h-10 w-auto"
      />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label="Menu"
              className="text-white hover:bg-white/10 hover:text-white"
            >
              <Menu className="size-5" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-52">
          {NAV_ITEMS.map((item) => (
            <DropdownMenuItem
              key={item.href}
              render={
                <Link href={item.href}>
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              }
            />
          ))}
          <DropdownMenuItem onClick={logout} variant="destructive">
            <LogOut className="size-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
