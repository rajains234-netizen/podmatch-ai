import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const bucketName = "shipment-documents";
const maxFileSize = 10 * 1024 * 1024;
const maxFilesPerPacket = 10;

const allowedMimeTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

type DocumentType =
  | "unknown"
  | "rate_confirmation"
  | "invoice"
  | "bol"
  | "pod"
  | "lumper_receipt"
  | "detention_evidence"
  | "accessorial_backup"
  | "remittance"
  | "other";

type PacketStatus =
  | "draft"
  | "uploaded"
  | "analyzing"
  | "ready_to_bill"
  | "needs_review"
  | "blocked"
  | "failed";

type BlockerSeverity = "low" | "medium" | "high" | "critical";

type WorkspaceRow = {
  organization_id: string;
  organization_name: string;
  user_role: string;
  organization_plan: string;
  monthly_packet_limit: number;
  packets_used_this_month: number;
};

type UploadedDocument = {
  id: string;
  packet_id: string;
  organization_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  document_type: DocumentType;
  confidence: number | null;
  created_at: string;
};

type BillingBlockerInput = {
  severity: BlockerSeverity;
  title: string;
  description: string;
  recommended_fix: string;
  amount_at_risk?: number;
};

function sanitizeFileName(fileName: string) {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 140);
}

function inferDocumentType(fileName: string): DocumentType {
  const normalized = fileName.toLowerCase();

  if (
    normalized.includes("rate") ||
    normalized.includes("confirmation") ||
    normalized.includes("ratecon") ||
    normalized.includes("rate-con")
  ) {
    return "rate_confirmation";
  }

  if (normalized.includes("invoice") || normalized.includes("inv")) {
    return "invoice";
  }

  if (
    normalized.includes("bol") ||
    normalized.includes("bill-of-lading") ||
    normalized.includes("billoflading")
  ) {
    return "bol";
  }

  if (
    normalized.includes("pod") ||
    normalized.includes("proof") ||
    normalized.includes("delivery")
  ) {
    return "pod";
  }

  if (normalized.includes("lumper") || normalized.includes("receipt")) {
    return "lumper_receipt";
  }

  if (normalized.includes("detention")) {
    return "detention_evidence";
  }

  if (
    normalized.includes("accessorial") ||
    normalized.includes("layover") ||
    normalized.includes("tonu")
  ) {
    return "accessorial_backup";
  }

  if (
    normalized.includes("remittance") ||
    normalized.includes("payment") ||
    normalized.includes("short-pay") ||
    normalized.includes("shortpay")
  ) {
    return "remittance";
  }

  return "unknown";
}

function createLoadNumber() {
  return `PM-${Date.now()}`;
}

function hasDocument(
  documents: UploadedDocument[],
  documentType: DocumentType
) {
  return documents.some((document) => document.document_type === documentType);
}

function packetMentions(documents: UploadedDocument[], keywords: string[]) {
  return documents.some((document) => {
    const fileName = document.file_name.toLowerCase();
    return keywords.some((keyword) => fileName.includes(keyword));
  });
}

