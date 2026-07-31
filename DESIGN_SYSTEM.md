# Design System — padrão AutoRio

Extraído do Sistema Financeiro AutoRio. Copie este arquivo para a raiz do novo
projeto (junto do `AGENTS.md`/`CLAUDE.md`) e o design sai idêntico.

O estilo é **Apple-like**: fundo cinza levíssimo, cards brancos flutuando com
anel fino em vez de borda, muito respiro, tipografia densa e `tracking-tight`,
cor usada com parcimônia (só a marca, os dois tons de gráfico e os três
semáforos de valor).

---

## Parte 1 — Prompt curto (cole no agente)

> Monte a UI seguindo o design system em `DESIGN_SYSTEM.md`, ao pé da letra:
> Next.js (App Router, `src/`) + TypeScript + Tailwind v4 + shadcn/ui no estilo
> `base-nova` sobre **Base UI** (não Radix) + lucide + Recharts + sonner.
> Fonte Geist. Cole o bloco de tokens da Parte 3 no `globals.css` sem alterar
> nada além das duas cores de marca. Todo card é `Card`/`CardContent` do
> `src/components/ui/card.tsx` — nunca `<div>` com borda. Toda página começa com
> `PageHeader` e tem seu `loading.tsx` com `PageSkeleton`. Valores numéricos
> sempre `tabular-nums`. Não invente cores fora dos tokens.

---

## Parte 2 — Stack e setup

```bash
npx create-next-app@latest meu-app --ts --tailwind --app --src-dir
cd meu-app
npx shadcn@latest init          # style: base-nova | baseColor: neutral | cssVariables: true
npx shadcn@latest add button card input label select dialog alert-dialog \
  dropdown-menu table tabs badge separator skeleton sonner textarea
npm i lucide-react recharts sonner next-themes
```

`components.json` deve ficar assim (é o que dá o "sabor" dos componentes):

```json
{
  "style": "base-nova",
  "rsc": true,
  "tsx": true,
  "tailwind": { "css": "src/app/globals.css", "baseColor": "neutral", "cssVariables": true },
  "iconLibrary": "lucide",
  "menuColor": "default",
  "menuAccent": "subtle"
}
```

> **Atalho mais fiel:** copie a pasta `src/components/ui/` inteira deste projeto.
> Os primitivos já estão no estilo certo e já vêm com os ajustes que fizemos
> (scroll do dialog, skeleton em `bg-black/6`, etc.).

### `src/app/layout.tsx`

```tsx
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
```

---

## Parte 3 — Tokens (`globals.css`)

Cole inteiro. **Só troque `--brand-*`, `--primary`, `--sidebar*` e `--ring`**
pelas cores da nova marca — o resto é a base neutra que faz o visual.

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  /* ATENÇÃO: tem que apontar para a var da fonte, não para si mesmo.
     O shadcn init gera auto-referência circular e tudo cai para serifa. */
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-geist-sans);

  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  /* Escala de raio derivada de um único --radius */
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

:root {
  /* ↓↓↓ ÚNICA PARTE QUE MUDA POR PROJETO ↓↓↓ */
  --brand-navy: #1d3e5d;   /* cor principal da marca */
  --brand-gold: #c9a24b;   /* cor de destaque/acento */
  --primary: #1d3e5d;
  --secondary-foreground: #1d3e5d;
  --accent-foreground: #1d3e5d;
  --ring: #8aa5bd;         /* versão clara/dessaturada da primária */
  --sidebar: #1d3e5d;
  --sidebar-primary: #c9a24b;
  --sidebar-primary-foreground: #1d3e5d;
  --sidebar-ring: #8aa5bd;
  /* ↑↑↑ ------------------------------- ↑↑↑ */

  --background: #f5f5f7;   /* cinza Apple, nunca branco puro */
  --foreground: #1d1d1f;   /* quase-preto, nunca #000 */
  --muted-foreground: #6e6e73;
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --muted: oklch(0.97 0 0);
  --accent: oklch(0.97 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);

  --radius: 0.75rem;

  --sidebar-foreground: #ffffff;
  --sidebar-accent: rgba(255, 255, 255, 0.1);
  --sidebar-accent-foreground: #ffffff;
  --sidebar-border: rgba(255, 255, 255, 0.1);

  /* Par de cores de dado — validado para daltonismo. NÃO usar verde/vermelho. */
  --chart-receita: #2a78d6;
  --chart-despesa: #e34948;
  /* Escala neutra para séries sem semântica */
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
}

