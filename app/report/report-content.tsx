"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  FileCheck2,
  FileText,
  Loader2,
  Printer,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

function formatCurrency(value: number) {
  return `USD ${Number(value ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}


type LoadSummaryItem = {
  label: string;
  value: string;
};

type ExtractedValueItem = {
  label: string;
  value: string;
};

type ReportDocument = {
  id: string;
  name: string;
  type: string;
  status: string;
  detail: string;
  confidence?: number | null;
  fileSize?: number | null;
  mimeType?: string | null;
  createdAt?: string | null;
};

type ReportBlocker = {
  id: string;
  title: string;
  severity: string;
  description: string;
  recommendation: string;
  createdAt?: string | null;
  amount_at_risk?: number | null;

};

type ReportPayload = {
  packet: {
    id: string;
    organizationId: string;
    loadNumber: string | null;
    status: string | null;
    createdAt: string | null;
    readinessScore: number;
    paymentDelayRisk: string | null;
  };
  report: {
    id: string | null;
    status: string | null;
    readinessScore: number;
    paymentDelayRisk: string | null;
    summary: string | null;
    createdAt: string | null;
    isBlocked: boolean;
    finalStatus: string;
  };
  loadSummary: LoadSummaryItem[];
  extractedValues: ExtractedValueItem[];
  documents: ReportDocument[];
  blockers: ReportBlocker[];
  nextActions: string[];
  totals: {
    documentsReviewed: number;
    billingBlockers: number;
    highPriority: number;
  };
};

function getStatusClass(status: string) {
  if (status === "Reviewed" || status === "Not required") {
    return "bg-emerald-400/10 text-emerald-300 print:border print:border-emerald-600 print:bg-white print:text-emerald-700";
  }

  if (status === "Issue found" || status === "Missing") {
    return "bg-amber-400/10 text-amber-300 print:border print:border-amber-600 print:bg-white print:text-amber-700";
  }

  return "bg-slate-700 text-slate-300 print:border print:border-slate-500 print:bg-white print:text-slate-700";
}

function getSeverityClass(severity: string) {
  if (severity === "High") {
    return "bg-red-400/10 text-red-300 print:border print:border-red-600 print:bg-white print:text-red-700";
  }

  if (severity === "Medium") {
    return "bg-amber-400/10 text-amber-300 print:border print:border-amber-600 print:bg-white print:text-amber-700";
  }

  return "bg-slate-700 text-slate-300 print:border print:border-slate-500 print:bg-white print:text-slate-700";
}

export default function ReportContent() {
  const searchParams = useSearchParams();
  const packetId = searchParams.get("packetId");

  const [reportData, setReportData] = useState<ReportPayload | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(packetId));
  const [error, setError] = useState<string | null>(null);

  const sourceDate = reportData?.report.createdAt
  ? new Date(reportData.report.createdAt)
  : null;

const generatedAt =
  !sourceDate || Number.isNaN(sourceDate.getTime())
    ? "Generated just now"
    : `Generated ${sourceDate.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })}`;

  useEffect(() => {
    async function fetchReport() {
      if (!packetId) {
        setIsLoading(false);
        setError("Missing packet ID. Open this page from a completed upload review.");
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/reports/${packetId}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load report.");
        }

        setReportData(payload);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load report."
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchReport();
  }, [packetId]);

  function handlePrint() {
    window.print();
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10 text-white">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center shadow-2xl">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-cyan-300" />
          <h1 className="text-2xl font-bold">Loading report</h1>
          <p className="mt-2 text-slate-400">
            Fetching the latest billing readiness results.
          </p>
        </div>
      </main>
    );
  }

  if (error || !reportData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10 text-white">
        <div className="max-w-xl rounded-3xl border border-red-500/30 bg-red-500/10 p-8 shadow-2xl">
          <AlertTriangle className="mb-4 h-8 w-8 text-red-300" />
          <h1 className="text-2xl font-bold">Report unavailable</h1>
          <p className="mt-3 text-red-100">{error ?? "Report not found."}</p>
          <Link
            href="/upload"
            className="mt-6 inline-flex rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
          >
            Back to upload
          </Link>
        </div>
      </main>
    );
  }

  const isBlocked = reportData.report.isBlocked;
  const loadSummary = reportData.loadSummary;
  const documentsReviewed = reportData.documents;
  const extractedValues = reportData.extractedValues;
  const blockers = reportData.blockers;
  const nextActions = reportData.nextActions;
  const highPriorityCount = reportData.totals.highPriority;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white print:bg-white print:px-0 print:py-0 print:text-slate-950">
      <style jsx global>{`
        @media print {
          header,
          footer,
          .print-hide {
            display: none !important;
          }

          body {
            background: white !important;
          }

          .print-page {
            max-width: none !important;
            padding: 0 !important;
          }

          .print-card {
            break-inside: avoid;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="print-page mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-center print:mb-6 print:border-b print:border-slate-300 print:pb-5">
          <div>
            <Link
              href="/upload"
              className="print-hide mb-4 inline-flex items-center text-sm text-slate-400 hover:text-cyan-300"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to upload
            </Link>

            <p className="mb-2 text-sm font-medium text-cyan-300 print:text-slate-600">
              PODMatch AI live report
            </p>

            <h1 className="text-4xl font-bold tracking-tight print:text-3xl print:text-slate-950">
              Billing readiness report
            </h1>

            <p className="mt-3 max-w-2xl text-slate-300 print:text-slate-700">
              This report reflects the uploaded packet{" "}
              <span className="font-semibold text-white print:text-slate-950">
                {reportData.packet.loadNumber ?? reportData.packet.id}
              </span>{" "}
              and uses the latest saved review results.
            </p>

            <p className="mt-3 text-sm text-slate-500 print:text-slate-600">
              {generatedAt}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row md:items-center">
            <button
              type="button"
              onClick={handlePrint}
              className="print-hide inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print / Save PDF
            </button>

            <div
              className={`print-card rounded-3xl border p-5 text-left print:border-slate-300 print:bg-white ${
                isBlocked
                  ? "border-red-500/30 bg-red-500/10"
                  : "border-emerald-500/30 bg-emerald-500/10"
              }`}
            >
              <div className="flex items-center gap-3">
                {isBlocked ? (
                  <ShieldAlert className="h-8 w-8 text-red-300 print:text-red-700" />
                ) : (
                  <ShieldCheck className="h-8 w-8 text-emerald-300 print:text-emerald-700" />
                )}

                <div>
                  <p
                    className={
                      isBlocked
                        ? "text-sm text-red-200 print:text-red-700"
                        : "text-sm text-emerald-200 print:text-emerald-700"
                    }
                  >
                    Payment readiness
                  </p>

                  <p
                    className={
                      isBlocked
                        ? "text-2xl font-bold text-red-100 print:text-red-800"
                        : "text-2xl font-bold text-emerald-100 print:text-emerald-800"
                    }
                  >
                    {isBlocked ? "Blocked" : "Ready"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <div className="print-card rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl print:border-slate-300 print:bg-white">
            <p className="text-sm text-slate-400 print:text-slate-600">
              Documents reviewed
            </p>
            <p className="mt-2 text-3xl font-bold text-white print:text-slate-950">
              {documentsReviewed.length}
            </p>
          </div>

          <div className="print-card rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl print:border-slate-300 print:bg-white">
            <p className="text-sm text-slate-400 print:text-slate-600">
              Billing blockers
            </p>
            <p
              className={`mt-2 text-3xl font-bold ${
                isBlocked
                  ? "text-amber-300 print:text-amber-700"
                  : "text-emerald-300 print:text-emerald-700"
              }`}
            >
              {blockers.length}
            </p>
          </div>

          <div className="print-card rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl print:border-slate-300 print:bg-white">
            <p className="text-sm text-slate-400 print:text-slate-600">
              High priority
            </p>
            <p
              className={`mt-2 text-3xl font-bold ${
                isBlocked
                  ? "text-red-300 print:text-red-700"
                  : "text-emerald-300 print:text-emerald-700"
              }`}
            >
              {highPriorityCount}
            </p>
          </div>

          <div
            className={`print-card rounded-3xl border p-5 shadow-2xl print:border-slate-300 print:bg-white ${
              isBlocked
                ? "border-red-500/30 bg-red-500/10"
                : "border-emerald-500/30 bg-emerald-500/10"
            }`}
          >
            <p
              className={
                isBlocked
                  ? "text-sm text-red-200 print:text-red-700"
                  : "text-sm text-emerald-200 print:text-emerald-700"
              }
            >
              Final status
            </p>

            <p
              className={
                isBlocked
                  ? "mt-2 text-3xl font-bold text-red-100 print:text-red-800"
                  : "mt-2 text-3xl font-bold text-emerald-100 print:text-emerald-800"
              }
            >
              {reportData.report.finalStatus}
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="print-card rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl print:border-slate-300 print:bg-white">
            <div className="mb-5 flex items-center gap-3">
              <ClipboardList className="h-6 w-6 text-cyan-300 print:text-slate-700" />
              <h2 className="text-2xl font-semibold print:text-slate-950">
                Load summary
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {loadSummary.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl bg-slate-950/70 p-4 print:border print:border-slate-200 print:bg-white"
                >
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-1 font-medium text-white print:text-slate-950">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="print-card rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl print:border-slate-300 print:bg-white">
            <div className="mb-5 flex items-center gap-3">
              <CircleDollarSign className="h-6 w-6 text-emerald-300 print:text-slate-700" />
              <h2 className="text-2xl font-semibold print:text-slate-950">
                Extracted billing values
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {extractedValues.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-2xl bg-slate-950/70 px-4 py-3 print:border print:border-slate-200 print:bg-white"
                >
                  <span className="text-sm text-slate-400 print:text-slate-600">
                    {item.label}
                  </span>
                  <span className="text-sm font-semibold text-white print:text-slate-950">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="print-card mt-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl print:border-slate-300 print:bg-white">
          <div className="mb-5 flex items-center gap-3">
            <FileCheck2 className="h-6 w-6 text-blue-300 print:text-slate-700" />
            <h2 className="text-2xl font-semibold print:text-slate-950">
              Documents reviewed
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {documentsReviewed.map((doc) => (
              <div
                key={doc.id}
                className="print-card rounded-2xl border border-slate-800 bg-slate-950/70 p-5 print:border-slate-200 print:bg-white"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-cyan-300 print:text-slate-700" />
                    <h3 className="font-semibold text-white print:text-slate-950">
                      {doc.name}
                    </h3>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                      doc.status
                    )}`}
                  >
                    {doc.status}
                  </span>
                </div>

                <p className="text-sm text-slate-400 print:text-slate-700">
                  {doc.detail}
                </p>
              </div>
            ))}
          </div>
        </section>

        {isBlocked ? (
          <section className="print-card mt-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl print:border-slate-300 print:bg-white">
            <div className="mb-5 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-300 print:text-amber-700" />
              <h2 className="text-2xl font-semibold print:text-slate-950">
                Billing blockers
              </h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {blockers.map((blocker) => (
                <div
                  key={blocker.id}
                  className="print-card rounded-2xl border border-slate-800 bg-slate-950/70 p-5 print:border-slate-200 print:bg-white"
                >
                  <span
                    className={`mb-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getSeverityClass(
                      blocker.severity
                    )}`}
                  >
                    {blocker.severity} priority
                  </span>

                  <h3 className="font-semibold text-white print:text-slate-950">
                    {blocker.title}
                  </h3>

                  <p className="mt-3 text-sm text-slate-400 print:text-slate-700">
                    {blocker.description}
                  </p>

                  {Number(blocker.amount_at_risk ?? 0) > 0 ? (
                  <p className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-sm font-semibold text-rose-200 print:border-rose-200 print:bg-rose-50 print:text-rose-700">
                  Amount at risk: {formatCurrency(Number(blocker.amount_at_risk))}
                  </p>
                  ) : null}

                  <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 print:border-slate-200 print:bg-slate-50">
                    <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300 print:text-slate-600">
                      Recommended fix
                    </p>

                    <p className="mt-2 text-sm text-slate-200 print:text-slate-800">
                      {blocker.recommendation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="print-card mt-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 shadow-2xl print:border-slate-300 print:bg-white">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="mt-1 h-7 w-7 text-emerald-300 print:text-emerald-700" />
              <div>
                <h2 className="text-2xl font-semibold text-emerald-100 print:text-emerald-800">
                  No billing blockers detected
                </h2>
                <p className="mt-2 text-sm text-emerald-100/80 print:text-slate-700">
                  This packet appears ready for billing submission based on the
                  saved review results.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="print-card mt-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl print:border-slate-300 print:bg-white">
          <h2 className="text-2xl font-semibold print:text-slate-950">
            Next actions
          </h2>

          <ol className="mt-5 space-y-3">
            {nextActions.map((action, index) => (
              <li
                key={action}
                className="flex gap-3 rounded-2xl bg-slate-950/70 p-4 print:border print:border-slate-200 print:bg-white"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-400 text-sm font-bold text-slate-950">
                  {index + 1}
                </span>
                <span className="text-sm text-slate-200 print:text-slate-800">
                  {action}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}