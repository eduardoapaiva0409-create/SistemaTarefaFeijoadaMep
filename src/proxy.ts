import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims() valida a assinatura do JWT localmente (WebCrypto + JWKS em
  // cache), porque o projeto usa chaves assimétricas. getUser() faria um
  // round-trip ao servidor de Auth a cada navegação — 0,5s a 2s de latência
  // antes de qualquer render. Continua seguro: a assinatura é verificada
  // (ao contrário de getSession(), que só lê o cookie).
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const isLoginPage = request.nextUrl.pathname.startsWith("/login");

  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // manifest.webmanifest, sw.js e offline.html TÊM que ficar fora daqui.
    // O navegador busca o manifest sem credenciais; se o proxy o redirecionar
    // para /login, ele não é lido e o app deixa de ser instalável. O mesmo vale
    // para o service worker e para a tela de offline (que precisa abrir
    // justamente quando não há rede para validar a sessão).
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
