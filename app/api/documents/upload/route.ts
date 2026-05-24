import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const bucketName = "freight-documents";
const maxFileSize = 10 * 1024 * 1024;

function sanitizeFileName(fileName: string) {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 140);
}

function inferDocumentType(fileName: string) {
  const normalized = fileName.toLowerCase();

  if (normalized.includes("pod") || normalized.includes("proof")) {
    return "pod";
  }

  if (normalized.includes("bol") || normalized.includes("bill-of-lading")) {
    return "bol";
  }

  if (normalized.includes("invoice")) {
    return "invoice";
  }

  if (normalized.includes("rate") || normalized.includes("confirmation")) {
    return "rate_confirmation";
  }

  if (normalized.includes("receipt") || normalized.includes("lumper")) {
    return "receipt";
  }

  if (normalized.includes("detention")) {
    return "detention_evidence";
  }

  return "unknown";
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
  const workspaceId = formData.get("workspaceId");

  if (!workspaceId || typeof workspaceId !== "string") {
    return NextResponse.json(
      { error: "Missing workspaceId." },
      { status: 400 }
    );
  }

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
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, owner_id")
    .eq("id", workspaceId)
    .eq("owner_id", user.id)
    .single();

  if (workspaceError || !workspace) {
    return NextResponse.json(
      { error: "Workspace not found for this user." },
      { status: 404 }
    );
  }

  const { data: loadPacket, error: loadPacketError } = await supabase
    .from("load_packets")
    .insert({
      workspace_id: workspace.id,
      created_by: user.id,
      reference_number: `PM-${Date.now()}`,
      status: "uploaded",
    })
    .select("id, workspace_id, reference_number, status, created_at")
    .single();

  if (loadPacketError || !loadPacket) {
    return NextResponse.json(
      { error: loadPacketError?.message ?? "Failed to create load packet." },
      { status: 500 }
    );
  }

  const uploadedDocuments = [];

  for (const file of files) {
    const safeFileName = sanitizeFileName(file.name);
    const storagePath = `${user.id}/${workspace.id}/${loadPacket.id}/${Date.now()}-${safeFileName}`;

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

    const { data: document, error: documentError } = await supabase
      .from("documents")
      .insert({
        workspace_id: workspace.id,
        load_packet_id: loadPacket.id,
        uploaded_by: user.id,
        file_name: file.name,
        file_type: file.type || null,
        file_size: file.size,
        storage_bucket: bucketName,
        storage_path: storagePath,
        document_type: inferDocumentType(file.name),
        processing_status: "uploaded",
      })
      .select(
        "id, file_name, file_type, file_size, storage_path, document_type, processing_status, created_at"
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
    loadPacket,
    documents: uploadedDocuments,
  });
}