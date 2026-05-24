import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const bucketName = "shipment-documents";
const maxFileSize = 10 * 1024 * 1024;

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

  const requestedOrganizationId =
    formData.get("organizationId") || formData.get("workspaceId");

  const files = formData
    .getAll("files")
    .filter((item): item is File => item instanceof File);

  if (files.length === 0) {
    return NextResponse.json(
      { error: "No files were uploaded." },
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

  let organizationQuery = supabase
    .from("organization_members")
    .select("organization_id, role, organizations(id, name, plan)")
    .eq("user_id", user.id)
    .limit(1);

  if (requestedOrganizationId && typeof requestedOrganizationId === "string") {
    organizationQuery = supabase
      .from("organization_members")
      .select("organization_id, role, organizations(id, name, plan)")
      .eq("user_id", user.id)
      .eq("organization_id", requestedOrganizationId)
      .limit(1);
  }

  const { data: memberships, error: membershipError } = await organizationQuery;

  if (membershipError) {
    return NextResponse.json(
      { error: membershipError.message },
      { status: 500 }
    );
  }

  const membership = memberships?.[0];

  if (!membership) {
    return NextResponse.json(
      { error: "No organization found for this user." },
      { status: 404 }
    );
  }

  const organizationId = membership.organization_id;
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

  const uploadedDocuments = [];

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

    uploadedDocuments.push(document);
  }

  return NextResponse.json({
    packet,
    loadPacket: {
      id: packet.id,
      workspace_id: organizationId,
      organization_id: organizationId,
      reference_number: packet.load_number,
      load_number: packet.load_number,
      status: packet.status,
      created_at: packet.created_at,
    },
    documents: uploadedDocuments,
  });
}