.dark {
  --brand-navy: #1d3e5d;
  --brand-gold: #d4b05e;
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: #35618c;              /* primária clareada p/ contraste no escuro */
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-receita: #3987e5;
  --chart-despesa: #e66767;
  --sidebar: #1d3e5d;
  --sidebar-foreground: #ffffff;
  --sidebar-primary: #d4b05e;
  --sidebar-primary-foreground: #1d3e5d;
  --sidebar-accent: rgba(255, 255, 255, 0.1);
  --sidebar-accent-foreground: #ffffff;
  --sidebar-border: rgba(255, 255, 255, 0.1);
  --sidebar-ring: #8aa5bd;
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground; }
  html { @apply font-sans; }
}
```

### Como escolher as cores da nova marca

1. `--brand-navy` = cor sólida da logo. Se a logo for JPEG com fundo colorido,
   pegue **o hex exato do fundo** — assim a imagem funde sem emenda quando
   colocada sobre `bg-sidebar`.
2. `--brand-gold` = acento, usado só em ícone ativo da sidebar e detalhes.
3. `--ring` = a primária clareada/dessaturada (~40% de luminosidade a mais).
4. `--primary` no dark = primária ~15% mais clara, senão some no fundo escuro.

---

## Parte 4 — Leis do layout

### Shell da aplicação

```tsx
// src/app/(app)/layout.tsx
<div className="flex min-h-screen flex-col md:flex-row">
  <AppSidebar />                        {/* hidden md:flex */}
  <MobileHeader />                      {/* md:hidden */}
  <main className="flex-1 overflow-x-hidden p-4 md:px-10 md:py-8">
    <div className="mx-auto max-w-6xl">{children}</div>
  </main>
</div>
```

- Conteúdo **sempre** limitado a `max-w-6xl` e centralizado.
- Respiro da página: `p-4` no mobile, `px-10 py-8` no desktop.

### Sidebar

```tsx
<aside className="hidden md:flex w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground
                  md:sticky md:top-0 md:h-screen md:self-start">
  <div className="px-6 pt-8 pb-6">{/* logo, w-full */}</div>
  <nav className="flex-1 space-y-1 px-3">
    <Link className={cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
      active ? "bg-white/12 text-white" : "text-white/60 hover:bg-white/8 hover:text-white"
    )}>
      <Icon className={cn("size-4", active ? "text-(--brand-gold)" : "text-white/50")} />
      {label}
    </Link>
  </nav>
  <div className="p-3">{/* Sair */}</div>
