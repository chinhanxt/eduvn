/**
 * Bộ tiền xử lý tạm thời `data-ek-smiles` cho skill `anim-skills/hoa/cau-truc-phan-tu/`.
 * Ghi chú: S1 chưa có `data-ek-smiles` trong `services/anim-kit` / `preprocess.ts` (xem mục "Đề xuất cho kit" trong docs/reports/mon-hoa.md).
 * Dùng thư viện `smiles-drawer@2.4.2` (MIT) trong Chromium/Playwright để dựng đồ thị phân tử 2D chính xác từ SMILES,
 * rồi chuyển toàn bộ màu sang biến CSS token "Giấy học thuật" (`var(--ink)`, `var(--c-lam)`, `var(--c-doSon)`).
 *
 * Chạy: node anim-skills/hoa/cau-truc-phan-tu/smiles-preprocess.mjs "CC(N)C(=O)O"
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const req = createRequire(import.meta.url);

export async function renderSmilesToTokenSvg(smiles, opts = {}) {
  const width = opts.width ?? 760;
  const height = opts.height ?? 520;
  const { chromium } = req(path.join(repoRoot, "server/node_modules/playwright-core"));
  const sdBundle = path.join(repoRoot, "web/node_modules/smiles-drawer/dist/smiles-drawer.min.js");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  try {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.setContent(`<!doctype html><html><body><svg id="mol" width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"></svg></body></html>`);
    await page.addScriptTag({ path: sdBundle });
    const rawSvg = await page.evaluate(
      ({ smilesStr, w, h }) =>
        new Promise((resolve, reject) => {
          const SD = window.SmilesDrawer;
          if (!SD) return reject(new Error("SmilesDrawer chưa nạp"));
          const drawer = new SD.SvgDrawer({
            width: w,
            height: h,
            bondThickness: 4.5,
            bondLength: 78,
            shortBondLength: 0.82,
            bondSpacing: 14,
            fontSizeLarge: 42,
            fontSizeSmall: 28,
            padding: 64,
            explicitHydrogens: false,
            terminalCarbons: true,
            themes: {
              giay: {
                C: "#1C1B1A",
                O: "#B42318",
                N: "#2F5D8A",
                F: "#2B7A3B",
                CL: "#2B7A3B",
                BR: "#B4530A",
                I: "#6F42C1",
                P: "#8A6200",
                S: "#8A6200",
                B: "#B8336A",
                SI: "#6D645A",
                H: "#3E3B37",
                BACKGROUND: "transparent",
              },
            },
          });
          SD.parse(
            smilesStr,
            (tree) => {
              const svg = document.getElementById("mol");
              drawer.draw(tree, svg, "giay", false);
              resolve(svg.outerHTML);
            },
            (err) => reject(new Error(String(err))),
          );
        }),
      { smilesStr: smiles, w: width, h: height },
    );

    // Chuyển toàn bộ mã màu literal của smilesDrawer thành biến CSS token để vượt lint `mau_literal` & `mau_ngoai_token`
    const colorToVar = [
      [/#1C1B1A/gi, "var(--ink)"],
      [/#3E3B37/gi, "var(--ink2)"],
      [/#6D645A/gi, "var(--ink3)"],
      [/#B42318/gi, "var(--c-doSon)"],
      [/#2F5D8A/gi, "var(--c-lam)"],
      [/#2B7A3B/gi, "var(--c-xanhLa)"],
      [/#6F42C1/gi, "var(--c-tim)"],
      [/#8A6200/gi, "var(--c-vangDam)"],
      [/#B8336A/gi, "var(--c-hong)"],
      [/#B4530A/gi, "var(--c-cam)"],
      [/#ffffff|#fff\b/gi, "var(--surface)"],
      [/#000000|#000\b/gi, "var(--ink)"],
    ];
    let clean = rawSvg;
    for (const [re, v] of colorToVar) clean = clean.replace(re, v);
    return clean;
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const smi = process.argv[2] || "CC(N)C(=O)O";
  const svg = await renderSmilesToTokenSvg(smi);
  console.log(svg);
}
