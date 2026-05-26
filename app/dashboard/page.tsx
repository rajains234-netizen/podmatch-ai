import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import RecentReports from "./recent-reports";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type OrganizationSummary = {
  name: string | null;
  plan: string | null;
  monthly_packet_limit: number | null;
  packets_used_this_month: number | null;
};

type MembershipWithOrganization = {
  organization_id: string;
  role: string;
  organizations: OrganizationSummary[] | OrganizationSummary | null;
};

type ShipmentPacket = {
  id: string;
  load_number: string | null;
  broker_name: string | null;
  status: string;
  created_at: string;
  readiness_score?: number | null;
  revenue_at_risk?: number | null;
  invoice_total?: number | null;
  accessorial_total?: number | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: memberships } = await supabase
    .from("organization_members")
    .select(
      "organization_id, role, organizations(name, plan, monthly_packet_limit, packets_used_this_month)"
    )
    .eq("user_id", user.id)
    .limit(1);

  const firstMembership = memberships?.[0] as
    | MembershipWithOrganization
    | undefined;

  const organization = Array.isArray(firstMembership?.organizations)
    ? firstMembership?.organizations[0]
    : firstMembership?.organizations;

  const { data: packets } = await supabase
    .from("shipment_packets")
    .select(
      "id, load_number, broker_name, status, created_at, readiness_score, revenue_at_risk, invoice_total, accessorial_total"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const shipmentPackets = (packets || []) as ShipmentPacket[];

  const readyCount = shipmentPackets.filter(
    (packet) => packet.status === "ready_to_bill"
  ).length;

  const blockedCount = shipmentPackets.filter(
    (packet) => packet.status === "blocked"
  ).length;

  const needsReviewCount = shipmentPackets.filter(
    (packet) => packet.status === "needs_review"
  ).length;

  const riskyStatuses = ["blocked", "needs_review", "failed"];

  const revenueAtRisk = shipmentPackets
    .filter((packet) => riskyStatuses.includes(packet.status))
    .reduce((total, packet) => {
      const storedRisk = Number(packet.revenue_at_risk || 0);

      const fallbackRisk =
        Number(packet.invoice_total || 0) +
        Number(packet.accessorial_total || 0);

      return total + (storedRisk || fallbackRisk);
    }, 0);

  const packetLimit = organization?.monthly_packet_limit || 10;
  const packetsUsed = organization?.packets_used_this_month || 0;

  const usagePercent = Math.min(
    100,
    Math.round((Number(packetsUsed) / Number(packetLimit || 1)) * 100)
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_35%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_30%),linear-gradient(135deg,#020617_0%,#0f172a_55%,#111827_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />

        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-sm text-emerald-100 shadow-sm">
                <ShieldCheck className="mr-2 h-4 w-4 text-emerald-300" />
                Freight billing command center
              </div>

              <h1 className="mt-5 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">
                Know what is ready to bill and what may delay payment.
              </h1>

              <p className="mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
                Review signed PODs, invoices, rate confirmations, lumper
                receipts, and detention evidence before submitting billing
                packets.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                className="rounded-xl bg-emerald-400 text-slate-950 hover:bg-emerald-300"
              >
                <Link href="/upload">
                  <UploadCloud className="mr-2 h-4 w-4" />
                  Review new packet
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                <Link href="/upload">
                  Generate report
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              title="Ready to bill"
              value={readyCount}
              caption="Clean packets"
              icon={<CheckCircle2 className="h-5 w-5 text-emerald-300" />}
              accent="emerald"
            />

            <MetricCard
              title="Needs review"
              value={needsReviewCount}
              caption="Manual check needed"
              icon={<FileText className="h-5 w-5 text-amber-300" />}
              accent="amber"
            />

            <MetricCard
              title="Blocked"
              value={blockedCount}
              caption="Likely payment delay"
              icon={<AlertTriangle className="h-5 w-5 text-red-300" />}
              accent="red"
            />

            <MetricCard
              title="Revenue at risk"
              value={`USD ${revenueAtRisk.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
              caption="Blocked + review packets"
              icon={<Clock3 className="h-5 w-5 text-sky-300" />}
              accent="sky"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="space-y-6">
          <RecentReports />
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20 backdrop-blur">
            <h2 className="text-lg font-semibold">Workspace</h2>

            <p className="mt-1 text-sm text-slate-400">
              {organization?.name || "Your company"}
            </p>

            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Plan</span>
                <span className="font-medium capitalize text-white">
                  {organization?.plan || "free"}
                </span>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Monthly usage</span>
                  <span className="font-medium text-white">
                    {packetsUsed}/{packetLimit}
                  </span>
                </div>

                <div className="mt-2 h-2 rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-emerald-300 to-sky-300"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-6 shadow-2xl shadow-black/20">
            <h2 className="text-lg font-semibold text-emerald-50">
              What PODMatch checks
            </h2>

            <div className="mt-4 space-y-3">
              {[
                "Signed POD present",
                "Invoice matches rate confirmation",
                "Lumper receipt attached",
                "Detention backup included",
                "Accessorials supported",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                  <p className="text-sm text-emerald-50/90">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

function MetricCard({
  title,
  value,
  caption,
  icon,
  accent,
}: {
  title: string;
  value: string | number;
  caption: string;
  icon: ReactNode;
  accent: "emerald" | "amber" | "red" | "sky";
}) {
  const accentClasses = {
    emerald: "from-emerald-400/20 to-emerald-400/5 border-emerald-400/20",
    amber: "from-amber-400/20 to-amber-400/5 border-amber-400/20",
    red: "from-red-400/20 to-red-400/5 border-red-400/20",
    sky: "from-sky-400/20 to-sky-400/5 border-sky-400/20",
  };

  return (
    <div
      className={`rounded-3xl border bg-gradient-to-br p-5 shadow-2xl shadow-black/20 ${accentClasses[accent]}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-300">{title}</p>

        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
          {icon}
        </div>
      </div>

      <p className="mt-4 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-400">{caption}</p>
    </div>
  );
}