</aside>
```

Números que não mudam: largura `w-60`, item `text-[13px]`, ícone `size-4`,
inativo a 60% de opacidade, ativo em `bg-white/12`, **ícone ativo na cor de
acento** (é o único uso do dourado na navegação).

No mobile vira header com a logo à esquerda e um `DropdownMenu` (ícone `Menu`)
à direita com os mesmos itens + Sair.

### Cabeçalho de página

```tsx
export function PageHeader({ title, description, children }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
```

Ações da página (botões, filtros) vão como `children` — sempre à direita,
alinhados pela base do título.

### Ritmo vertical

| Contexto | Classe |
|---|---|
| Entre seções da página | `space-y-8` |
| Título de seção → conteúdo | `mb-3` |
| Entre cards de um grid | `gap-4` (grids densos: `gap-3`) |
| Cabeçalho da página → conteúdo | `mb-8` |
| Barra de filtros → tabela | `mb-4` |

Título de seção (menor que o `h1`, cor apagada, é rótulo e não manchete):

```tsx
<h2 className="mb-3 text-sm font-semibold tracking-tight text-muted-foreground">…</h2>
```

---

## Parte 5 — Componentes-assinatura

### Card

O visual do card é a marca registrada: **anel + duas sombras**, sem borda.

```tsx
"rounded-xl bg-card ring-1 ring-black/5 dark:ring-white/10 dark:shadow-none " +
"shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)]"
```

Espaçamento interno via variável `--card-spacing` (`--spacing(4)`, ou `3` no
`size="sm"`), para header/content/footer respirarem igual.
`CardFooter` tem `border-t bg-muted/50`.

### StatCard (métrica)

Padrão repetido em todas as telas:

```tsx
<Card>
  <CardContent className="px-5 py-1">
    <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
    <p className="mt-1.5 text-[26px] leading-8 font-semibold tracking-tight tabular-nums">
      {value}
    </p>
    {hint && <p className="mt-1 text-xs text-muted-foreground/80">{hint}</p>}
  </CardContent>
</Card>
```

- Destaque de dashboard: `text-[26px] leading-8`. Em listas/telas internas:
  `text-[22px]`.
- Grid: `grid gap-4 sm:grid-cols-2 xl:grid-cols-4` (4 cards por linha no XL).
- `hint` é a linha que explica a conta ("Receitas − CMV"). Use sempre que o
  número não for autoexplicativo.

### Semântica de valor

Só três cores, e sempre com variante dark:

```ts
const TONE = {
  positive: "text-emerald-600 dark:text-emerald-400",
  negative: "text-red-600 dark:text-red-400",
  warning:  "text-amber-600 dark:text-amber-400",  // pendente / a vencer
  default:  "",
};
const sign = (v: number) => (v >= 0 ? TONE.positive : TONE.negative);
```

Badges suaves usam o mesmo trio em 100/800 (claro) e 950/300 (escuro):

```tsx
<Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Pago</Badge>
<Badge className="bg-amber-100  text-amber-800  dark:bg-amber-950  dark:text-amber-300">Pendente</Badge>
<Badge className="bg-red-100    text-red-800    dark:bg-red-950    dark:text-red-300">Vencido</Badge>
```

### Tabela dentro de card

Tabela **nunca** solta na página — sempre `Card > CardContent p-0`:

```tsx
<Card>
  <CardContent className="p-0">
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="w-24 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                Nada por aqui ainda.
              </TableCell>
            </TableRow>
          ) : rows.map(…)}
        </TableBody>
      </Table>
    </div>
  </CardContent>
</Card>
```

Regras: `th` = `h-10 px-2 font-medium text-left`; `td` = `p-2 whitespace-nowrap`;
linha = `border-b hover:bg-muted/50`; números à direita com
`text-right tabular-nums`; vazio = `h-24 text-center text-muted-foreground`;
ações = `Button variant="ghost" size="icon-sm"` com `aria-label`, ícone de
excluir em `text-destructive`.

### Botões

`Button` do `ui/button.tsx`, variantes `default | outline | secondary | ghost |
destructive | link`, tamanhos `xs | sm | default (h-8) | lg | icon*`.
Detalhes que dão o toque: `rounded-lg`, `focus-visible:ring-3 ring-ring/50`,
`active:translate-y-px` (o botão "afunda" 1px no clique).
`destructive` é **suave** (`bg-destructive/10 text-destructive`), não vermelho
sólido. Ícone antes do texto, `size-4`, sem margem (o `gap` resolve).

### Formulários em dialog

```tsx
<form onSubmit={handleSubmit} className="grid gap-4">
  <div className="grid gap-2">
    <Label htmlFor="nome">Nome *</Label>
    <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)}
           placeholder="Ex.: João da Silva" required />
    <p className="text-xs text-muted-foreground">Dica opcional do campo.</p>
  </div>

  {/* Bloco de campos relacionados (sub-formulário condicional) */}
  <div className="grid gap-4 rounded-lg border border-input bg-muted/30 p-3">…</div>

  <DialogFooter>
    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
    <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
  </DialogFooter>
