import { useEffect, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import type { ExpenseReceipt } from "@/lib/expenses-api";

export function isInlineImageReceipt(receipt: Pick<ExpenseReceipt, "mimeType">): boolean {
  return receipt.mimeType.toLowerCase().startsWith("image/");
}

export async function downloadReceiptFile(
  receipt: Pick<ExpenseReceipt, "url" | "fileName" | "mimeType">,
): Promise<void> {
  const response = await fetch(receipt.url);
  if (!response.ok) {
    throw new Error("Could not download receipt");
  }
  const data = await response.blob();
  const file = new File([data], receipt.fileName || "receipt", {
    type: receipt.mimeType || data.type || "application/octet-stream",
  });
  const objectUrl = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = receipt.fileName || "receipt";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

type ReceiptViewerProps = {
  receipt: ExpenseReceipt;
  onClose: () => void;
};

export function ReceiptViewer({ receipt, onClose }: ReceiptViewerProps) {
  const image = isInlineImageReceipt(receipt);
  const [previewUrl, setPreviewUrl] = useState<string | null>(image ? receipt.url : null);
  const [loading, setLoading] = useState(!image);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (image) return;
    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);
    setError(null);
    setPreviewUrl(null);

    fetch(receipt.url)
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load receipt");
        const data = await response.blob();
        const file = new File([data], receipt.fileName || "receipt.pdf", {
          type: receipt.mimeType || "application/pdf",
        });
        objectUrl = URL.createObjectURL(file);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setPreviewUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setError("Could not display this receipt.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [image, receipt.fileName, receipt.mimeType, receipt.url]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function download() {
    setDownloading(true);
    setDownloadError(null);
    try {
      await downloadReceiptFile(receipt);
    } catch {
      setDownloadError("Could not download this receipt.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-viewer-title"
        className="card-site flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <h2 id="receipt-viewer-title" className="min-w-0 truncate text-lg font-semibold">
            {receipt.fileName || "Receipt"}
          </h2>
          <div className="flex gap-2">
            <button type="button" className="btn btn-outline h-9" onClick={download} disabled={downloading}>
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download
            </button>
            <button type="button" className="btn btn-outline h-9 px-2" aria-label="Close receipt" onClick={onClose}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="min-h-[50vh] flex-1 overflow-auto bg-muted/40 p-4">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <p role="alert" className="py-16 text-center text-sm text-destructive">{error}</p>
          ) : image && previewUrl ? (
            <img
              src={previewUrl}
              alt={receipt.fileName || "Receipt"}
              className="mx-auto max-h-[70vh] w-auto max-w-full object-contain"
            />
          ) : previewUrl ? (
            <iframe title="Receipt preview" src={previewUrl} className="h-[70vh] w-full rounded-md bg-white" />
          ) : null}
          {downloadError && (
            <p role="alert" className="mt-3 text-sm text-destructive">{downloadError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
