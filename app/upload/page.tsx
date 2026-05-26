"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  ShieldAlert,
  Trash2,
  UploadCloud,
} from "lucide-react";

type DemoFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  isSample?: boolean;
  rawFile?: File;
};

const maxFileSize = 10 * 1024 * 1024;

const acceptedExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".txt", ".doc", ".docx"];

const sampleFiles: DemoFile[] = [
  {
    id: "sample-rate-confirmation",
    name: "PM-10482-rate-confirmation.pdf",
    size: 842000,
    type: "application/pdf",
    lastModified: 1711123200000,
    isSample: true,
  },
  {
    id: "sample-invoice",
    name: "PM-10482-invoice.pdf",
    size: 526000,
    type: "application/pdf",
    lastModified: 1711123200000,
    isSample: true,
  },
  {
    id: "sample-pod",
    name: "PM-10482-pod-missing-signature.jpg",
    size: 1190000,
    type: "image/jpeg",
    lastModified: 1711123200000,
    isSample: true,
  },
  {
    id: "sample-bol",
    name: "PM-10482-bol.pdf",
    size: 611000,
    type: "application/pdf",
    lastModified: 1711123200000,
    isSample: true,
  },
  {
    id: "sample-lumper",
    name: "PM-10482-lumper-receipt.txt",
    size: 72000,
    type: "text/plain",
    lastModified: 1711123200000,
    isSample: true,
  },
  {
    id: "sample-detention",
    name: "PM-10482-detention-evidence.docx",
    size: 238000,
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    lastModified: 1711123200000,
    isSample: true,
  },
];

const documentTypes = [
  {
    name: "Rate confirmation",
    keywords: ["rate", "confirmation", "ratecon", "rc"],
  },
  {
    name: "Invoice",
    keywords: ["invoice", "inv"],
  },
  {
    name: "POD",
    keywords: ["pod", "proof", "delivery"],
  },
  
  {
    name: "Lumper receipt",
    keywords: ["lumper", "receipt"],
  },
  {
    name: "Detention evidence",
    keywords: ["detention", "waiting", "delay"],
  },
];

type Blocker = {
  title: string;
  description: string;
  severity: "High" | "Medium" | "Low";
};

type activeReviewResult = {
  readiness: "Ready" | "Blocked";
  extractedFields: {
    label: string;
    value: string;
  }[];
  blockers: Blocker[];
};

   type UploadApiPayload = {
   error?: string;
   packet?: {
    id?: string;
    load_number?: string;
    status?: string;
    readiness_score?: number;
    payment_delay_risk?: string;
    created_at?: string;
  };
  loadPacket?: {
    id?: string;
    workspace_id?: string;
    organization_id?: string;
    reference_number?: string;
    load_number?: string;
    status?: string;
    readiness_score?: number;
    payment_delay_risk?: string;
    created_at?: string;
  };
  review?: {
    score?: number;
    status?: string;
    paymentDelayRisk?: string;
    summary?: string;
    blockers?: {
      severity: "low" | "medium" | "high" | "critical";
      title: string;
      description: string;
      recommended_fix: string;
      amount_at_risk?: number;
    }[];
    extractedValues?: {
      revenue_at_risk?: number;
      invoice_total?: number;
      rate_total?: number;
      accessorials_at_risk?: number;
      detected_documents?: {
        id: string;
        file_name: string;
        document_type: string;
        confidence?: number | null;
      }[];
      checks?: Record<string, unknown>;
    };
  };
  documents?: {
    id: string;
    file_name: string;
    document_type: string;
    confidence?: number | null;
  }[];
};

function formatCurrencyValue(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Missing";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function mapApiSeverityToUiSeverity(
  severity: "low" | "medium" | "high" | "critical" | undefined
): Blocker["severity"] {
  if (severity === "critical" || severity === "high") {
    return "High";
  }

  if (severity === "medium") {
    return "Medium";
  }

  return "Low";
}

