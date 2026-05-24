import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

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
    .select("id, load_number, broker_name, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

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

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              PODMatch AI Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              Welcome back
            </h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Review freight billing packets, catch missing documents, and see
              what may delay payment before you submit invoices.
            </p>
          </div>

          <Button asChild>
            <Link href="/upload">
              <UploadCloud className="mr-2 h-4 w-4" />
              Review new packet
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Ready to bill"
          value={readyCount}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
        />
        <MetricCard
          title="Needs review"
          value={needsReviewCount}
          icon={<FileText className="h-5 w-5 text-amber-600" />}
        />
        <MetricCard
          title="Blocked"
          value={blockedCount}
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
        />
        <MetricCard
          title="Plan"
          value={organization?.plan || "free"}
          icon={<ShieldCheck className="h-5 w-5 text-blue-600" />}
        />
      </section>

      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Recent packets</h2>
            <p className="text-sm text-muted-foreground">
              Your latest freight billing reviews.
            </p>
          </div>
        </div>

        <div className="mt-6 divide-y">
          {shipmentPackets.length > 0 ? (
            shipmentPackets.map((packet) => (
              <div
                key={packet.id}
                className="flex flex-col gap-2 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {packet.load_number || "Untitled packet"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {packet.broker_name || "No broker"} · {packet.status}
                  </p>
                </div>
                <Button variant="outline" asChild>
                  <Link href={`/report?packet=${packet.id}`}>View report</Link>
                </Button>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <p className="font-medium">No packets reviewed yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload your first POD, invoice, BOL, and rate confirmation to
                generate a billing readiness report.
              </p>
              <Button className="mt-4" asChild>
                <Link href="/upload">Start first review</Link>
              </Button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{title}</p>
        {icon}
      </div>
      <p className="mt-3 text-2xl font-bold capitalize">{value}</p>
    </div>
  );
}