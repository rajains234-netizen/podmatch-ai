"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FileCheck2, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Upload", href: "/upload" },
  { label: "Report", href: "/report" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
      setAuthLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setMobileMenuOpen(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 text-white backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-6 py-4">
        <Link href="/" className="flex items-center gap-3 justify-self-start">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950">
            <FileCheck2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold leading-none">PODMatch AI</p>
            <p className="mt-1 text-xs text-slate-400">Freight billing review</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 justify-self-center md:flex">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-cyan-400 text-slate-950"
                    : "text-slate-300 hover:bg-slate-900 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 justify-self-end md:flex">
          {!authLoading && user ? (
            <>
              <span className="max-w-48 truncate text-xs text-slate-400">
                {user.email}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
              >
                Sign out
              </button>
            </>
          ) : !authLoading ? (
            <Link
              href="/login"
              className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Sign in
            </Link>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="justify-self-end rounded-xl border border-slate-800 p-2 text-slate-300 hover:border-cyan-400 hover:text-cyan-300 md:hidden"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-slate-800 bg-slate-950 px-6 py-4 md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-cyan-400 text-slate-950"
                      : "bg-slate-900 text-slate-300 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="mt-3 border-t border-slate-800 pt-3">
              {!authLoading && user ? (
                <div className="space-y-3">
                  <p className="truncate px-4 text-xs text-slate-400">
                    Signed in as {user.email}
                  </p>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full rounded-2xl border border-slate-700 px-4 py-3 text-left text-sm font-medium text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
                  >
                    Sign out
                  </button>
                </div>
              ) : !authLoading ? (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  Sign in
                </Link>
              ) : null}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}