function mapApiStatusToReadiness(status: string | undefined): activeReviewResult["readiness"] {
  return status === "ready_to_bill" ? "Ready" : "Blocked";
}

 function buildReviewFromApiPayload(payload: UploadApiPayload): activeReviewResult {
  const review = payload.review;
  const extractedValues = review?.extractedValues;
  const documents = payload.documents ?? [];
  const detectedDocuments = extractedValues?.detected_documents ?? [];

  const invoiceCount =
    detectedDocuments.filter((document) => document.document_type === "invoice").length ||
    documents.filter((document) => document.document_type === "invoice").length;

  const podCount =
    detectedDocuments.filter((document) => document.document_type === "pod").length ||
    documents.filter((document) => document.document_type === "pod").length;

  const rateConfirmationCount =
    detectedDocuments.filter((document) => document.document_type === "rate_confirmation").length ||
    documents.filter((document) => document.document_type === "rate_confirmation").length;

  return {
    readiness: mapApiStatusToReadiness(review?.status),
    extractedFields: [
      {
        label: "Load packet",
        value: payload.packet?.load_number ?? payload.packet?.id ?? "Created",
      },
      {
        label: "Readiness score",
        value: typeof review?.score === "number" ? `${review.score}/100` : "Missing",
      },
      {
        label: "Documents reviewed",
        value: String(documents.length || detectedDocuments.length || 0),
      },
      {
        label: "Invoices detected",
        value: String(invoiceCount),
      },
      {
        label: "Rate confirmations detected",
        value: String(rateConfirmationCount),
      },
      {
        label: "PODs detected",
        value: String(podCount),
      },
      {
        label: "Rate confirmation total",
        value: formatCurrencyValue(extractedValues?.rate_total),
      },
      {
        label: "Invoice total",
        value: formatCurrencyValue(extractedValues?.invoice_total),
      },
      {
        label: "Revenue at risk",
        value: formatCurrencyValue(extractedValues?.revenue_at_risk),
      },
    ],
    blockers:
      review?.blockers?.map((blocker) => ({
        severity: mapApiSeverityToUiSeverity(blocker.severity),
        title: blocker.title,
        description: blocker.amount_at_risk
          ? `${blocker.description} Amount at risk: ${formatCurrencyValue(blocker.amount_at_risk)}.`
          : blocker.description,
      })) ?? [],
  };
}

