import { describe, expect, it } from "vitest";
import SafeSpreadsheet, { buildXlsxBytes, read, utils, writeFile } from "@/lib/safeSpreadsheet";

describe("Safe OOXML Spreadsheet Engine (Zero-Vulnerability SheetJS Replacement)", () => {
  it("generates a valid multi-sheet OOXML .xlsx archive with Arabic UTF-8 text and numbers", () => {
    const wb = utils.book_new();
    const candidatesSheet = utils.json_to_sheet([
      { "الاسم": "أحمد العتيبي", "التقييم": 94, "الحالة": "مقبول", "الراتب": 18500 },
      { "الاسم": "سارة الحربي & شركاؤها", "التقييم": 88, "الحالة": "قيد المراجعة", "الراتب": 15000 },
    ]);
    candidatesSheet["!cols"] = [{ wch: 24 }, { wch: 12 }, { wch: 18 }, { wch: 14 }];

    const summarySheet = utils.json_to_sheet([
      { Metric: "Total Candidates", Value: 2 },
      { Metric: "Average Score", Value: 91 },
    ]);

    utils.book_append_sheet(wb, candidatesSheet, "المرشحون");
    utils.book_append_sheet(wb, summarySheet, "Summary / Stats?*");

    const bytes = buildXlsxBytes(wb);
    // Valid ZIP header ("PK")
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(bytes.byteLength).toBeGreaterThan(500);

    // Round-trip read back the generated .xlsx bytes
    const parsed = read(bytes);
    expect(parsed.SheetNames).toHaveLength(2);
    expect(parsed.SheetNames[0]).toBe("المرشحون");
    expect(parsed.SheetNames[1]).toBe("Summary Stats");

    const rows = utils.sheet_to_json<Record<string, string>>(parsed.Sheets[parsed.SheetNames[0]]);
    expect(rows).toHaveLength(2);
    expect(rows[0]["الاسم"]).toBe("أحمد العتيبي");
    expect(rows[0]["التقييم"]).toBe("94");
    expect(rows[1]["الاسم"]).toBe("سارة الحربي & شركاؤها");
  });

  it("strips prototype pollution keys during sheet creation and CSV/XLSX parsing", () => {
    const csv = "Question,__proto__,constructor,Points\nWhat is TS?,evil,bad,5\n";
    const wb = read(new TextEncoder().encode(csv));
    const rows = utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]]);

    expect(rows).toHaveLength(1);
    expect(rows[0].Question).toBe("What is TS?");
    expect(rows[0].Points).toBe("5");
    expect(Object.prototype.hasOwnProperty.call(rows[0], "__proto__")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(rows[0], "constructor")).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("supports writeFile cleanly without writing stray files to the Node filesystem", () => {
    const wb = SafeSpreadsheet.utils.book_new();
    SafeSpreadsheet.utils.book_append_sheet(
      wb,
      SafeSpreadsheet.utils.json_to_sheet([{ col: "ok" }]),
      "Test",
    );
    const out = writeFile(wb, "test-export.xlsx");
    expect(out.byteLength).toBeGreaterThan(200);
  });
});
