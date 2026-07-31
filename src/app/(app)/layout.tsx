import { AppSidebar, MobileHeader } from "@/components/app-sidebar";
import { getCurrentProfile } from "@/lib/auth";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getCurrentProfile();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <AppSidebar profile={profile} />
      <MobileHeader />
      {/* Áreas seguras: com viewport-fit=cover o conteúdo vai para baixo da
          barra inferior do iPhone (e do notch, no modo paisagem). */}
      <main
        className="flex-1 overflow-x-hidden p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:px-10 md:py-8"
      >
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