function getMockReviewForFiles(files: DemoFile[]): activeReviewResult {
  const names = files.map((file) => file.name.toLowerCase());

  const has = (keyword: string) => names.some((name) => name.includes(keyword));

  if (has("blocked-invoice")) {
    return {
    readiness: "Blocked",
    
  extractedFields: [
        { label: "Load number", value: "PM-2001" },
        { label: "Carrier", value: "PODMatch Test Carrier LLC" },
        { label: "Broker", value: "Missing Docs Broker" },
        { label: "Rate confirmation total", value: "Missing" },
        { label: "Invoice total", value: "USD 2,200.00" },
        { label: "POD signature", value: "Missing" },
      ],
      blockers: [
        {
          title: "Missing POD",
          description: "No proof of delivery was uploaded for load PM-2001.",
          severity: "High",
        },
        {
          title: "Missing rate confirmation",
          description: "No rate confirmation was uploaded to validate the invoice total.",
          severity: "High",
        },
        
        {
          title: "Unsupported lumper charge",
          description: "Invoice includes USD 250.00 lumper charge, but no lumper receipt was uploaded.",
          severity: "Medium",
        },
        {
          title: "Unsupported detention charge",
          description: "Invoice includes USD 150.00 detention, but no detention evidence was uploaded.",
          severity: "Medium",
        },
      ],
    };
  }

  if (has("lumper")) {
    const hasInvoice = has("lumper-invoice");
    const hasPod = has("lumper-pod");
    const hasRateConfirmation = has("lumper-rate-confirmation");
    
    const hasReceipt = has("lumper-receipt");

    const lumperBlockers: Blocker[] = [];

    if (!hasInvoice) {
      lumperBlockers.push({
        title: "Missing invoice",
        description: "No invoice was uploaded for lumper load PM-3001.",
        severity: "High",
      });
    }

    if (!hasPod) {
      lumperBlockers.push({
        title: "Missing POD",
        description: "No proof of delivery was uploaded for lumper load PM-3001.",
        severity: "High",
      });
    }

    if (!hasRateConfirmation) {
      lumperBlockers.push({
        title: "Missing rate confirmation",
        description: "No rate confirmation was uploaded to validate the lumper charge.",
        severity: "High",
      });
    }

    

    if (!hasReceipt) {
      lumperBlockers.push({
        title: "Missing lumper receipt",
        description: "Invoice includes a lumper charge, but no matching receipt was uploaded.",
        severity: "Medium",
      });
    }

    return {
       readiness: lumperBlockers.length === 0 ? "Ready" : "Blocked",
       
  extractedFields: [
        { label: "Load number", value: "PM-3001" },
        { label: "Carrier", value: "PODMatch Test Carrier LLC" },
        { label: "Broker", value: "Lumper Test Broker" },
        {
          label: "Rate confirmation total",
          value: hasRateConfirmation ? "USD 2,250.00" : "Missing",
        },
        { label: "Invoice total", value: hasInvoice ? "USD 2,250.00" : "Missing" },
        {
          label: "Lumper support",
          value: hasReceipt ? "Receipt matched: USD 250.00" : "Missing",
        },
      ],
      blockers: lumperBlockers,
    };
  }

  if (has("detention")) {
    const hasInvoice = has("detention-invoice");
    const hasPod = has("detention-pod");
    const hasRateConfirmation = has("detention-rate-confirmation");
    
    const hasEvidence = has("detention-evidence");

    const detentionBlockers: Blocker[] = [];

    if (!hasInvoice) {
      detentionBlockers.push({
        title: "Missing invoice",
        description: "No invoice was uploaded for detention load PM-4001.",
        severity: "High",
      });
    }

    if (!hasPod) {
      detentionBlockers.push({
        title: "Missing POD",
        description: "No proof of delivery was uploaded for detention load PM-4001.",
        severity: "High",
      });
    }

    if (!hasRateConfirmation) {
      detentionBlockers.push({
        title: "Missing rate confirmation",
        description: "No rate confirmation was uploaded to validate the detention charge.",
        severity: "High",
      });
    }

    

    if (!hasEvidence) {
      detentionBlockers.push({
        title: "Missing detention evidence",
        description:
          "Invoice includes detention, but no appointment, arrival, departure, or approval evidence was uploaded.",
        severity: "Medium",
      });
    }

    return {
      readiness: detentionBlockers.length === 0 ? "Ready" : "Blocked",
      extractedFields: [
        { label: "Load number", value: "PM-4001" },
        { label: "Carrier", value: "PODMatch Test Carrier LLC" },
        { label: "Broker", value: "Detention Test Broker" },
        {
          label: "Rate confirmation total",
          value: hasRateConfirmation ? "USD 2,050.00" : "Missing",
        },
        { label: "Invoice total", value: hasInvoice ? "USD 2,050.00" : "Missing" },
        {
          label: "Detention support",
          value: hasEvidence ? "Evidence matched: USD 150.00" : "Missing",
        },
      ],
      blockers: detentionBlockers,
    };
  }

   if (has("test-invoice") || has("test-pod") || has("test-rate-confirmation")) {
    const hasInvoice = has("test-invoice");
    const hasPod = has("test-pod");
    const hasRateConfirmation = has("test-rate-confirmation");
    

    const missingBlockers: Blocker[] = [];

    if (!hasInvoice) {
      missingBlockers.push({
        title: "Missing invoice",
        description: "No invoice was uploaded for load PM-1001.",
        severity: "High",
      });
    }

    if (!hasPod) {
      missingBlockers.push({
        title: "Missing POD",
        description: "No proof of delivery was uploaded for load PM-1001.",
        severity: "High",
      });
    }

    if (!hasRateConfirmation) {
      missingBlockers.push({
        title: "Missing rate confirmation",
        description: "No rate confirmation was uploaded to validate load PM-1001.",
        severity: "High",
      });
    }

    

    return {
      readiness: missingBlockers.length === 0 ? "Ready" : "Blocked",
      extractedFields: [
        { label: "Load number", value: "PM-1001" },
        { label: "Carrier", value: "PODMatch Test Carrier LLC" },
        { label: "Broker", value: "Test Broker Logistics" },
        { label: "Rate confirmation total", value: hasRateConfirmation ? "USD 2,150.00" : "Missing" },
        { label: "Invoice total", value: hasInvoice ? "USD 2,150.00" : "Missing" },
        { label: "POD signature", value: hasPod ? "John Smith" : "Missing" },
      ],
      blockers: missingBlockers,
    };
  }

  return {
    readiness: "Blocked",
    extractedFields: [
      { label: "Load number", value: "PM-10482" },
      { label: "Carrier", value: "Atlas Freight Lines" },
      { label: "Delivery date", value: "Mar 22, 2026" },
      { label: "Rate confirmation total", value: "USD 2,450.00" },
      { label: "Invoice total", value: "USD 2,675.00" },
      { label: "POD signature", value: "Missing" },
    ],
    blockers: [
      {
        title: "Missing signed POD",
        description: "The delivery document is missing a receiver signature.",
        severity: "High",
      },
      {
        title: "Invoice mismatch",
        description: "Invoice total is USD 225.00 higher than the rate confirmation.",
        severity: "High",
      },
      {
        title: "Unsupported lumper charge",
        description: "Lumper fee was detected, but no matching receipt was uploaded.",
        severity: "Medium",
      },
    ],
  };
}

