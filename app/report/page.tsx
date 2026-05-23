"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FileCheck2,
  FileText,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

const blockedLoadSummary = [
  { label: "Load number", value: "PM-10482" },
  { label: "Carrier", value: "Atlas Freight Lines" },
  { label: "Broker", value: "Northstar Logistics" },
  { label: "Pickup", value: "Dallas, TX" },
  { label: "Delivery", value: "Atlanta, GA" },
  { label: "Delivery date", value: "Mar 22, 2026" },
];

const cleanLoadSummary = [
  { label: "Load number", value: "PM-20419" },
  { label: "Carrier", value: "Blue Ridge Transport" },
  { label: "Broker", value: "Summit Freight Group" },
  { label: "Pickup", value: "Phoenix, AZ" },
  { label: "Delivery", value: "Denver, CO" },
  { label: "Delivery date", value: "Apr 04, 2026" },
];

const blockedDocumentsReviewed = [
  { name: "Rate confirmation", status: "Reviewed", detail: "Base rate: USD 2,450.00" },
  { name: "Invoice", status: "Reviewed", detail: "Invoice total: USD 2,675.00" },
  { name: "POD", status: "Issue found", detail: "Receiver signature missing" },
  { name: "BOL", status: "Reviewed", detail: "Load number matched" },
  { name: "Lumper receipt", status: "Missing", detail: "Charge present, receipt not uploaded" },
  { name: "Detention evidence", status: "Not required", detail: "No detention charge detected" },
];

const cleanDocumentsReviewed = [
  { name: "Rate confirmation", status: "Reviewed", detail: "Base rate: USD 3,100.00" },
  { name: "Invoice", status: "Reviewed", detail: "Invoice total: USD 3,100.00" },
  { name: "POD", status: "Reviewed", detail: "Receiver signature detected" },
  { name: "BOL", status: "Reviewed", detail: "Load number matched" },
  { name: "Lumper receipt", status: "Not required", detail: "No lumper charge detected" },
  { name: "Detention evidence", status: "Not required", detail: "No detention charge detected" },
];

const blockedExtractedValues = [
  { label: "Rate confirmation total", value: "USD 2,450.00" },
  { label: "Invoice total", value: "USD 2,675.00" },
  { label: "Variance", value: "USD 225.00" },
  { label: "POD signed", value: "No" },
  { label: "Lumper charge", value: "USD 225.00" },
  { label: "Lumper receipt", value: "Missing" },
];

const cleanExtractedValues = [
  { label: "Rate confirmation total", value: "USD 3,100.00" },
  { label: "Invoice total", value: "USD 3,100.00" },
  { label: "Variance", value: "USD 0.00" },
  { label: "POD signed", value: "Yes" },
  { label: "Lumper charge", value: "None" },
  { label: "Lumper receipt", value: "Not required" },
];

const blockedBlockers = [
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

const blockedNextActions = [
  "Upload signed POD.",
  "Attach lumper receipt for USD 225.00 charge.",
  "Confirm revised total with broker before submitting invoice.",
  "Re-run PODMatch review after missing support is added.",
];

const cleanNextActions = [
  "Packet is ready for billing submission.",
  "Send invoice package to broker or factoring partner.",
  "Archive matched documents with load record.",
  "Monitor payment status after submission.",
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
  const [mode, setMode] = useState<"blocked" | "clean">("blocked");

  const isBlocked = mode === "blocked";

  const loadSummary = isBlocked ? blockedLoadSummary : cleanLoadSummary;
  const documentsReviewed = isBlocked ? blockedDocumentsReviewed : cleanDocumentsReviewed;
  const extractedValues = isBlocked ? blockedExtractedValues : cleanExtractedValues;
  const blockers = isBlocked ? blockedBlockers : [];
  const nextActions = isBlocked ? blockedNextActions : cleanNextActions;
  const highPriorityCount = blockers.filter((blocker) => blocker.severity === "High").length;

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

          <div
            className={`rounded-3xl border p-5 text-left ${
              isBlocked
                ? "border-red-500/30 bg-red-500/10"
                : "border-emerald-500/30 bg-emerald-500/10"
            }`}
          >
            <div className="flex items-center gap-3">
              {isBlocked ? (
                <ShieldAlert className="h-8 w-8 text-red-300" />
              ) : (
                <ShieldCheck className="h-8 w-8 text-emerald-300" />
              )}

              <div>
                <p className={isBlocked ? "text-sm text-red-200" : "text-sm text-emerald-200"}>
                  Payment readiness
                </p>
                <p className={isBlocked ? "text-2xl font-bold text-red-100" : "text-2xl font-bold text-emerald-100"}>
                  {isBlocked ? "Blocked" : "Ready"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-4 shadow-2xl">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-semibold">Demo mode</h2>
              <p className="text-sm text-slate-400">
                Switch between a blocked shipment packet and a clean, ready-to-bill packet.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-full bg-slate-950 p-1">
              <button
                type="button"
                onClick={() => setMode("blocked")}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  isBlocked
                    ? "bg-red-500 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                Blocked packet
              </button>

              <button
                type="button"
                onClick={() => setMode("clean")}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  !isBlocked
                    ? "bg-emerald-500 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                Clean packet
              </button>
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl">
            <p className="text-sm text-slate-400">Documents reviewed</p>
            <p className="mt-2 text-3xl font-bold text-white">{documentsReviewed.length}</p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl">
            <p className="text-sm text-slate-400">Billing blockers</p>
            <p className={`mt-2 text-3xl font-bold ${isBlocked ? "text-amber-300" : "text-emerald-300"}`}>
              {blockers.length}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl">
            <p className="text-sm text-slate-400">High priority</p>
            <p className={`mt-2 text-3xl font-bold ${isBlocked ? "text-red-300" : "text-emerald-300"}`}>
              {highPriorityCount}
            </p>
          </div>

          <div
            className={`rounded-3xl border p-5 shadow-2xl ${
              isBlocked
                ? "border-red-500/30 bg-red-500/10"
                : "border-emerald-500/30 bg-emerald-500/10"
            }`}
          >
            <p className={isBlocked ? "text-sm text-red-200" : "text-sm text-emerald-200"}>
              Final status
            </p>
            <p className={isBlocked ? "mt-2 text-3xl font-bold text-red-100" : "mt-2 text-3xl font-bold text-emerald-100"}>
              {isBlocked ? "Blocked" : "Ready"}
            </p>
          </div>
        </section>

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

        {isBlocked ? (
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
        ) : (
          <section className="mt-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 shadow-2xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <ShieldCheck className="h-7 w-7 text-emerald-300" />
                  <h2 className="text-2xl font-semibold text-emerald-100">No billing blockers found</h2>
                </div>
                <p className="max-w-3xl text-sm text-emerald-100/80">
                  The invoice matches the rate confirmation, the POD appears signed, and no unsupported
                  accessorials were detected. This packet is ready for billing submission.
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-400/10 px-5 py-4 text-center">
                <p className="text-sm text-emerald-200">Readiness score</p>
                <p className="text-3xl font-bold text-emerald-100">100%</p>
              </div>
            </div>
          </section>
        )}

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
              Upload another packet
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