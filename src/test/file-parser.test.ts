import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractTextFromDocx, extractTextFromPDF } from "@/lib/fileParser";

const parser = vi.hoisted(() => ({ getDocument: vi.fn(), extractRawText: vi.fn(), destroy: vi.fn() }));
vi.mock("pdfjs-dist", () => ({ GlobalWorkerOptions: { workerSrc: "" }, getDocument: parser.getDocument }));
vi.mock("mammoth", () => ({ extractRawText: parser.extractRawText }));
const buffer = new ArrayBuffer(4);
const file = { arrayBuffer: async () => buffer } as File;

describe("document text extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parser.destroy.mockResolvedValue(undefined);
  });

  it("keeps PDF page order and releases the document after extraction", async () => {
    const getPage = vi.fn(async (page: number) => ({
      getTextContent: async () => ({ items: [{ str: `Page ${page}` }, { type: "endMarkedContent" }] }),
    }));
    parser.getDocument.mockReturnValue({ promise: Promise.resolve({ numPages: 2, getPage }), destroy: parser.destroy });
    expect(await extractTextFromPDF(file)).toBe("Page 1 \nPage 2 \n");
    expect(parser.getDocument).toHaveBeenCalledWith({ data: buffer });
    expect(getPage.mock.calls.map(([page]) => page)).toEqual([1, 2]);
    expect(parser.destroy).toHaveBeenCalledOnce();
  });

  it("releases PDF resources when a page cannot be read", async () => {
    const error = new Error("Unreadable page");
    parser.getDocument.mockReturnValue({
      promise: Promise.resolve({ numPages: 1, getPage: async () => { throw error; } }), destroy: parser.destroy,
    });
    await expect(extractTextFromPDF(file)).rejects.toBe(error);
    expect(parser.destroy).toHaveBeenCalledOnce();
  });

  it("releases the loading task when a PDF is invalid", async () => {
    const error = new Error("Invalid PDF");
    parser.getDocument.mockImplementation(() => ({ promise: Promise.reject(error), destroy: parser.destroy }));
    await expect(extractTextFromPDF(file)).rejects.toBe(error);
    expect(parser.destroy).toHaveBeenCalledOnce();
  });

  it("returns the DOCX text without changing its content", async () => {
    parser.extractRawText.mockResolvedValue({ value: "الخبرة\nReact developer" });
    expect(await extractTextFromDocx(file)).toBe("الخبرة\nReact developer");
    expect(parser.extractRawText).toHaveBeenCalledWith({ arrayBuffer: buffer });
  });
});
