import Link from "next/link";
import { FileCheck2, Menu } from "lucide-react";
import { signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

const publicNavItems = [
  { label: "Home", href: "/" },
  { label: "Upload", href: "/upload" },
  { label: "Report", href: "/report" },
];

const privateNavItems = [
  { label: "Home", href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Upload", href: "/upload" },
  { label: "Report", href: "/report" },
];

export async function SiteHeader() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const navItems = user ? privateNavItems : publicNavItems;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-400/20">
            <FileCheck2 className="h-5 w-5" />
          </div>

          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight sm:text-base">
              PODMatch AI
            </p>
            <p className="hidden text-xs text-slate-400 sm:block">
              Freight billing review
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <span className="max-w-44 truncate text-sm text-slate-300">
                {user.email}
              </span>

              <form action={signOut}>
                <Button
                  type="submit"
                  variant="outline"
                  className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10"
                >
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                className="rounded-full text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <Link href="/login">Log in</Link>
              </Button>

              <Button
                asChild
                className="rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
              >
                <Link href="/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>

        <details className="relative md:hidden">
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-white/10 bg-white/5 text-white">
            <Menu className="h-5 w-5" />
          </summary>

          <div className="absolute right-0 top-12 w-72 rounded-3xl border border-white/10 bg-slate-950 p-4 shadow-2xl shadow-black/40">
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-4 border-t border-white/10 pt-4">
              {user ? (
                <div className="space-y-3">
                  <p className="truncate px-1 text-sm text-slate-300">
                    {user.email}
                  </p>

                  <form action={signOut}>
                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full rounded-2xl border-white/15 bg-white/5 text-white hover:bg-white/10"
                    >
                      Sign out
                    </Button>
                  </form>
                </div>
              ) : (
                <div className="grid gap-3">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full rounded-2xl border-white/15 bg-white/5 text-white hover:bg-white/10"
                  >
                    <Link href="/login">Log in</Link>
                  </Button>

                  <Button
                    asChild
                    className="w-full rounded-2xl bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                  >
                    <Link href="/signup">Get started</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}