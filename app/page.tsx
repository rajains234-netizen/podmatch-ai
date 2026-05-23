import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  ShieldCheck,
  UploadCloud,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const valueCards = [
  {
    icon: UploadCloud,
    title: "Upload freight docs",
    description:
      "Add rate confirmations, invoices, PODs, BOLs, receipts, and accessorial evidence in one review flow.",
    color: "text-blue-400",
  },
  {
    icon: FileCheck2,
    title: "Match documents",
    description:
      "Preview extracted load numbers, rates, signatures, delivery dates, invoice totals, and document status.",
    color: "text-emerald-400",
  },
  {
    icon: AlertTriangle,
    title: "Flag billing blockers",
    description:
      "Spot missing PODs, unsigned delivery docs, rate mismatches, and unsupported lumper or detention charges.",
    color: "text-amber-400",
  },
];

const steps = [
  {
    number: "01",
    title: "Upload the shipment packet",
    description:
      "Start with a rate confirmation, invoice, POD, BOL, receipts, or accessorial evidence.",
  },
  {
    number: "02",
    title: "Run the PODMatch review",
    description:
      "The demo checks document types, shows extracted billing fields, and simulates an AI review.",
  },
  {
    number: "03",
    title: "Review blockers before billing",
    description:
      "See what needs to be fixed before the invoice is submitted or payment gets delayed.",
  },
];

const audiences = [
  "Carriers",
  "Dispatch teams",
  "Freight brokers",
  "Factoring teams",
  "Back-office billing teams",
  "Owner-operators",
];

const metrics = [
  { label: "Document types reviewed", value: "6+" },
  { label: "Demo review time", value: "1 min" },
  { label: "Billing blockers surfaced", value: "3" },
];

export default function Home() {
  return (
    <main className="bg-slate-950 text-white">
      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <div className="mb-6 inline-flex rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-300">
            Freight billing reconciliation for logistics teams
          </div>

          <h1 className="max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl">
            Catch missing PODs, invoice mismatches, and unsupported accessorials before they delay
            payment.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            PODMatch AI reviews freight documents like PODs, BOLs, rate confirmations, invoices,
            lumper receipts, and detention evidence — then flags billing blockers in minutes.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Button asChild size="lg" className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">
              <Link href="/upload">
                Upload shipment packet
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-slate-700 bg-transparent text-white hover:bg-slate-900"
            >
              <Link href="/report">View demo report</Link>
            </Button>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-3xl font-bold text-cyan-300">{metric.value}</p>
                <p className="mt-1 text-sm text-slate-400">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
            <div className="mb-4 flex items-center gap-3">
              <AlertTriangle className="h-7 w-7 text-red-300" />
              <div>
                <p className="text-sm text-red-200">Payment readiness</p>
                <p className="text-2xl font-bold text-red-100">Blocked</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl bg-slate-950/70 p-4">
                <p className="font-semibold text-white">Missing signed POD</p>
                <p className="mt-1 text-sm text-slate-400">
                  Receiver signature is required before billing.
                </p>
              </div>

              <div className="rounded-xl bg-slate-950/70 p-4">
                <p className="font-semibold text-white">Invoice mismatch</p>
                <p className="mt-1 text-sm text-slate-400">
                  Invoice total is USD 225.00 above the rate confirmation.
                </p>
              </div>

              <div className="rounded-xl bg-slate-950/70 p-4">
                <p className="font-semibold text-white">Unsupported lumper charge</p>
                <p className="mt-1 text-sm text-slate-400">
                  Lumper fee was found without matching receipt support.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-emerald-300" />
              <p className="font-semibold text-emerald-100">
                Fix blockers before the invoice is submitted.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-800 bg-slate-900/40">
        <div className="mx-auto grid max-w-6xl gap-4 px-6 py-12 md:grid-cols-3">
          {valueCards.map((card) => {
            const Icon = card.icon;

            return (
              <Card key={card.title} className="border-slate-800 bg-slate-900 text-left text-white">
                <CardContent className="p-6">
                  <Icon className={`mb-4 h-8 w-8 ${card.color}`} />
                  <h3 className="text-lg font-semibold">{card.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{card.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-10 max-w-2xl">
          <p className="mb-2 text-sm font-medium text-cyan-300">How it works</p>
          <h2 className="text-4xl font-bold tracking-tight">From freight docs to billing readiness.</h2>
          <p className="mt-4 text-slate-300">
            The frontend MVP demonstrates the full review journey, from upload to mock analysis to
            a shareable billing report.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
              <p className="text-sm font-bold text-cyan-300">{step.number}</p>
              <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-400">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 pb-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="mb-2 text-sm font-medium text-cyan-300">Built for freight billing teams</p>
          <h2 className="text-4xl font-bold tracking-tight">
            A faster way to check whether a load packet is ready to bill.
          </h2>
          <p className="mt-4 text-slate-300">
            PODMatch AI is designed for teams that lose time chasing missing delivery support,
            mismatched invoice totals, and accessorial documentation.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {audiences.map((audience) => (
            <div
              key={audience}
              className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4"
            >
              <Users className="h-5 w-5 text-cyan-300" />
              <span className="text-sm font-medium text-slate-200">{audience}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-8 text-center">
          <Clock3 className="mx-auto mb-4 h-9 w-9 text-cyan-300" />
          <h2 className="text-3xl font-bold tracking-tight">Try the review flow with sample docs.</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            Use the sample packet on the upload page to see document detection, mock extraction,
            blocker cards, and the full billing readiness report.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">
              <Link href="/upload">
                Open upload flow
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>

            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-slate-700 bg-transparent text-white hover:bg-slate-900"
            >
              <Link href="/report">View report demo</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}