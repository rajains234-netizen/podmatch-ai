import Link from "next/link";
import { ArrowRight, FileCheck2, AlertTriangle, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mb-6 rounded-full border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-300">
          Freight billing reconciliation for logistics teams
        </div>

        <h1 className="max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl">
          Catch missing PODs, invoice mismatches, and unsupported accessorials
          before they delay payment.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          PODMatch AI reviews freight documents like PODs, BOLs, rate
          confirmations, invoices, lumper receipts, and detention evidence —
          then flags billing blockers in minutes.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Button asChild size="lg" className="bg-blue-500 text-white hover:bg-blue-600">
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

        <div className="mt-16 grid w-full gap-4 md:grid-cols-3">
          <Card className="border-slate-800 bg-slate-900 text-left text-white">
            <CardContent className="p-6">
              <UploadCloud className="mb-4 h-8 w-8 text-blue-400" />
              <h3 className="text-lg font-semibold">Upload freight docs</h3>
              <p className="mt-2 text-sm text-slate-400">
                Add rate confirmations, invoices, PODs, BOLs, receipts, and
                accessorial evidence.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900 text-left text-white">
            <CardContent className="p-6">
              <FileCheck2 className="mb-4 h-8 w-8 text-emerald-400" />
              <h3 className="text-lg font-semibold">Match documents</h3>
              <p className="mt-2 text-sm text-slate-400">
                Extract load numbers, rates, signatures, delivery dates, and
                invoice totals automatically.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900 text-left text-white">
            <CardContent className="p-6">
              <AlertTriangle className="mb-4 h-8 w-8 text-amber-400" />
              <h3 className="text-lg font-semibold">Flag billing blockers</h3>
              <p className="mt-2 text-sm text-slate-400">
                Detect missing PODs, unsigned delivery docs, rate mismatches,
                and unsupported lumper or detention charges.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}