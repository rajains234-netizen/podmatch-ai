"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileCheck2, Menu, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Upload", href: "/upload" },
  { label: "Report", href: "/report" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 text-white backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950">
            <FileCheck2 className="h-5 w-5" />
          </div>

          <div>
            <p className="text-sm font-bold leading-none">PODMatch AI</p>
            <p className="mt-1 text-xs text-slate-400">Freight billing review</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
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

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/upload"
            className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-400 hover:text-cyan-300"
          >
            Upload docs
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="rounded-xl border border-slate-800 p-2 text-slate-300 hover:border-cyan-400 hover:text-cyan-300 md:hidden"
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

            <Link
              href="/upload"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-2xl border border-cyan-400/40 px-4 py-3 text-sm font-semibold text-cyan-300"
            >
              Upload docs
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}