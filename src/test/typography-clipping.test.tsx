import { describe, it, expect, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TypographyTest from "@/pages/TypographyTest";
import fs from "node:fs";
import path from "node:path";

/**
 * CI guard for Arabic glyph clipping.
 *
 * jsdom does not paint glyphs, so we cannot directly observe pixel clipping.
 * Instead we verify the two prerequisites that prevent clipping in production:
 *
 *   1. /typography page mounts in both RTL and LTR without throwing.
 *   2. The CSS safety net in src/index.css forces:
 *        - line-height: 1.5 on .leading-tight / .leading-none in RTL
 *        - letter-spacing: 0 on .tracking-tight / .tracking-tighter in RTL
 *   3. <html lang="ar"> body uses the Arabic-safe font stack.
 *
 * If any of these regress, Arabic shadda/fatha will start clipping in headers.
 *
 * For full pixel-level verification, run the optional Playwright script
 * `node scripts/check-typography-clipping.mjs` against a running dev server.
 */

const indexCss = fs.readFileSync(
  path.resolve(__dirname, "../index.css"),
  "utf8"
);

describe("typography clipping guards", () => {
  beforeAll(() => {
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
  });

  it("renders /typography page in RTL without errors", () => {
    const { getByTestId } = render(
      <MemoryRouter>
        <TypographyTest />
      </MemoryRouter>
    );
    expect(getByTestId("typography-test-root")).toBeInTheDocument();
  });

  it("CSS overrides .leading-tight to safe line-height in RTL", () => {
    expect(indexCss).toMatch(
      /html\[(?:lang="ar"|dir="rtl")\][^{]*\.leading-tight[\s\S]*?line-height:\s*1\.5\s*!important/
    );
  });

  it("CSS overrides .leading-none to safe line-height in RTL", () => {
    expect(indexCss).toMatch(
      /html\[(?:lang="ar"|dir="rtl")\][^{]*\.leading-none[\s\S]*?line-height:\s*1\.5\s*!important/
    );
  });

  it("CSS neutralizes .tracking-tight in RTL", () => {
    expect(indexCss).toMatch(
      /html\[(?:lang="ar"|dir="rtl")\][^{]*\.tracking-tight[\s\S]*?letter-spacing:\s*0\s*!important/
    );
  });

  it("CSS neutralizes .tracking-tighter in RTL", () => {
    expect(indexCss).toMatch(
      /html\[(?:lang="ar"|dir="rtl")\][^{]*\.tracking-tighter[\s\S]*?letter-spacing:\s*0\s*!important/
    );
  });

  it("Arabic body uses IBM Plex Sans Arabic stack", () => {
    expect(indexCss).toMatch(/IBM Plex Sans Arabic/);
    expect(indexCss).toMatch(/Tajawal/);
  });

  it("headings get extra padding-block-start to protect tall diacritics", () => {
    expect(indexCss).toMatch(/padding-block-start:\s*0\.05em/);
  });
});
