import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReceiptPreviewModal } from "./receipt-preview";

const pdfReceipt = {
  url: "https://files.example/receipt.pdf",
  publicId: "receipt-1",
  fileName: "october.pdf",
  mimeType: "application/pdf",
};

const imageReceipt = {
  url: "https://files.example/receipt.png",
  publicId: "receipt-2",
  fileName: "scan.png",
  mimeType: "image/png",
};

describe("ReceiptPreviewModal", () => {
  const onClose = vi.fn();
  const createObjectURL = vi.fn(() => "blob:preview");
  const revokeObjectURL = vi.fn();
  let clickSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    onClose.mockReset();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  });

  afterEach(() => {
    clickSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("loads a PDF into an iframe without downloading on open", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["%PDF-1.4"], { type: "application/pdf" }),
    } as Response);

    render(<ReceiptPreviewModal receipt={pdfReceipt} onClose={onClose} />);

    expect(screen.getByLabelText("Loading receipt")).toBeInTheDocument();
    expect(await screen.findByTitle("Receipt october.pdf")).toBeInTheDocument();
    expect(screen.getByTitle("Receipt october.pdf")).toHaveAttribute("src", "blob:preview");
    expect(screen.getByRole("button", { name: /Download PDF/i })).toBeEnabled();
    expect(clickSpy).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(pdfReceipt.url);
  });

  it("downloads the loaded PDF only when Download PDF is clicked", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["%PDF-1.4"], { type: "application/pdf" }),
    } as Response);

    render(<ReceiptPreviewModal receipt={pdfReceipt} onClose={onClose} />);
    await screen.findByTitle("Receipt october.pdf");

    fireEvent.click(screen.getByRole("button", { name: /Download PDF/i }));

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(createObjectURL).toHaveBeenCalled();
  });

  it("shows an image preview for image receipts", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["png"], { type: "image/png" }),
    } as Response);

    render(<ReceiptPreviewModal receipt={imageReceipt} onClose={onClose} />);

    const image = await screen.findByAltText("Receipt scan.png");
    expect(image).toHaveAttribute("src", "blob:preview");
    expect(screen.getByRole("button", { name: /^Download$/i })).toBeEnabled();
  });

  it("shows an error when the receipt cannot be loaded", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network"));

    render(<ReceiptPreviewModal receipt={pdfReceipt} onClose={onClose} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load the receipt");
    expect(screen.getByRole("button", { name: /Download PDF/i })).toBeDisabled();
  });

  it("shows a message when the receipt URL is missing", async () => {
    render(
      <ReceiptPreviewModal
        receipt={{ ...pdfReceipt, url: "" }}
        onClose={onClose}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("no receipt file");
  });

  it("closes and revokes the object URL", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["%PDF-1.4"], { type: "application/pdf" }),
    } as Response);

    const { unmount } = render(<ReceiptPreviewModal receipt={pdfReceipt} onClose={onClose} />);
    await screen.findByTitle("Receipt october.pdf");

    fireEvent.click(screen.getByRole("button", { name: /Close/i }));
    expect(onClose).toHaveBeenCalled();

    unmount();
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith("blob:preview"));
  });
});
