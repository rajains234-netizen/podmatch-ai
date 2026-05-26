import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";



type RouteContext = {
  params: Promise<{
    packetId: string;
  }>;
};



function humanizeDocumentType(type: string | null | undefined) {
  if (!type) return "Document";

  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatLabel(value: string | null | undefined) {
  if (!value) return "Not calculated";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getDocumentStatus() {
  return "Reviewed";
}

export async function GET(_request: Request, context: RouteContext) {
  const { packetId } = await context.params;

  if (!packetId) {
    return NextResponse.json(
      { error: "Missing packet id." },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "You must be signed in to view this report." },
      { status: 401 }
    );
  }

  const { data: packet, error: packetError } = await supabase
    .from("shipment_packets")
    .select(
      "id, organization_id, load_number, status, created_at, readiness_score, payment_delay_risk"
    )
    .eq("id", packetId)
    .single();

  if (packetError || !packet) {
    return NextResponse.json(
      { error: packetError?.message ?? "Report packet not found." },
      { status: 404 }
    );
  }

  // Access is currently enforced by Supabase auth/RLS.
  // If the packet query above returns data, the signed-in user can view it.

  const { data: report, error: reportError } = await supabase
    .from("analysis_reports")
    .select(
      "id, packet_id, organization_id, readiness_score, status, payment_delay_risk, summary, created_at"
    )
    .eq("packet_id", packetId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (reportError) {
    return NextResponse.json(
      { error: reportError.message },
      { status: 500 }
    );
  }

  const { data: documents, error: documentsError } = await supabase
    .from("shipment_documents")
    .select(
      "id, packet_id, file_name, file_size, mime_type, document_type, confidence, created_at"
    )
    .eq("packet_id", packetId)
    .order("created_at", { ascending: true });

  if (documentsError) {
    return NextResponse.json(
      { error: documentsError.message },
      { status: 500 }
    );
  }

  const { data: blockers, error: blockersError } = await supabase
    .from("billing_blockers")
    .select(
      "id, packet_id, severity, description, recommended_fix, created_at"
    )
    .eq("packet_id", packetId)
    .order("created_at", { ascending: true });

  if (blockersError) {
    return NextResponse.json(
      { error: blockersError.message },
      { status: 500 }
    );
  }

  const readinessScore =
    report?.readiness_score ?? packet.readiness_score ?? 0;

  const reportStatus =
    report?.status ??
    packet.status ??
    (blockers && blockers.length > 0 ? "blocked" : "ready");

  const isBlocked =
    reportStatus === "blocked" ||
    reportStatus === "needs_review" ||
    Boolean(blockers && blockers.length > 0);

  const highPriorityCount =
  blockers?.filter(
    (blocker) => blocker.severity?.toLowerCase() === "high"
  ).length ?? 0;

  const normalizedDocuments =
    documents?.map((document) => ({
      id: document.id,
      name: document.file_name,
      type: humanizeDocumentType(document.document_type),
      status: getDocumentStatus(),
      detail: document.document_type
        ? `${humanizeDocumentType(document.document_type)} detected${
            typeof document.confidence === "number"
              ? ` with ${Math.round(document.confidence * 100)}% confidence`
              : ""
          }`
        : "Uploaded and reviewed",
      confidence: document.confidence,
      fileSize: document.file_size,
      mimeType: document.mime_type,
      createdAt: document.created_at,
    })) ?? [];

  const normalizedBlockers =
  blockers?.map((blocker) => ({
    id: blocker.id,
    title: "Billing blocker",
    severity: formatLabel(blocker.severity),
    description:
      blocker.description ?? "This packet requires review before billing.",
    recommendation:
      blocker.recommended_fix ??
      "Review the uploaded documents and resolve this issue before submitting.",
    createdAt: blocker.created_at,
  })) ?? [];

  const nextActions = isBlocked
    ? [
        "Resolve the billing blockers listed below.",
        "Upload any missing or corrected support documents.",
        "Re-run PODMatch review after updates are complete.",
        "Submit only after the packet is marked ready.",
      ]
    : [
        "Packet is ready for billing submission.",
        "Send invoice package to broker or factoring partner.",
        "Archive matched documents with the load record.",
        "Monitor payment status after submission.",
      ];

  return NextResponse.json({
    packet: {
      id: packet.id,
      organizationId: packet.organization_id,
      loadNumber: packet.load_number,
      status: packet.status,
      createdAt: packet.created_at,
      readinessScore,
      paymentDelayRisk:
        report?.payment_delay_risk ?? packet.payment_delay_risk ?? null,
    },
    report: {
      id: report?.id ?? null,
      status: reportStatus,
      readinessScore,
      paymentDelayRisk:
        report?.payment_delay_risk ?? packet.payment_delay_risk ?? null,
      summary: report?.summary ?? null,
      createdAt: report?.created_at ?? packet.created_at,
      isBlocked,
      finalStatus: isBlocked ? "Blocked" : "Ready",
    },
    loadSummary: [
      { label: "Load number", value: packet.load_number ?? "Not detected" },
      { label: "Packet ID", value: packet.id },
      {
        label: "Created",
        value: packet.created_at
          ? new Date(packet.created_at).toLocaleString("en-US")
          : "Unknown",
      },
      {
  label: "Payment delay risk",
  value: formatLabel(
    report?.payment_delay_risk ?? packet.payment_delay_risk ?? null
  ),
},
    ],
    extractedValues: [
      {
        label: "Readiness score",
        value: `${readinessScore}%`,
      },
      {
        label: "Documents reviewed",
        value: String(normalizedDocuments.length),
      },
      {
        label: "Billing blockers",
        value: String(normalizedBlockers.length),
      },
      {
        label: "High priority blockers",
        value: String(highPriorityCount),
      },
    ],
    documents: normalizedDocuments,
    blockers: normalizedBlockers,
    nextActions,
    totals: {
      documentsReviewed: normalizedDocuments.length,
      billingBlockers: normalizedBlockers.length,
      highPriority: highPriorityCount,
    },
  });
}