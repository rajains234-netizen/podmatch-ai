import Link from "next/link";
import { FileCheck2 } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950">
              <FileCheck2 className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-bold leading-none">PODMatch AI</p>
              <p className="mt-1 text-xs text-slate-400">Freight billing review</p>
            </div>
          </div>

          <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
            PODMatch AI helps logistics teams review PODs, BOLs, invoices, rate confirmations,
            receipts, and accessorial evidence before payment gets delayed.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Product</h3>
          <div className="mt-4 flex flex-col gap-3 text-sm text-slate-400">
            <Link href="/" className="hover:text-cyan-300">
              Home
            </Link>
            <Link href="/upload" className="hover:text-cyan-300">
              Upload packet
            </Link>
            <Link href="/report" className="hover:text-cyan-300">
              Demo report
            </Link>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">MVP status</h3>
          <div className="mt-4 flex flex-col gap-3 text-sm text-slate-400">
            <p>Frontend demo</p>
            <p>Mock document review</p>
            <p>Backend AI coming next</p>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800 px-6 py-5">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-3 text-sm text-slate-500 md:flex-row">
          <p>© 2026 PODMatch AI. All rights reserved.</p>
          <p>Demo MVP — not yet processing real documents.</p>
        </div>
      </div>
    </footer>
  );
}