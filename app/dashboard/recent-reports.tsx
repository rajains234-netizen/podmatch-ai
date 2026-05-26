"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RecentReport = {
  packetId: string;
  reportId: string | null;
  loadNumber: string;
  status: string;
  rawStatus: string;
  readinessScore: number;
  paymentDelayRisk: string;
  summary: string | null;
  createdAt: string | null;
  reportCreatedAt: string | null;
  href: string;
};

function getStatusClasses(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("ready")) {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }

  if (normalized.includes("review") || normalized.includes("blocked")) {
    return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  }

  return "border-slate-400/30 bg-slate-400/10 text-slate-200";
}

function formatDate(value: string | null) {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function RecentReports() {
  const [reports, setReports] = useState<RecentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReports() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/reports/recent");

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load recent reports.");
        }

        setReports(payload.reports ?? []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load recent reports."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, []);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-cyan-300">
            Recent reports
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Saved billing reviews
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Reopen recent packet reviews, check readiness, and continue from the
            latest saved report.
          </p>
        </div>

        <Link
          href="/upload"
          className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          Upload new packet
        </Link>
      </div>

      {loading ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/50 p-6 text-sm text-slate-300">
          Loading recent reports...
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-6 text-sm text-red-200">
          {error}
        </div>
      ) : reports.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/50 p-6">
          <h3 className="text-lg font-semibold text-white">
            No reports yet
          </h3>
          <p className="mt-2 text-sm text-slate-300">
            Upload a packet to generate your first billing readiness report.
          </p>
          <Link
            href="/upload"
            className="mt-4 inline-flex rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Upload packet
          </Link>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
          <div className="hidden grid-cols-[1.2fr_0.8fr_0.7fr_0.8fr_1fr_0.7fr] gap-4 border-b border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 lg:grid">
            <span>Load</span>
            <span>Status</span>
            <span>Score</span>
            <span>Risk</span>
            <span>Created</span>
            <span className="text-right">Action</span>
          </div>

          <div className="divide-y divide-white/10">
            {reports.map((report) => (
              <div
                key={report.packetId}
                className="grid gap-4 px-5 py-5 lg:grid-cols-[1.2fr_0.8fr_0.7fr_0.8fr_1fr_0.7fr] lg:items-center"
              >
                <div>
                  <p className="font-semibold text-white">
                    {report.loadNumber}
                  </p>
                  <p className="mt-1 break-all text-xs text-slate-400">
                    {report.packetId}
                  </p>
                </div>

                <div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                      report.rawStatus
                    )}`}
                  >
                    {report.status}
                  </span>
                </div>

                <div className="text-sm text-slate-200">
                  <span className="font-semibold text-white">
                    {report.readinessScore}%
                  </span>
                </div>

                <div className="text-sm text-slate-300">
                  {report.paymentDelayRisk}
                </div>

                <div className="text-sm text-slate-300">
                  {formatDate(report.createdAt)}
                </div>

                <div className="lg:text-right">
                  <Link
                    href={report.href}
                    className="inline-flex rounded-full border border-cyan-300/40 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-300/10"
                  >
                    View report
                  </Link>
                </div>

                {report.summary ? (
                  <p className="text-sm text-slate-400 lg:col-span-6">
                    {report.summary}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}