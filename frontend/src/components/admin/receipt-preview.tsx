import { useEffect, useRef, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import type { ExpenseReceipt } from "@/lib/expenses-api";

function isPdfReceipt(receipt: Pick<ExpenseReceipt, "mimeType" | "fileName">): boolean {
  return (
    receipt.mimeType === "application/pdf" ||
    receipt.fileName.toLowerCase().endsWith(".pdf")
  );
}

function isImageReceipt(receipt: Pick<ExpenseReceipt, "mimeType">): boolean {
  return receipt.mimeType.startsWith("image/");
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ReceiptPreviewModal({
  receipt,
  onClose,
}: {
  receipt: ExpenseReceipt;
  onClose: () => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const pdf = isPdfReceipt(receipt);
  const image = isImageReceipt(receipt);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setPreviewUrl(null);
      setBlob(null);

      if (!receipt.url) {
        setError("This expense has no receipt file.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(receipt.url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const raw = await response.blob();
        const typed =
          pdf && raw.type !== "application/pdf"
            ? new Blob([raw], { type: "application/pdf" })
            : raw;
        const url = URL.createObjectURL(typed);
        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = url;
        setBlob(typed);
        setPreviewUrl(url);
      } catch {
        if (!cancelled) {
          setError("Could not load the receipt. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [receipt.url, pdf]);

  function download() {
    if (!blob) return;
    saveBlob(blob, receipt.fileName || (pdf ? "receipt.pdf" : "receipt"));
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-preview-title"
        className="card-site flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="min-w-0">
            <h2 id="receipt-preview-title" className="truncate text-lg font-semibold">
              Receipt preview
            </h2>
            <p className="truncate text-sm text-muted-foreground">{receipt.fileName}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary h-9 px-3 text-sm"
              disabled={!blob || loading}
              onClick={download}
            >
              <Download className="h-4 w-4" />
              {pdf ? "Download PDF" : "Download"}
            </button>
            <button type="button" className="btn btn-outline h-9 px-3 text-sm" onClick={onClose}>
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>

        <div className="relative min-h-[50vh] flex-1 bg-muted/30">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading receipt" />
            </div>
          )}
          {!loading && error && (
            <div className="flex h-full min-h-[50vh] items-center justify-center p-6" role="alert">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          {!loading && !error && previewUrl && pdf && (
            <iframe
              title={`Receipt ${receipt.fileName}`}
              src={previewUrl}
              className="h-[min(70vh,720px)] w-full border-0 bg-white"
            />
          )}
          {!loading && !error && previewUrl && image && (
            <div className="flex max-h-[min(70vh,720px)] items-center justify-center overflow-auto p-4">
              <img
                src={previewUrl}
                alt={`Receipt ${receipt.fileName}`}
                className="max-h-[min(70vh,720px)] max-w-full object-contain"
              />
            </div>
          )}
          {!loading && !error && previewUrl && !pdf && !image && (
            <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 p-6">
              <p className="text-sm text-muted-foreground">
                This receipt type cannot be previewed in the browser.
              </p>
              <button type="button" className="btn btn-primary h-9 px-3 text-sm" onClick={download}>
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