function getFileId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function getFileExtension(fileName: string) {
  const extension = fileName.toLowerCase().match(/\.[^.]+$/);
  return extension ? extension[0] : "";
}

function isAcceptedFile(fileName: string) {
  return acceptedExtensions.includes(getFileExtension(fileName));
}

function getFileKind(fileName: string) {
  const extension = getFileExtension(fileName);

  if (extension === ".pdf") {
    return "PDF";
  }

  if ([".png", ".jpg", ".jpeg"].includes(extension)) {
    return "IMAGE";
  }

  if ([".doc", ".docx"].includes(extension)) {
    return "DOC";
  }

  if (extension === ".txt") {
    return "TXT";
  }

  return "FILE";
}

function getFileBadgeClass(fileName: string) {
  const kind = getFileKind(fileName);

  if (kind === "PDF") {
    return "bg-red-400/10 text-red-300";
  }

  if (kind === "IMAGE") {
    return "bg-purple-400/10 text-purple-300";
  }

  if (kind === "DOC") {
    return "bg-blue-400/10 text-blue-300";
  }

  if (kind === "TXT") {
    return "bg-slate-700 text-slate-300";
  }

  return "bg-slate-800 text-slate-400";
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function fileMatchesDocumentType(fileName: string, keywords: string[]) {
  const normalizedName = fileName.toLowerCase();

  return keywords.some((keyword) => normalizedName.includes(keyword));
}

export default function UploadPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const reviewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<DemoFile[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewStarted, setReviewStarted] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [uploadedLoadPacketId, setUploadedLoadPacketId] = useState<string | null>(null);
  const [apiReview, setApiReview] = useState<activeReviewResult | null>(null);

  const hasFiles = selectedFiles.length > 0;
  const mockReview = getMockReviewForFiles(selectedFiles);
  const activeReview = apiReview ?? mockReview;

  const highPriorityCount = activeReview.blockers.filter(
    (blocker) => blocker.severity === "High"
  ).length;

  useEffect(() => {
    async function bootstrapWorkspace() {
      try {
        const response = await fetch("/api/workspace");

        if (!response.ok) {
          const payload = await response.json();
          throw new Error(payload.error ?? "Failed to load workspace.");
        }

        const payload = await response.json();
        setWorkspaceId(payload.workspace.id);
      } catch (error) {
        setWorkspaceError(
          error instanceof Error ? error.message : "Failed to load workspace."
        );
      }
    }

    bootstrapWorkspace();

    return () => {
      if (reviewTimerRef.current) {
        clearTimeout(reviewTimerRef.current);
      }
    };
  }, []);

  function clearPendingReview() {
    if (reviewTimerRef.current) {
      clearTimeout(reviewTimerRef.current);
      reviewTimerRef.current = null;
    }

    setIsReviewing(false);
  }

  function addFiles(files: FileList | File[]) {
    const incomingFiles = Array.from(files);
    const validFiles: DemoFile[] = [];
    const errors: string[] = [];

    incomingFiles.forEach((file) => {
      if (!isAcceptedFile(file.name)) {
        errors.push(`${file.name} was skipped. Supported types: PDF, PNG, JPG, TXT, DOC, DOCX.`);
        return;
      }

      if (file.size > maxFileSize) {
        errors.push(`${file.name} was skipped. Max file size is 10 MB.`);
        return;
      }

      validFiles.push({
        id: getFileId(file),
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        rawFile: file,
      });
    });

    setSelectedFiles((currentFiles) => {
      const existingIds = new Set(currentFiles.map((file) => file.id));
      const newFiles = validFiles.filter((file) => !existingIds.has(file.id));

      return [...currentFiles, ...newFiles];
    });

    setFileErrors(errors);
    clearPendingReview();
    setReviewStarted(false);
  }

  function loadSamplePacket() {
    setSelectedFiles(sampleFiles);
    setFileErrors([]);
    clearPendingReview();
    setReviewStarted(false);
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      addFiles(event.target.files);
    }

    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    if (event.dataTransfer.files) {
      addFiles(event.dataTransfer.files);
    }
  }

  function removeFile(fileId: string) {
    setSelectedFiles((currentFiles) =>
      currentFiles.filter((file) => file.id !== fileId)
    );

    setFileErrors([]);
    clearPendingReview();
    setReviewStarted(false);
  }

  function clearFiles() {
    setSelectedFiles([]);
    setFileErrors([]);
    clearPendingReview();
    setReviewStarted(false);
  }