</form>
```

- Campo = `grid gap-2` com `Label` + controle (+ hint `text-xs`).
- Obrigatório marcado com ` *` no label.
- Placeholder sempre no formato `"Ex.: …"`.
- `DialogFooter` já vem com `-mx-4 -mb-4 border-t bg-muted/50` — a barra cinza
  colada na base do dialog.
- Dialog: `max-h-[calc(100%-2rem)] overflow-y-auto` **obrigatório** (sem isso,
  formulário alto trava sem scroll e o botão Salvar fica inacessível).
- Backdrop: `bg-black/10` + `backdrop-blur-xs` — véu leve, não escurecimento.
- Largura: `sm:max-w-sm` padrão, `sm:max-w-md` para formulário maior.
- Passe `key={item?.id ?? "new"}` no form para resetar o estado ao trocar de item.

### Segmented control (filtro de 2–4 opções)

Mesmo visual do `TabsList`; prefira isso a um `Select` quando as opções cabem:

```tsx
<div className="inline-flex h-8 items-center rounded-lg bg-muted p-[3px]">
  {options.map((o) => (
    <button key={o.value} type="button" onClick={() => onChange(o.value)}
      className={cn(
        "inline-flex h-full items-center gap-1.5 rounded-md px-2.5 text-sm font-medium whitespace-nowrap transition-all",
        active ? "bg-background text-foreground shadow-sm" : "text-foreground/60 hover:text-foreground"
      )}>
      {o.label}
      <span className="text-xs tabular-nums text-muted-foreground">{count}</span>
    </button>
  ))}
</div>
```

### Barra de busca + filtros

```tsx
<div className="mb-4 flex flex-wrap items-center gap-3">
  <div className="relative w-full max-w-sm">
    <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    <Input placeholder="Buscar…" className="pl-8" value={q} onChange={…} />
  </div>
  <Select …><SelectTrigger className="w-48"><SelectValue /></SelectTrigger>…</Select>
</div>
```

### Barra de proporção (share)

```tsx
<div className="h-1.5 w-16 overflow-hidden rounded-full bg-black/8">
  <div className="h-full rounded-full bg-(--chart-receita)" style={{ width: `${pct}%` }} />
</div>
```

### Avatares e logos

- Pessoa: `size-9 rounded-full object-cover ring-1 ring-black/10`; sem foto,
  `div` com `bg-muted` + ícone `User` `size-4 text-muted-foreground`.
- Logo de empresa/instituição: **card arredondado com `object-contain`**, nunca
  avatar redondo (corta a logo).

### Skeletons e loading

Toda rota tem `loading.tsx`. Sem essa fronteira de Suspense a navegação trava
esperando o servidor.

```tsx
// src/app/(app)/qualquer-rota/loading.tsx
import { PageSkeleton } from "@/components/page-skeleton";
export default function Loading() { return <PageSkeleton cards={4} rows={6} chart />; }
```

O `PageSkeleton` **espelha o esqueleto real da página** (mesmo nº de cards,
mesma altura de linha) para o clique parecer instantâneo.
`Skeleton` = `animate-pulse rounded-md bg-black/6`.

### Toasts

`<Toaster richColors position="top-right" />` no root layout. Depois de toda
mutação: `toast.success("Item salvo")` ou
`toast.error("Erro ao salvar", { description: error.message })`, seguido de
`router.refresh()`.

---

## Parte 6 — Gráficos (Recharts)

```tsx
<ResponsiveContainer width="100%" height={280}>
  <BarChart data={data} barGap={2} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
    <CartesianGrid vertical={false} stroke="var(--border)" strokeWidth={1} />
    <XAxis dataKey="month" axisLine={false} tickLine={false}
           tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
    <YAxis axisLine={false} tickLine={false} width={52}
           tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
           tickFormatter={(v) => `R$${compact.format(v)}`} />
    <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.5 }}
      contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)",
                      borderRadius: 8, fontSize: 13, color: "var(--popover-foreground)" }}
      labelStyle={{ color: "var(--muted-foreground)" }} />
    <Bar dataKey="receitas" fill="var(--chart-receita)" radius={[4, 4, 0, 0]} maxBarSize={24} />
  </BarChart>
