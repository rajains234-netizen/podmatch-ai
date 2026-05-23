import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FileCheck2,
  FileText,
  ShieldAlert,
} from "lucide-react";

const loadSummary = [
  { label: "Load number", value: "PM-10482" },
  { label: "Carrier", value: "Atlas Freight Lines" },
  { label: "Broker", value: "Northstar Logistics" },
  { label: "Pickup", value: "Dallas, TX" },
  { label: "Delivery", value: "Atlanta, GA" },
  { label: "Delivery date", value: "Mar 22, 2026" },
];

const documentsReviewed = [
  { name: "Rate confirmation", status: "Reviewed", detail: "Base rate: USD 2,450.00" },
  { name: "Invoice", status: "Reviewed", detail: "Invoice total: USD 2,675.00" },
  { name: "POD", status: "Issue found", detail: "Receiver signature missing" },
  { name: "BOL", status: "Reviewed", detail: "Load number matched" },
  { name: "Lumper receipt", status: "Missing", detail: "Charge present, receipt not uploaded" },
  { name: "Detention evidence", status: "Not required", detail: "No detention charge detected" },
];

const extractedValues = [
  { label: "Rate confirmation total", value: "USD 2,450.00" },
  { label: "Invoice total", value: "USD 2,675.00" },
  { label: "Variance", value: "USD 225.00" },
  { label: "POD signed", value: "No" },
  { label: "Lumper charge", value: "USD 225.00" },
  { label: "Lumper receipt", value: "Missing" },
];

const blockers = [
  {
    title: "Missing signed POD",
    severity: "High",
    description:
      "The POD appears to be missing the receiver signature required to support delivery completion.",
    recommendation: "Request a signed POD from the receiver, driver, carrier, or broker portal.",
  },
  {
    title: "Invoice exceeds rate confirmation",
    severity: "High",
    description:
      "The invoice total is USD 225.00 higher than the rate confirmation amount.",
    recommendation:
      "Confirm whether the extra USD 225.00 is approved as an accessorial before submitting.",
  },
  {
    title: "Unsupported lumper charge",
    severity: "Medium",
    description:
      "A lumper charge was detected, but no matching lumper receipt was included in the packet.",
    recommendation: "Upload the lumper receipt or remove the charge before billing.",
  },
];

const nextActions = [
  "Upload signed POD.",
  "Attach lumper receipt for USD 225.00 charge.",
  "Confirm revised total with broker before submitting invoice.",
  "Re-run PODMatch review after missing support is added.",
];

function getStatusClass(status: string) {
  if (status === "Reviewed" || status === "Not required") {
    return "bg-emerald-400/10 text-emerald-300";
  }

  if (status === "Issue found" || status === "Missing") {
    return "bg-amber-400/10 text-amber-300";
  }

  return "bg-slate-700 text-slate-300";
}

function getSeverityClass(severity: string) {
  if (severity === "High") {
    return "bg-red-400/10 text-red-300";
  }

  if (severity === "Medium") {
    return "bg-amber-400/10 text-amber-300";
  }

  return "bg-slate-700 text-slate-300";
}

export default function ReportPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <Link
              href="/"
              className="mb-4 inline-flex items-center text-sm text-slate-400 hover:text-cyan-300"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back home
            </Link>

            <p className="mb-2 text-sm font-medium text-cyan-300">PODMatch AI report</p>
            <h1 className="text-4xl font-bold tracking-tight">Billing readiness review</h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              PODMatch AI compared the shipment packet against the invoice and rate confirmation,
              then flagged documents and charges that may delay payment.
            </p>
          </div>

          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-left">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-8 w-8 text-red-300" />
              <div>
                <p className="text-sm text-red-200">Payment readiness</p>
                <p className="text-2xl font-bold text-red-100">Blocked</p>
              </div>
            </div>
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl">
            <div className="mb-5 flex items-center gap-3">
              <ClipboardList className="h-6 w-6 text-cyan-300" />
              <h2 className="text-2xl font-semibold">Load summary</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {loadSummary.map((item) => (
                <div key={item.label} className="rounded-2xl bg-slate-950/70 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="mt-1 font-medium text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl">
            <div className="mb-5 flex items-center gap-3">
              <CircleDollarSign className="h-6 w-6 text-emerald-300" />
              <h2 className="text-2xl font-semibold">Extracted billing values</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {extractedValues.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl bg-slate-950/70 px-4 py-3"
                >
                  <span className="text-sm text-slate-400">{item.label}</span>
                  <span className="text-sm font-semibold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl">
          <div className="mb-5 flex items-center gap-3">
            <FileCheck2 className="h-6 w-6 text-blue-300" />
            <h2 className="text-2xl font-semibold">Documents reviewed</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {documentsReviewed.map((doc) => (
              <div key={doc.name} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-cyan-300" />
                    <h3 className="font-semibold text-white">{doc.name}</h3>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                      doc.status
                    )}`}
                  >
                    {doc.status}
                  </span>
                </div>

                <p className="text-sm text-slate-400">{doc.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl">
          <div className="mb-5 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-300" />
            <h2 className="text-2xl font-semibold">Billing blockers</h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {blockers.map((blocker) => (
              <div
                key={blocker.title}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"
              >
                <span
                  className={`mb-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getSeverityClass(
                    blocker.severity
                  )}`}
                >
                  {blocker.severity} priority
                </span>

                <h3 className="font-semibold text-white">{blocker.title}</h3>
                <p className="mt-3 text-sm text-slate-400">{blocker.description}</p>

                <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
                    Recommended fix
                  </p>
                  <p className="mt-2 text-sm text-slate-200">{blocker.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl">
          <div className="mb-5 flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-300" />
            <h2 className="text-2xl font-semibold">Next actions</h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {nextActions.map((action) => (
              <div key={action} className="flex items-center gap-3 rounded-2xl bg-slate-950/70 p-4">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                <p className="text-sm text-slate-200">{action}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/upload"
              className="rounded-full bg-cyan-400 px-6 py-3 text-center font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Upload missing documents
            </Link>

            <Link
              href="/"
              className="rounded-full border border-slate-700 px-6 py-3 text-center font-semibold text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
            >
              Return to homepage
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}