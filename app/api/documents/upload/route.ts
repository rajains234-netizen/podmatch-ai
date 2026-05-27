import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PDFParse } from "pdf-parse";
export const runtime = "nodejs";

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

type ParsedDocumentValues = {
  invoice_total?: number;
  rate_total?: number;
  lumper_amount?: number;
  detention_amount?: number;
  accessorial_amounts?: number[];
  possible_load_numbers?: string[];
  has_signature_language?: boolean;
  has_delivery_language?: boolean;
  has_lumper_language?: boolean;
  has_detention_language?: boolean;
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
  extracted_text?: string;
  parsed_values?: ParsedDocumentValues;
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

async function extractDocumentTextFromBuffer(
  buffer: Buffer,
  mimeType: string,
  fileName: string
) {
  const normalizedMimeType = mimeType.toLowerCase();
  const normalizedFileName = fileName.toLowerCase();

  const isPdf =
    normalizedMimeType === "application/pdf" ||
    normalizedFileName.endsWith(".pdf");

  const isText =
    normalizedMimeType === "text/plain" ||
    normalizedFileName.endsWith(".txt");

  if (isPdf) {
    const parser = new PDFParse({ data: buffer });

    try {
      const parsed = await parser.getText();
      return normalizeExtractedText(parsed.text);
    } finally {
      await parser.destroy();
    }
  }

  if (isText) {
    return normalizeExtractedText(buffer.toString("utf-8"));
  }

  return "";
}

function normalizeExtractedText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function getSearchableDocumentText(document: Pick<UploadedDocument, "file_name" | "extracted_text">) {
  return [document.file_name, document.extracted_text ?? ""]
    .join(" ")
    .toLowerCase();
}

function parseMoneyAmount(value: string) {
  const cleaned = value.replace(/usd|us\$|\$|,/gi, "").trim();
  const amount = Number.parseFloat(cleaned);

  return Number.isFinite(amount) ? amount : undefined;
}

function extractMoneyAmounts(text: string) {
  const matches =
    text.match(
      /(?:USD|US\$|\$)?\s*\d{1,3}(?:,\d{3})*(?:\.\d{2})|(?:USD|US\$|\$)?\s*\d+(?:\.\d{2})/gi
    ) ?? [];

  return matches
    .map(parseMoneyAmount)
    .filter((amount): amount is number => typeof amount === "number" && amount > 0);
}

function findAmountNearKeywords(text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  const amounts: number[] = [];

  for (const keyword of keywords) {
    const keywordIndex = normalized.indexOf(keyword);

    if (keywordIndex === -1) {
      continue;
    }

    const nearbyText = normalized.slice(
      Math.max(0, keywordIndex - 120),
      Math.min(normalized.length, keywordIndex + 220)
    );

    amounts.push(...extractMoneyAmounts(nearbyText));
  }

  return amounts.length > 0 ? Math.max(...amounts) : undefined;
}

function extractPossibleLoadNumbers(text: string) {
  const matches =
    text.match(
      /\b(?:load|shipment|pro|trip|reference|ref)[\s#:.-]*([a-z0-9-]{4,})\b/gi
    ) ?? [];

  return Array.from(
    new Set(
      matches
        .map((match) => match.replace(/^(load|shipment|pro|trip|reference|ref)[\s#:.-]*/i, ""))
        .map((match) => match.trim())
        .filter(Boolean)
    )
  ).slice(0, 5);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findLabeledAmount(text: string, labels: string[]) {
  for (const label of labels) {
    const pattern = new RegExp(
      `${escapeRegex(label)}[^\\d$]{0,80}((?:USD|US\\$|\\$)?\\s*\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})|(?:USD|US\\$|\\$)?\\s*\\d+(?:\\.\\d{2}))`,
      "i"
    );

    const match = text.match(pattern);
    const amount = match?.[1] ? parseMoneyAmount(match[1]) : undefined;

    if (typeof amount === "number") {
      return amount;
    }
  }

  return undefined;
}

function parseDocumentValues(fileName: string, extractedText: string): ParsedDocumentValues {
  const searchableText = [fileName, extractedText].join(" ").toLowerCase();

  if (!extractedText.trim()) {
  return {
    accessorial_amounts: [],
    possible_load_numbers: [],
  };
}

  const invoiceTotal =
    findLabeledAmount(searchableText, [
      "invoice total",
      "amount due",
      "total due",
      "balance due",
      "grand total",
    ]) ??
    findAmountNearKeywords(searchableText, [
      "invoice total",
      "amount due",
      "total due",
      "balance due",
      "grand total",
    ]);

  const rateTotal =
    findLabeledAmount(searchableText, [
      "total rate",
      "carrier pay",
      "agreed rate",
      "total charges",
      "rate total",
    ]) ??
    findAmountNearKeywords(searchableText, [
      "total rate",
      "carrier pay",
      "carrier pay summary",
      "agreed rate",
      "total charges",
      "line haul",
      "linehaul",
      "rate",
    ]);

  const lumperAmount =
    findLabeledAmount(searchableText, [
      "lumper amount",
      "lumper reimbursement",
      "lumper",
      "unloading fee",
      "unload fee",
      "warehouse fee",
    ]) ??
    findAmountNearKeywords(searchableText, [
      "lumper",
      "unloading",
      "unload",
      "warehouse fee",
    ]);

  const detentionAmount =
    findLabeledAmount(searchableText, [
      "detention pay approved",
      "detention approved",
      "detention amount",
      "detention",
      "waiting time",
      "wait time",
    ]) ??
    findAmountNearKeywords(searchableText, [
      "detention",
      "detention pay",
      "waiting time",
      "wait time",
    ]);

  const accessorialAmounts = [
    lumperAmount,
    detentionAmount,
    findAmountNearKeywords(searchableText, [
      "layover",
      "tonu",
      "truck ordered not used",
      "accessorial",
    ]),
  ].filter((amount): amount is number => typeof amount === "number");

  return {
    invoice_total: invoiceTotal,
    rate_total: rateTotal,
    lumper_amount: lumperAmount,
    detention_amount: detentionAmount,
    accessorial_amounts: accessorialAmounts,
    possible_load_numbers: extractPossibleLoadNumbers(searchableText),
    has_signature_language:
      (
        searchableText.includes("signed") ||
        searchableText.includes("signature") ||
        searchableText.includes("received by")
      ) &&
      !searchableText.includes("signature: missing") &&
      !searchableText.includes("signature missing") &&
      !searchableText.includes("no signed proof") &&
      !searchableText.includes("not confirmed by consignee signature") &&
      !searchableText.includes("unsigned"),
    has_delivery_language:
      searchableText.includes("delivered") ||
      searchableText.includes("proof of delivery") ||
      searchableText.includes("delivery receipt") ||
      searchableText.includes("consignee"),
    has_lumper_language:
      searchableText.includes("lumper") ||
      searchableText.includes("unloading") ||
      searchableText.includes("unload fee"),
    has_detention_language:
      searchableText.includes("detention") ||
      searchableText.includes("waiting time") ||
      searchableText.includes("arrival") ||
      searchableText.includes("departure"),
  };
}

function detectDocumentType(fileName: string, extractedText: string): {
  documentType: DocumentType;
  confidence: number;
} 

{
  const normalized = [fileName, extractedText].join(" ").toLowerCase();

  const signals: Record<DocumentType, string[]> = {
    unknown: [],
    rate_confirmation: [
      "rate confirmation",
      "carrier rate confirmation",
      "load confirmation",
      "agreed rate",
      "carrier pay",
      "line haul",
      "linehaul",
    ],
    invoice: [
      "invoice",
      "invoice number",
      "amount due",
      "balance due",
      "remit to",
      "bill to",
      "total due",
    ],
    bol: [
      "bill of lading",
      "bol",
      "shipper",
      "consignee",
    ],
    pod: [
      "proof of delivery",
      "pod",
      "delivery receipt",
      "delivered",
      "received by",
      "signature",
      "signed by",
    ],
    lumper_receipt: [
      "lumper",
      "unloading receipt",
      "unload receipt",
      "warehouse fee",
    ],
    detention_evidence: [
      "detention",
      "arrival time",
      "departure time",
      "waiting time",
      "appointment time",
    ],
    accessorial_backup: [
      "accessorial",
      "layover",
      "tonu",
      "truck ordered not used",
      "stop off",
    ],
    remittance: [
      "remittance",
      "payment",
      "short pay",
      "short-pay",
      "paid amount",
    ],
    other: [],
  };

  let bestType = inferDocumentType(fileName);
  let bestScore = bestType === "unknown" ? 0 : 1;

  for (const [documentType, keywords] of Object.entries(signals) as [DocumentType, string[]][]) {
    const score = keywords.reduce(
      (count, keyword) => count + (normalized.includes(keyword) ? 1 : 0),
      0
    );

    if (score > bestScore) {
      bestType = documentType;
      bestScore = score;
    }
  }

  const confidence = Math.min(0.95, Math.max(0.35, bestScore / 5));

  return {
    documentType: bestType,
    confidence,
  };
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

function hasSignedPod(documents: UploadedDocument[]) {
  return documents.some((document) => {
    if (document.document_type !== "pod") {
      return false;
    }

    const searchableText = getSearchableDocumentText(document);

    const hasPositiveSignatureSignal =
      document.parsed_values?.has_signature_language === true ||
      searchableText.includes("received by") ||
      searchableText.includes("signed by") ||
      searchableText.includes("signature:");

    const hasNegativeSignatureSignal =
      searchableText.includes("signature: missing") ||
      searchableText.includes("signature missing") ||
      searchableText.includes("no signed proof") ||
      searchableText.includes("not confirmed by consignee signature") ||
      searchableText.includes("unsigned");

    return hasPositiveSignatureSignal && !hasNegativeSignatureSignal;
  });
}

function packetMentions(documents: UploadedDocument[], keywords: string[]) {
  return documents.some((document) => {
    const searchableText = getSearchableDocumentText(document);
    return keywords.some((keyword) => searchableText.includes(keyword));
  });
}

function getFirstParsedAmount(
  documents: UploadedDocument[],
  key: keyof ParsedDocumentValues,
  documentType?: DocumentType
) {
  const matchingDocuments = documentType
    ? documents.filter((document) => document.document_type === documentType)
    : documents;

  for (const document of matchingDocuments) {
    const value = document.parsed_values?.[key];

    if (typeof value === "number") {
      return value;
    }
  }

  return undefined;
}

function extractExactLineAmount(text: string, label: string) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const pattern = new RegExp(
    `${escapedLabel}\\s*[:#-]?\\s*(?:USD\\s*)?\\$?([\\d,]+(?:\\.\\d{2})?)`,
    "i"
  );

  const match = text.match(pattern);

  if (!match?.[1]) {
    return 0;
  }

  const value = Number.parseFloat(match[1].replace(/,/g, ""));

  return Number.isFinite(value) ? value : 0;
}

function sumAccessorialAmounts(documents: UploadedDocument[]) {
  return documents.reduce((total, document) => {
    const searchableText = [
      document.file_name ?? "",
      document.extracted_text ?? "",
    ].join(" ");

    const lumperAmount = extractExactLineAmount(searchableText, "Lumper");
    const detentionAmount = extractExactLineAmount(searchableText, "Detention");

    return total + lumperAmount + detentionAmount;
  }, 0);
}

function dollars(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function getParsedAmountsForKey(
  documents: UploadedDocument[],
  key: keyof ParsedDocumentValues,
  excludedDocumentTypes: DocumentType[] = []
) {
  return documents
    .filter((document) => !excludedDocumentTypes.includes(document.document_type))
    .map((document) => document.parsed_values?.[key])
    .filter((value): value is number => typeof value === "number" && value > 0);
}

function getAccessorialAmountAtRisk(
  documents: UploadedDocument[],
  key: "lumper_amount" | "detention_amount",
  keywords: string[]
) {
  const parsedAmounts = getParsedAmountsForKey(documents, key, [
    "rate_confirmation",
  ]);

  if (parsedAmounts.length > 0) {
    return Math.max(...parsedAmounts);
  }

  const candidateDocuments = documents.filter(
    (document) => document.document_type !== "rate_confirmation"
  );

  const candidateText = candidateDocuments
    .map((document) => getSearchableDocumentText(document))
    .join(" ");

  return findLabeledAmount(candidateText, keywords);
}

  function generateReadinessReport(documents: UploadedDocument[]) {
  const blockers: BillingBlockerInput[] = [];

  let score = 0;

  const hasPod = hasSignedPod(documents);
  const hasInvoice = hasDocument(documents, "invoice");
  const hasRateConfirmation = hasDocument(documents, "rate_confirmation");

  const lumperMentioned = packetMentions(documents, ["lumper", "unloading", "unload fee"]);
  const detentionMentioned = packetMentions(documents, [
    "detention",
    "waiting time",
    "arrival time",
    "departure time",
  ]);

  const hasLumperReceipt = hasDocument(documents, "lumper_receipt");
  const hasDetentionEvidence = hasDocument(documents, "detention_evidence");

  const invoiceTotal = getFirstParsedAmount(documents, "invoice_total", "invoice");
  const rateTotal = getFirstParsedAmount(documents, "rate_total", "rate_confirmation");

  const lumperAmount = getAccessorialAmountAtRisk(
  documents,
  "lumper_amount",
  [
    "lumper amount",
    "lumper reimbursement",
    "lumper",
    "unloading fee",
    "unload fee",
    "warehouse fee",
  ]
);

const detentionAmount = getAccessorialAmountAtRisk(
  documents,
  "detention_amount",
  [
    "detention pay approved",
    "detention approved",
    "detention amount",
    "detention",
    "waiting time",
    "wait time",
  ]
);

  const accessorialsAtRisk = sumAccessorialAmounts(documents);

  if (hasPod) {
    score += 30;
  } else {
    blockers.push({
  severity: "critical",
  title: "Signed POD missing",
  description:
    "No signed proof of delivery was detected in this packet. Billing may be delayed or rejected without a signed POD.",
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
      amount_at_risk: rateTotal,
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
      amount_at_risk: invoiceTotal,
    });
  }

  if (invoiceTotal && rateTotal) {
    const difference = Math.abs(invoiceTotal - rateTotal);

    if (difference <= 5) {
      score += 15;
    } else {
      blockers.push({
        severity: "high",
        title: "Invoice total does not match rate confirmation",
        description: `The invoice total appears to be ${dollars(
          invoiceTotal
        )}, while the rate confirmation appears to be ${dollars(
          rateTotal
        )}. This ${dollars(difference)} difference may cause a dispute or short payment.`,
        recommended_fix:
          "Review the invoice total against the rate confirmation and correct the amount or add broker approval for the difference.",
        amount_at_risk: difference,
      });
    }
  } else {
    score += 5;
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
        amount_at_risk: lumperAmount,
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
        amount_at_risk: detentionAmount,
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

  const totalRevenueAtRisk = blockers.reduce((total, blocker) => {
    return total + (blocker.amount_at_risk ?? 0);
  }, 0);

  const summary =
    status === "ready_to_bill"
      ? "This packet appears ready to bill based on the documents and billing values detected."
      : `This packet has ${blockers.length} potential billing blocker${
          blockers.length === 1 ? "" : "s"
        } that should be reviewed before submission.`;

  const fixRecommendations = blockers.map((blocker) => ({
    title: blocker.title,
    recommended_fix: blocker.recommended_fix,
    severity: blocker.severity,
    amount_at_risk: blocker.amount_at_risk,
  }));

  const extractedValues = {
    revenue_at_risk: totalRevenueAtRisk,
    invoice_total: invoiceTotal,
    rate_total: rateTotal,
    accessorials_at_risk: accessorialsAtRisk,
    detected_documents: documents.map((document) => ({
  id: document.id,
  file_name: document.file_name,
  document_type: document.document_type,
  confidence: document.confidence,
  parsed_values: document.parsed_values,
  extracted_text_length: document.extracted_text?.length ?? 0,
  extracted_text_preview: document.extracted_text?.slice(0, 1500) ?? "",
})),
    checks: {
      has_pod: hasPod,
      has_invoice: hasInvoice,
      has_rate_confirmation: hasRateConfirmation,
      invoice_rate_match:
        typeof invoiceTotal === "number" && typeof rateTotal === "number"
          ? Math.abs(invoiceTotal - rateTotal) <= 5
          : null,
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
    processing_status: "processing",
    processing_started_at: new Date().toISOString(),
    parser_provider: "pdfjs-dist",
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
    const mimeType = file.type || "application/octet-stream";

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    let extractedText = "";
    

try {
  extractedText = await extractDocumentTextFromBuffer(
    fileBuffer,
    mimeType,
    file.name
  );
} catch (error) {
  console.error("Document text extraction failed:", {
    fileName: file.name,
    mimeType,
    bufferSize: fileBuffer.length,
    error,
  });
}



    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    

   const documentDetection = detectDocumentType(file.name, extractedText);
      const parsedValues = parseDocumentValues(file.name, extractedText);







const { data: document, error: documentError } = await supabase
  .from("shipment_documents")
  .insert({
    packet_id: packet.id,
    organization_id: organizationId,
    file_name: file.name,
    file_path: storagePath,
    file_size: file.size,
    mime_type: file.type || null,
    document_type: documentDetection.documentType,
    confidence: documentDetection.confidence,
    extracted_text: extractedText,
  })
      .select(
       "id, packet_id, organization_id, file_name, file_path, file_size, mime_type, document_type, confidence, extracted_text, created_at"
      )
      .single();

    if (documentError || !document) {
      return NextResponse.json(
        { error: documentError?.message ?? "Failed to save document row." },
        { status: 500 }
      );
    }

    uploadedDocuments.push({
  ...(document as UploadedDocument),
  extracted_text: extractedText,
  parsed_values: parsedValues,
});
  }

  const readinessReport = generateReadinessReport(uploadedDocuments);

  const invoiceTotal =
  getFirstParsedAmount(uploadedDocuments, "invoice_total", "invoice") ?? 0;

  const accessorialTotal = sumAccessorialAmounts(uploadedDocuments);

  const riskyStatuses = new Set(["blocked", "needs_review", "failed"]);

  const normalizedStatus = readinessReport.status?.toLowerCase() ?? "needs_review";

  const revenueAtRisk = riskyStatuses.has(normalizedStatus)
  ? accessorialTotal || invoiceTotal
  : 0;
  

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
      model_name: "document-rules-v2",
      model_output: {
  generated_by: "document-rules-v2",
  blocker_count: readinessReport.blockers.length,
  document_count: uploadedDocuments.length,
  extraction_enabled: true,
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

  

  const { data: updatedPacket, error: packetUpdateError } = await supabase
  .from("shipment_packets")
  .update({
    status: readinessReport.status,
    readiness_score: readinessReport.score,
    payment_delay_risk: readinessReport.paymentDelayRisk,
    invoice_total: invoiceTotal,
    accessorial_total: accessorialTotal,
    revenue_at_risk: revenueAtRisk,
    processing_status: "completed",
    processing_completed_at: new Date().toISOString(),
    ai_model_name: "document-rules-v2",
    parser_provider: "pdfjs-dist",
  })
  .eq("id", packet.id)
  .select(
    "id, organization_id, load_number, status, created_at, readiness_score, payment_delay_risk, invoice_total, accessorial_total, revenue_at_risk"
  )
  .single();

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
     packet: updatedPacket,
     report,
     review: {
      score: readinessReport.score,
      status: readinessReport.status,
      paymentDelayRisk: readinessReport.paymentDelayRisk,
      summary: readinessReport.summary,
      blockers: readinessReport.blockers,
      fixRecommendations: readinessReport.fixRecommendations,
      extractedValues: readinessReport.extractedValues,
    },
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
    documents: uploadedDocuments.map((document) => ({
      id: document.id,
      packet_id: document.packet_id,
      organization_id: document.organization_id,
      file_name: document.file_name,
      file_path: document.file_path,
      file_size: document.file_size,
      mime_type: document.mime_type,
      document_type: document.document_type,
      confidence: document.confidence,
      created_at: document.created_at,
      parsed_values: document.parsed_values,
    })),
  });
}