async function runactiveReview() {
    if (!hasFiles) {
      return;
    }

    if (!workspaceId) {
      setFileErrors(["Workspace is still connecting. Please try again in a moment."]);
      return;
    }

    clearPendingReview();
    setReviewStarted(false);
    setIsReviewing(true);
    setFileErrors([]);
    setUploadedLoadPacketId(null);
    setApiReview(null);

    const realFiles = selectedFiles
      .map((file) => file.rawFile)
      .filter((file): file is File => Boolean(file));

    try {
      if (realFiles.length > 0) {
        const formData = new FormData();

        formData.append("workspaceId", workspaceId);

        realFiles.forEach((file) => {
          formData.append("files", file);
        });

        const response = await fetch("/api/documents/upload", {
          method: "POST",
          body: formData,
        });

        const payload = (await response.json()) as UploadApiPayload;
        if (!response.ok) {
        throw new Error(payload.error ?? "Failed to upload documents.");
       }
      setUploadedLoadPacketId(payload.packet?.id ?? payload.loadPacket?.id ?? null);
      setApiReview(buildReviewFromApiPayload(payload));

        
      }

      reviewTimerRef.current = setTimeout(() => {
        setIsReviewing(false);
        setReviewStarted(true);
        reviewTimerRef.current = null;
      }, 1200);
    } catch (error) {
      setIsReviewing(false);
      setFileErrors([
        error instanceof Error ? error.message : "Failed to upload documents.",
      ]);
    }
  }

  return (
    <main className="bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="mb-2 text-sm font-medium text-cyan-300">PODMatch AI</p>
            <h1 className="text-4xl font-bold tracking-tight">Upload freight docs</h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              Add rate confirmations, invoices, signed PODs, lumper receipts, detention backup,
              and accessorial evidence. PODMatch AI will match documents, extract billing details,
              and flag blockers before payment is delayed.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-full border border-slate-700 px-4 py-2 text-center text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
          >
            Back home
          </Link>
        </div>
        {workspaceId ? (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            Workspace connected: {workspaceId}
          </div>
        ) : workspaceError ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            Workspace error: {workspaceError}
          </div>
        ) : (
          <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-900 p-4 text-sm text-slate-300">
            Connecting workspace...
          </div>
        )}

    {uploadedLoadPacketId ? (
          <div className="mb-6 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm text-cyan-200">
            Load packet saved: {uploadedLoadPacketId}
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex min-h-72 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
                isDragging
                  ? "border-cyan-300 bg-cyan-400/10"
                  : "border-cyan-500/40 bg-slate-950/70"
              }`}
            >
              <UploadCloud className="mb-4 h-12 w-12 text-cyan-300" />
              <h2 className="text-2xl font-semibold">Drop freight documents here</h2>
              <p className="mt-3 max-w-md text-slate-400">
                Upload PDFs, images, text files, or Word documents. PODMatch AI stores the packet,
                extracts document text, and generates a billing readiness review.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={acceptedExtensions.join(",")}
                className="hidden"
                onChange={handleFileInputChange}
              />

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
                >
                  Choose files
                </button>

                <button
                  type="button"
                  onClick={loadSamplePacket}
                  className="rounded-full border border-slate-700 px-6 py-3 font-semibold text-slate-200 hover:border-cyan-400 hover:text-cyan-300"
                >
                  Load sample packet
                </button>
              </div>

              <p className="mt-4 text-xs text-slate-500">
                Accepted: PDF, PNG, JPG, TXT, DOC, DOCX. Max 10 MB per file.
              </p>
            </div>

            {fileErrors.length > 0 && (
              <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-300" />
                  <p className="font-semibold text-red-100">Some files were not added</p>
                </div>

                <div className="space-y-1">
                  {fileErrors.map((error) => (
                    <p key={error} className="text-sm text-red-100/80">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">
                  {selectedFiles.length} file{selectedFiles.length === 1 ? "" : "s"} selected
                </p>
                <p className="text-sm text-slate-400">
                  Add a shipment packet to run the  review.
                </p>
              </div>

              {hasFiles && (
                <button
                  type="button"
                  onClick={clearFiles}
                  className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-red-400 hover:text-red-300"
                >
                  Clear all
                </button>
              )}
            </div>

            {!hasFiles && (
              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <p className="text-sm text-slate-300">
                  No documents selected yet. Choose files or load the sample packet to preview the
                  PODMatch AI review flow.
                </p>
              </div>
            )}

            {hasFiles && (
              <div className="mt-4 space-y-3">
                {selectedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="h-5 w-5 flex-shrink-0 text-cyan-300" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium text-white">{file.name}</p>
                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-bold ${getFileBadgeClass(
                              file.name
                            )}`}
                          >
                            {getFileKind(file.name)}
                          </span>
                          {file.isSample && (
                            <span className="rounded-full bg-cyan-400/10 px-2 py-1 text-[10px] font-bold text-cyan-300">
                              SAMPLE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      className="rounded-full p-2 text-slate-500 hover:bg-red-400/10 hover:text-red-300"
                      aria-label={`Remove ${file.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {documentTypes.map((doc) => {
                const detected = selectedFiles.some((file) =>
                  fileMatchesDocumentType(file.name, doc.keywords)
                );

                return (
                  <div
                    key={doc.name}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-cyan-300" />
                      <span className="text-sm text-slate-200">{doc.name}</span>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        detected
                          ? "bg-emerald-400/10 text-emerald-300"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {detected ? "Detected" : "Missing"}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              disabled={!hasFiles || isReviewing}
              onClick={runactiveReview}
              className="mt-6 flex w-full items-center justify-center rounded-full bg-blue-500 px-6 py-3 font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
            >
              {isReviewing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing packet...
                </>
              ) : (
                "Run review"
              )}
            </button>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl">
            <div className="mb-5 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-300" />
              <h2 className="text-2xl font-semibold">Billing readiness result</h2>
            </div>

            {!reviewStarted && !isReviewing && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <p className="text-sm text-slate-300">
                  Select shipment documents and click{" "}
                  <span className="font-semibold text-cyan-300">Run review</span> to analyze
                  billing readiness.
                </p>
              </div>
            )}

            {isReviewing && (
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan-300" />
                  <p className="font-semibold text-cyan-100">Analyzing freight packet...</p>
                </div>

                <div className="space-y-3">
                  <div className="h-3 w-full animate-pulse rounded-full bg-slate-800" />
                  <div className="h-3 w-5/6 animate-pulse rounded-full bg-slate-800" />
                  <div className="h-3 w-2/3 animate-pulse rounded-full bg-slate-800" />
                </div>

                <p className="mt-4 text-sm text-slate-300">
                  Matching documents, checking invoice totals, scanning for POD signatures, and
                  validating accessorial support.
                </p>
              </div>
            )}

            {reviewStarted && (
              <div className="space-y-3">
                {activeReview.extractedFields.map((field) => (
                  <div
                    key={field.label}
                    className="flex items-center justify-between rounded-2xl bg-slate-950/70 px-4 py-3"
                  >
                    <span className="text-sm text-slate-400">{field.label}</span>
                    <span className="text-sm font-medium text-white">{field.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {reviewStarted && (
          <>
            <section className="mt-6 rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-6 shadow-2xl">
              <div className="mb-5 flex items-center gap-3">
                <ShieldAlert className="h-6 w-6 text-cyan-300" />
                <h2 className="text-2xl font-semibold">Review summary</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                  <p className="text-sm text-slate-400">Documents reviewed</p>
                  <p className="mt-2 text-3xl font-bold text-white">{selectedFiles.length}</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                  <p className="text-sm text-slate-400">Billing blockers</p>
                  <p className="mt-2 text-3xl font-bold text-amber-300">
                    {activeReview.blockers.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                  <p className="text-sm text-slate-400">High priority</p>
                  <p className="mt-2 text-3xl font-bold text-red-300">{highPriorityCount}</p>
                </div>

                <div
                  className={`rounded-2xl border p-5 ${
                    activeReview.readiness === "Ready"
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-red-500/30 bg-red-500/10"
                  }`}
                >
                  <p
                    className={`text-sm ${
                      activeReview.readiness === "Ready" ? "text-emerald-200" : "text-red-200"
                    }`}
                  >
                    Payment readiness
                  </p>
                  <p
                    className={`mt-2 text-3xl font-bold ${
                      activeReview.readiness === "Ready" ? "text-emerald-100" : "text-red-100"
                    }`}
                  >
                    {activeReview.readiness}
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl">
              <div className="mb-5 flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-300" />
                <h2 className="text-2xl font-semibold">
                  {activeReview.blockers.length > 0 ? "Billing blockers found" : "No billing blockers found"}
                </h2>
              </div>

              {activeReview.blockers.length === 0 ? (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                  <div className="mb-3 inline-flex rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                    Ready for payment
                  </div>
                  <h3 className="font-semibold text-white">Documents matched successfully</h3>
                  <p className="mt-2 text-sm text-slate-300">
                    Invoice total, rate confirmation, POD signature and required accessorial support are aligned
                    for this packet.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {activeReview.blockers.map((blocker) => (
                    <div
                      key={blocker.title}
                      className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"
                    >
                      <div className="mb-3 inline-flex rounded-full bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
                        {blocker.severity} priority
                      </div>
                      <h3 className="font-semibold text-white">{blocker.title}</h3>
                      <p className="mt-2 text-sm text-slate-400">{blocker.description}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                href={uploadedLoadPacketId ? `/report?packetId=${uploadedLoadPacketId}` : "/report"}
                className={`rounded-full px-6 py-3 text-center font-semibold ${
                uploadedLoadPacketId
                ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                : "cursor-not-allowed bg-slate-700 text-slate-400"
                }`}
  aria-disabled={!uploadedLoadPacketId}
>
  View full report
</Link>

                <button
                  type="button"
                  onClick={() => setReviewStarted(false)}
                  className="rounded-full border border-slate-700 px-6 py-3 font-semibold text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
                >
                  Reset  review
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