</ResponsiveContainer>
```

Leis do gráfico:

- Grade **só horizontal**, na cor `--border`. Sem eixos desenhados, sem ticks.
- Barras com topo arredondado `[4,4,0,0]` e `maxBarSize={24}` — barra fina.
- Cores sempre pelas CSS vars (funciona no dark automaticamente).
- Legenda **própria**, acima do gráfico, com chips — não use o `<Legend>`:

```tsx
<span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
  <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: color }} />
  {label}
</span>
```

---

## Parte 7 — Tipografia

| Uso | Classe |
|---|---|
| Título de página | `text-[28px] font-semibold tracking-tight` |
| Título de seção | `text-sm font-semibold tracking-tight text-muted-foreground` |
| Título de card | `text-base font-medium` (ou `font-semibold tracking-tight`) |
| Métrica em destaque | `text-[26px] leading-8 font-semibold tracking-tight tabular-nums` |
| Métrica secundária | `text-[22px] font-semibold tracking-tight tabular-nums` |
| Corpo / tabela | `text-sm` |
| Rótulo de métrica | `text-[13px] font-medium text-muted-foreground` |
| Item de navegação | `text-[13px] font-medium` |
| Hint / metadado | `text-xs text-muted-foreground` |
| Hint secundário | `text-xs text-muted-foreground/80` |

- `tracking-tight` em **tudo que é título ou número grande**.
- `tabular-nums` em **todo número** (moeda, %, contagem) — sem isso a coluna
  "dança" ao atualizar.
- Peso máximo é `font-semibold`. Nunca `font-bold`.
- Tamanhos em pixel arbitrário (`text-[13px]`, `text-[22px]`) são intencionais:
  a escala padrão do Tailwind é grossa demais para esse visual denso.

---

## Parte 8 — Armadilhas (Base UI ≠ Radix)

Estes componentes são **shadcn sobre Base UI**. A API difere do que você
provavelmente já viu:

- `Select` recebe `items` **e** `onValueChange` (não `onChange`), e os
  `SelectItem` são renderizados dentro do `SelectContent` também:
  ```tsx
  <Select items={ITEMS} value={v} onValueChange={(x) => setV(x as T)}>
    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
    <SelectContent>{ITEMS.map((i) => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}</SelectContent>
  </Select>
  ```
- Triggers e itens compõem via prop **`render`**, não `asChild`:
  ```tsx
  <DropdownMenuTrigger render={<Button variant="outline" size="sm">…</Button>} />
  <DropdownMenuItem render={<Link href="/x">…</Link>} />
  ```
- Dialog usa `Backdrop` + `Popup` (não `Overlay`/`Content` do Radix) e estados
  `data-open` / `data-closed` nas animações.
- `Badge` usa `useRender` + `mergeProps` — para virar link, passe `render`.

Outras armadilhas:

- `--font-sans` **tem** que apontar para `var(--font-geist-sans)`. O `shadcn
  init` gera `--font-sans: var(--font-sans)` (circular) e a página inteira cai
  para fonte serifada.
- Logo em JPEG com fundo colorido só pode aparecer sobre superfície **da mesma
  cor exata** (`bg-sidebar` / `bg-(--brand-navy)`), senão fica um retângulo.
- Sintaxe Tailwind v4 para var arbitrária é `bg-(--minha-var)` /
  `text-(--minha-var)`, sem colchetes.
- Em Next 16 o middleware é `src/proxy.ts`. Se houver auth Supabase, use
  `getClaims()` (verificação local, ~0ms), nunca `getUser()` (300–700ms por
  navegação).

---

## Parte 9 — Checklist de tela nova

- [ ] `PageHeader` com título, descrição e ações à direita
- [ ] `loading.tsx` com `PageSkeleton` espelhando a tela
- [ ] Métricas em `StatCard` dentro de `grid gap-4 sm:grid-cols-2 xl:grid-cols-4`
- [ ] Lista em `Card > CardContent p-0 > Table`, com estado vazio de `h-24`
- [ ] Números com `tabular-nums` e alinhados à direita
- [ ] Cores só dos tokens + trio emerald/red/amber
- [ ] Ações destrutivas passam por `ConfirmDialog`
- [ ] Toda mutação → `toast` + `router.refresh()`
- [ ] Testado no mobile (sidebar vira header, tabela rola na horizontal)
