import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileText, UploadCloud } from "lucide-react";

const documents = [
  "Rate confirmation",
  "Invoice",
  "POD",
  "BOL",
  "Lumper receipt",
  "Detention evidence",
];

const extractedFields = [
  { label: "Load number", value: "PM-10482" },
  { label: "Carrier", value: "Atlas Freight Lines" },
  { label: "Delivery date", value: "Mar 22, 2026" },
  { label: "Rate confirmation total", value: "USD 2,450.00" },
  { label: "Invoice total", value: "USD 2,675.00" },
  { label: "POD signature", value: "Missing" },
];

const blockers = [
  {
    title: "Missing signed POD",
    description: "The delivery document is missing a receiver signature.",
    severity: "High",
  },
  {
    title: "Invoice mismatch",
    description: "Invoice total is USD 225.00 higher than the rate confirmation.",
    severity: "High",
  },
  {
    title: "Unsupported lumper charge",
    description: "Lumper fee was detected, but no matching receipt was uploaded.",
    severity: "Medium",
  },
];

export default function UploadPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex items-center justify-between gap-6">
          <div>
            <p className="mb-2 text-sm font-medium text-cyan-300">PODMatch AI</p>
            <h1 className="text-4xl font-bold tracking-tight">Upload freight docs</h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              Add rate confirmations, invoices, PODs, BOLs, receipts, and accessorial evidence.
              PODMatch AI will match documents, extract billing details, and flag blockers before
              payment is delayed.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
          >
            Back home
          </Link>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl">
            <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-cyan-500/40 bg-slate-950/70 p-8 text-center">
              <UploadCloud className="mb-4 h-12 w-12 text-cyan-300" />
              <h2 className="text-2xl font-semibold">Drop freight documents here</h2>
              <p className="mt-3 max-w-md text-slate-400">
                Demo mode: upload handling will be connected later. For now, this screen shows the
                review flow PODMatch AI will produce.
              </p>
              <button className="mt-6 rounded-full bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300">
                Choose files
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {documents.map((doc) => (
                <div
                  key={doc}
                  className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <FileText className="h-5 w-5 text-cyan-300" />
                  <span className="text-sm text-slate-200">{doc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl">
            <div className="mb-5 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-300" />
              <h2 className="text-2xl font-semibold">Mock extraction</h2>
            </div>

            <div className="space-y-3">
              {extractedFields.map((field) => (
                <div
                  key={field.label}
                  className="flex items-center justify-between rounded-2xl bg-slate-950/70 px-4 py-3"
                >
                  <span className="text-sm text-slate-400">{field.label}</span>
                  <span className="text-sm font-medium text-white">{field.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl">
          <div className="mb-5 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-300" />
            <h2 className="text-2xl font-semibold">Billing blockers found</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {blockers.map((blocker) => (
              <div
                key={blocker.title}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"
              >
                <div className="mb-3 inline-flex rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
                  {blocker.severity} priority
                </div>
                <h3 className="font-semibold text-white">{blocker.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{blocker.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}