function generateReadinessReport(documents: UploadedDocument[]) {
  const blockers: BillingBlockerInput[] = [];

  let score = 0;

  const hasPod = hasDocument(documents, "pod");
  const hasInvoice = hasDocument(documents, "invoice");
  const hasRateConfirmation = hasDocument(documents, "rate_confirmation");
  const hasBol = hasDocument(documents, "bol");

  const lumperMentioned = packetMentions(documents, ["lumper"]);
  const detentionMentioned = packetMentions(documents, ["detention"]);

  const hasLumperReceipt = hasDocument(documents, "lumper_receipt");
  const hasDetentionEvidence = hasDocument(documents, "detention_evidence");

  if (hasPod) {
    score += 30;
  } else {
    blockers.push({
      severity: "critical",
      title: "Signed POD missing",
      description:
        "No proof of delivery document was detected in this packet. Billing may be delayed or rejected without a signed POD.",
      recommended_fix:
        "Upload the signed POD or delivery confirmation before submitting billing.",
    });
  }

  if (hasInvoice) {
    score += 20;
  } else {
    blockers.push({
      severity: "high",
      title: "Invoice missing",
      description:
        "No invoice document was detected. The billing packet is incomplete.",
      recommended_fix:
        "Upload the customer or broker invoice for this load.",
    });
  }

  if (hasRateConfirmation) {
    score += 20;
  } else {
    blockers.push({
      severity: "high",
      title: "Rate confirmation missing",
      description:
        "No rate confirmation was detected. Invoice totals cannot be validated against the agreed rate.",
      recommended_fix:
        "Upload the signed or accepted rate confirmation.",
    });
  }

  if (hasBol) {
    score += 10;
  } else {
    blockers.push({
      severity: "medium",
      title: "BOL missing",
      description:
        "No bill of lading was detected. Some brokers or factoring companies may request it before payment.",
      recommended_fix:
        "Upload the BOL if it is required by the broker, customer, or factoring company.",
    });
  }

  if (lumperMentioned) {
    if (hasLumperReceipt) {
      score += 10;
    } else {
      blockers.push({
        severity: "high",
        title: "Lumper receipt missing",
        description:
          "A lumper charge appears to be involved, but no lumper receipt was detected.",
        recommended_fix:
          "Upload the lumper receipt or broker approval for the lumper charge.",
      });
    }
  } else {
    score += 5;
  }

  if (detentionMentioned) {
    if (hasDetentionEvidence) {
      score += 10;
    } else {
      blockers.push({
        severity: "medium",
        title: "Detention evidence missing",
        description:
          "Detention appears to be involved, but no supporting evidence was detected.",
        recommended_fix:
          "Upload arrival/departure timestamps, appointment proof, or broker detention approval.",
      });
    }
  } else {
    score += 5;
  }

  score = Math.min(score, 100);

  let status: PacketStatus = "blocked";
  let paymentDelayRisk: BlockerSeverity = "critical";

  if (score >= 90 && blockers.length === 0) {
    status = "ready_to_bill";
    paymentDelayRisk = "low";
  } else if (score >= 60) {
    status = "needs_review";
    paymentDelayRisk = blockers.some(
      (blocker) => blocker.severity === "critical"
    )
      ? "high"
      : "medium";
  } else {
    status = "blocked";
    paymentDelayRisk = "critical";
  }

  const summary =
    status === "ready_to_bill"
      ? "This packet appears ready to bill based on the documents detected."
      : `This packet has ${blockers.length} potential billing blocker${
          blockers.length === 1 ? "" : "s"
        } that should be reviewed before submission.`;

  const fixRecommendations = blockers.map((blocker) => ({
    title: blocker.title,
    recommended_fix: blocker.recommended_fix,
    severity: blocker.severity,
  }));

  const extractedValues = {
    detected_documents: documents.map((document) => ({
      id: document.id,
      file_name: document.file_name,
      document_type: document.document_type,
    })),
    checks: {
      has_pod: hasPod,
      has_invoice: hasInvoice,
      has_rate_confirmation: hasRateConfirmation,
      has_bol: hasBol,
      lumper_mentioned: lumperMentioned,
      has_lumper_receipt: hasLumperReceipt,
      detention_mentioned: detentionMentioned,
      has_detention_evidence: hasDetentionEvidence,
    },
  };

  return {
    score,
    status,
    paymentDelayRisk,
    summary,
    blockers,
    fixRecommendations,
    extractedValues,
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();

  const files = formData
    .getAll("files")
    .filter((item): item is File => item instanceof File);

  if (files.length === 0) {
    return NextResponse.json(
      { error: "No files were uploaded." },
      { status: 400 }
    );
  }

  if (files.length > maxFilesPerPacket) {
    return NextResponse.json(
      { error: `You can upload up to ${maxFilesPerPacket} files per packet.` },
      { status: 400 }
    );
  }

  for (const file of files) {
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { error: `${file.name} is larger than 10 MB.` },
        { status: 400 }
      );
    }

    if (file.type && !allowedMimeTypes.has(file.type)) {
      return NextResponse.json(
        { error: `${file.name} has an unsupported file type.` },
        { status: 400 }
      );
    }
  }

  const { data: workspaceData, error: workspaceError } = await supabase.rpc(
    "ensure_user_workspace"
  );

  if (workspaceError) {
    return NextResponse.json(
      { error: workspaceError.message },
      { status: 500 }
    );
  }

  const workspace = Array.isArray(workspaceData)
    ? (workspaceData[0] as WorkspaceRow | undefined)
    : undefined;

  if (!workspace?.organization_id) {
    return NextResponse.json(
      { error: "Unable to create or load organization for this user." },
      { status: 500 }
    );
  }

  if (workspace.packets_used_this_month >= workspace.monthly_packet_limit) {
    return NextResponse.json(
      {
        error:
          "Monthly packet review limit reached. Upgrade your plan to review more packets.",
      },
      { status: 402 }
    );
  }

  const organizationId = workspace.organization_id;
  const loadNumber = createLoadNumber();

  const { data: packet, error: packetError } = await supabase
    .from("shipment_packets")
    .insert({
      organization_id: organizationId,
      created_by: user.id,
      load_number: loadNumber,
      status: "uploaded",
    })
    .select(
      "id, organization_id, load_number, status, created_at, readiness_score, payment_delay_risk"
    )
    .single();

  if (packetError || !packet) {
    return NextResponse.json(
      { error: packetError?.message ?? "Failed to create shipment packet." },
      { status: 500 }
    );
  }

  const uploadedDocuments: UploadedDocument[] = [];

  for (const file of files) {
    const safeFileName = sanitizeFileName(file.name);
    const storagePath = `${organizationId}/${packet.id}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const documentType = inferDocumentType(file.name);

    const { data: document, error: documentError } = await supabase
      .from("shipment_documents")
      .insert({
        packet_id: packet.id,
        organization_id: organizationId,
        file_name: file.name,
        file_path: storagePath,
        file_size: file.size,
        mime_type: file.type || null,
        document_type: documentType,
      })
      .select(
        "id, packet_id, organization_id, file_name, file_path, file_size, mime_type, document_type, confidence, created_at"
      )
      .single();

    if (documentError || !document) {
      return NextResponse.json(
        { error: documentError?.message ?? "Failed to save document row." },
        { status: 500 }
      );
    }

    uploadedDocuments.push(document as UploadedDocument);
  }

  const readinessReport = generateReadinessReport(uploadedDocuments);

  const { data: report, error: reportError } = await supabase
    .from("analysis_reports")
    .insert({
      packet_id: packet.id,
      organization_id: organizationId,
      readiness_score: readinessReport.score,
      status: readinessReport.status,
      payment_delay_risk: readinessReport.paymentDelayRisk,
      summary: readinessReport.summary,
      fix_recommendations: readinessReport.fixRecommendations,
      extracted_values: readinessReport.extractedValues,
      model_name: "rules-v1",
      model_output: {
        generated_by: "rules-v1",
        blocker_count: readinessReport.blockers.length,
      },
    })
    .select("id, readiness_score, status, payment_delay_risk, summary")
    .single();

  if (reportError || !report) {
    return NextResponse.json(
      { error: reportError?.message ?? "Failed to save analysis report." },
      { status: 500 }
    );
  }

  if (readinessReport.blockers.length > 0) {
    const { error: blockersError } = await supabase
      .from("billing_blockers")
      .insert(
        readinessReport.blockers.map((blocker) => ({
          report_id: report.id,
          packet_id: packet.id,
          organization_id: organizationId,
          severity: blocker.severity,
          title: blocker.title,
          description: blocker.description,
          recommended_fix: blocker.recommended_fix,
          amount_at_risk: blocker.amount_at_risk || 0,
        }))
      );

    if (blockersError) {
      return NextResponse.json(
        { error: blockersError.message },
        { status: 500 }
      );
    }
  }

  const { error: packetUpdateError } = await supabase
    .from("shipment_packets")
    .update({
      status: readinessReport.status,
      readiness_score: readinessReport.score,
      payment_delay_risk: readinessReport.paymentDelayRisk,
      revenue_at_risk:
        readinessReport.status === "ready_to_bill" ? 0 : null,
    })
    .eq("id", packet.id)
    .eq("organization_id", organizationId);

  if (packetUpdateError) {
    return NextResponse.json(
      { error: packetUpdateError.message },
      { status: 500 }
    );
  }

  await supabase
    .from("organizations")
    .update({
      packets_used_this_month: workspace.packets_used_this_month + 1,
    })
    .eq("id", organizationId);

  return NextResponse.json({
    packet: {
      ...packet,
      status: readinessReport.status,
      readiness_score: readinessReport.score,
      payment_delay_risk: readinessReport.paymentDelayRisk,
    },
    report,
    loadPacket: {
      id: packet.id,
      workspace_id: organizationId,
      organization_id: organizationId,
      reference_number: packet.load_number,
      load_number: packet.load_number,
      status: readinessReport.status,
      readiness_score: readinessReport.score,
      payment_delay_risk: readinessReport.paymentDelayRisk,
      created_at: packet.created_at,
    },
    documents: uploadedDocuments,
  });
}