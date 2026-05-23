"use client";

import Link from "next/link";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Trash2,
  UploadCloud,
} from "lucide-react";

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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [reviewStarted, setReviewStarted] = useState(false);

  const hasFiles = selectedFiles.length > 0;

  function addFiles(files: FileList | File[]) {
    const incomingFiles = Array.from(files);

    setSelectedFiles((currentFiles) => {
      const existingKeys = new Set(
        currentFiles.map((file) => `${file.name}-${file.size}-${file.lastModified}`)
      );

      const newFiles = incomingFiles.filter((file) => {
        const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
        return !existingKeys.has(fileKey);
      });

      return [...currentFiles, ...newFiles];
    });

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

  function removeFile(fileName: string) {
    setSelectedFiles((currentFiles) =>
      currentFiles.filter((file) => file.name !== fileName)
    );
    setReviewStarted(false);
  }

  function clearFiles() {
    setSelectedFiles([]);
    setReviewStarted(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
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
                Upload PDFs, images, or document files. This demo stores them only in the browser
                and uses mock analysis results.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileInputChange}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-6 rounded-full bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Choose files
              </button>
            </div>

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

            {hasFiles && (
              <div className="mt-4 space-y-3">
                {selectedFiles.map((file) => (
                  <div
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="h-5 w-5 flex-shrink-0 text-cyan-300" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{file.name}</p>
                        <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFile(file.name)}
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
              disabled={!hasFiles}
              onClick={() => setReviewStarted(true)}
              className="mt-6 w-full rounded-full bg-blue-500 px-6 py-3 font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
            >
              Run mock review
            </button>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl">
            <div className="mb-5 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-300" />
              <h2 className="text-2xl font-semibold">Mock extraction</h2>
            </div>

            {!reviewStarted && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
                <p className="text-sm text-slate-300">
                  Select shipment documents and click{" "}
                  <span className="font-semibold text-cyan-300">Run mock review</span> to preview
                  extracted billing fields.
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
        )}
      </div>
    </main>
  );
}