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
    name: "BOL",
    keywords: ["bol", "bill-of-lading", "lading"],
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

const extractedFields = [
  { label: "Load number", value: "PM-10482" },
  { label: "Carrier", value: "Atlas Freight Lines" },
  { label: "Delivery date", value: "Mar 22, 2026" },
  { label: "Rate confirmation total", value: "USD 2,450.00" },
  { label: "Invoice total", value: "USD 2,675.00" },
  { label: "POD signature", value: "Missing" },
];

const blockers = [
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
];

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

  const hasFiles = selectedFiles.length > 0;
  const highPriorityCount = blockers.filter((blocker) => blocker.severity === "High").length;

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

  function runMockReview() {
    if (!hasFiles) {
      return;
    }

    clearPendingReview();
    setReviewStarted(false);
    setIsReviewing(true);

    reviewTimerRef.current = setTimeout(() => {
      setIsReviewing(false);
      setReviewStarted(true);
      reviewTimerRef.current = null;
    }, 1200);
  }

  return (
    <main className="bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="mb-2 text-sm font-medium text-cyan-300">PODMatch AI</p>
            <h1 className="text-4xl font-bold tracking-tight">Upload freight docs</h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              Add rate confirmations, invoices, PODs, BOLs, receipts, and accessorial evidence.
              PODMatch AI will match documents, extract billing details, and flag blockers before
              payment is delayed.
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
                Upload PDFs, images, text files, or Word documents. This demo stores them only in
                the browser and uses mock analysis results.
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
                  Add a shipment packet to run the mock review.
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
              onClick={runMockReview}
              className="mt-6 flex w-full items-center justify-center rounded-full bg-blue-500 px-6 py-3 font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
            >
              {isReviewing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing packet...
                </>
              ) : (
                "Run mock review"
              )}
            </button>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl">
            <div className="mb-5 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-300" />
              <h2 className="text-2xl font-semibold">Mock extraction</h2>
            </div>

            {!reviewStarted && !isReviewing && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <p className="text-sm text-slate-300">
                  Select shipment documents and click{" "}
                  <span className="font-semibold text-cyan-300">Run mock review</span> to preview
                  extracted billing fields.
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
                {extractedFields.map((field) => (
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
                  <p className="mt-2 text-3xl font-bold text-amber-300">{blockers.length}</p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                  <p className="text-sm text-slate-400">High priority</p>
                  <p className="mt-2 text-3xl font-bold text-red-300">{highPriorityCount}</p>
                </div>

                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
                  <p className="text-sm text-red-200">Payment readiness</p>
                  <p className="mt-2 text-3xl font-bold text-red-100">Blocked</p>
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl">
              <div className="mb-5 flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-300" />
                <h2 className="text-2xl font-semibold">Billing blockers found</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {blockers.map((blocker) => (
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

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/report"
                  className="rounded-full bg-cyan-400 px-6 py-3 text-center font-semibold text-slate-950 hover:bg-cyan-300"
                >
                  View full demo report
                </Link>

                <button
                  type="button"
                  onClick={() => setReviewStarted(false)}
                  className="rounded-full border border-slate-700 px-6 py-3 font-semibold text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
                >
                  Reset mock review
                </button>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}