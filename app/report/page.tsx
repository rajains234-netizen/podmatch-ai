import { Suspense } from "react";
import ReportContent from "./report-content";

function ReportLoading() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-16">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
            PODMatch AI
          </p>
          <h1 className="mt-4 text-2xl font-semibold">
            Loading report...
          </h1>
          <p className="mt-3 text-sm text-slate-300">
            Fetching the latest saved billing review.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<ReportLoading />}>
      <ReportContent />
    </Suspense>
  );
}