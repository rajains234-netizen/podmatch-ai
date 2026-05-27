import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    packetId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { packetId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: packet, error: packetError } = await supabase
    .from("shipment_packets")
    .select(
      "id, organization_id, created_by, load_number, status, readiness_score, payment_delay_risk, processing_status, processing_error, created_at"
    )
    .eq("id", packetId)
    .single();

  if (packetError || !packet) {
    return NextResponse.json(
      { error: packetError?.message ?? "Packet not found" },
      { status: 404 }
    );
  }

  if (packet.created_by !== user.id) {
    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .eq("organization_id", packet.organization_id)
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json(
        { error: membershipError.message },
        { status: 500 }
      );
    }

    if (!membership) {
      return NextResponse.json(
        {
          error: "Forbidden",
          details:
            "Current user is not the packet creator or a member of this packet's organization.",
          packet_organization_id: packet.organization_id,
        },
        { status: 403 }
      );
    }
  }

  const { data: report } = await supabase
    .from("analysis_reports")
    .select("id")
    .eq("packet_id", packet.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    packet_id: packet.id,
    load_number: packet.load_number,
    status: packet.status,
    readiness_score: packet.readiness_score,
    payment_delay_risk: packet.payment_delay_risk,
    processing_status: packet.processing_status,
    processing_error: packet.processing_error,
    report_id: report?.id ?? null,
    created_at: packet.created_at,
  });
}