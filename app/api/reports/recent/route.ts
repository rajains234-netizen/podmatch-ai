import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function formatLabel(value: string | null | undefined) {
  if (!value) return "Not calculated";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "You must be signed in to view recent reports." },
      { status: 401 }
    );
  }

  const { data: packets, error: packetsError } = await supabase
    .from("shipment_packets")
    .select(
      "id, load_number, status, created_at, readiness_score, payment_delay_risk"
    )
    .order("created_at", { ascending: false })
    .limit(20);

  if (packetsError) {
    return NextResponse.json(
      { error: packetsError.message },
      { status: 500 }
    );
  }

  const packetIds = packets?.map((packet) => packet.id) ?? [];

  const reportsByPacketId = new Map<string, {
    id: string;
    packet_id: string;
    readiness_score: number | null;
    status: string | null;
    payment_delay_risk: string | null;
    summary: string | null;
    created_at: string | null;
  }>();

  if (packetIds.length > 0) {
    const { data: reports, error: reportsError } = await supabase
      .from("analysis_reports")
      .select(
        "id, packet_id, readiness_score, status, payment_delay_risk, summary, created_at"
      )
      .in("packet_id", packetIds)
      .order("created_at", { ascending: false });

    if (reportsError) {
      return NextResponse.json(
        { error: reportsError.message },
        { status: 500 }
      );
    }

    for (const report of reports ?? []) {
      if (!reportsByPacketId.has(report.packet_id)) {
        reportsByPacketId.set(report.packet_id, report);
      }
    }
  }

  const recentReports =
    packets?.map((packet) => {
      const report = reportsByPacketId.get(packet.id);

      const status = report?.status ?? packet.status ?? "unknown";
      const readinessScore =
        report?.readiness_score ?? packet.readiness_score ?? 0;
      const paymentDelayRisk =
        report?.payment_delay_risk ?? packet.payment_delay_risk ?? null;

      return {
        packetId: packet.id,
        reportId: report?.id ?? null,
        loadNumber: packet.load_number ?? "Not detected",
        status: formatLabel(status),
        rawStatus: status,
        readinessScore,
        paymentDelayRisk: formatLabel(paymentDelayRisk),
        summary: report?.summary ?? null,
        createdAt: packet.created_at,
        reportCreatedAt: report?.created_at ?? null,
        href: `/report?packetId=${packet.id}`,
      };
    }) ?? [];

  return NextResponse.json({
    reports: recentReports,
  });
}