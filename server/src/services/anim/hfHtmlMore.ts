/** Mẫu HyperFrames nhóm 2 (dòng thời gian, Venn, biểu đồ, thẻ ghi nhớ, trích dẫn, từ vựng, cân bằng hoá học, cây xác suất). HTML sinh từ mẫu cố định; chữ của AI luôn được escape. */
import { CSS, HF_H, HF_W, at, doc, esc, richText } from "./hfHtml";
import type { HfSpec } from "./hfHtml";

// Bảng màu an toàn cho người mù màu (Okabe–Ito) trên nền tối
const PAL = ["#E69F00", "#56B4E9", "#009E73", "#F0E442", "#CC79A7", "#D55E00"];
const r2 = (n: number) => Math.round(n * 100) / 100;
const dur = (T: number, t: number) => r2(Math.max(T - t, 0.5));

const css = (top: number, more: string) => CSS.replaceAll("__TOP__", String(top)).replaceAll("__BW__", "180").replaceAll("__AW__", "50").replaceAll("__COLS__", "2") + more;
/** Phần tử hiện lúc t và giữ đến hết: một div .clip + lệnh GSAP vào (opacity + dịch nhẹ). */
const clip = (id: string, cls: string, style: string, html: string, t: number, T: number, track: number) => `<div id="${id}" class="${cls} clip" style="${style}" data-start="${t}" data-duration="${dur(T, t)}" data-track-index="${track}">${html}</div>`;
const fadeIn = (id: string, t: number, from = "{ opacity: 0, y: 18 }", d = 0.45) => `tl.fromTo("#${id}", ${from}, { opacity: 1, x: 0, y: 0, scale: 1, duration: ${d}, ease: "power3.out" }, ${t});\n`;
const chem = (f: string) => esc(f).replace(/(\d+)/g, "<sub>$1</sub>");

export function moreHtml(spec: HfSpec): string {
  const T = spec.thoiLuong;
  const top = spec.tieuDe ? 100 : 40;
  let n = 0;
  const trk = () => ++n;

  if (spec.template === "dong_thoi_gian") {
    const ms = spec.params.cacMoc;
    const N = ms.length;
    const x = (i: number) => Math.round(110 + (i * (HF_W - 220)) / (N - 1));
    const y0 = 392;
    let inner = clip("ln", "tline", `left:90px;top:${y0 - 3}px;width:${HF_W - 180}px`, "", 0.2, T, trk());
    let js = `tl.fromTo("#ln", { scaleX: 0, opacity: 1, transformOrigin: "0% 50%" }, { scaleX: 1, duration: ${r2(Math.min(1.2, T * 0.15))}, ease: "power2.out" }, 0.2);\n`;
    ms.forEach((m, i) => {
      const t = at(i, N, T);
      const up = i % 2 === 0;
      const card = `<div class="yr">${richText(m.moc)}</div><b>${richText(m.nhan)}</b>${m.moTa ? `<span>${richText(m.moTa)}</span>` : ""}`;
      inner += `\n${clip(`m${i}`, "tcard", `left:${x(i) - 100}px;width:200px;${up ? `bottom:${HF_H - y0 + 26}px` : `top:${y0 + 26}px`}`, card, t, T, trk())}`;
      inner += `\n${clip(`d${i}`, "tdot", `left:${x(i) - 11}px;top:${y0 - 11}px`, "", t, T, trk())}`;
      js += fadeIn(`m${i}`, t, `{ opacity: 0, y: ${up ? 24 : -24} }`) + `tl.fromTo("#d${i}", { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, ${t});\n`;
    });
    const extra = `.tline{position:absolute;height:6px;border-radius:3px;background:#4f6bed}.tdot{position:absolute;width:22px;height:22px;border-radius:50%;background:#ffd166;border:4px solid #10142b}.tcard{position:absolute;text-align:center;display:flex;flex-direction:column;gap:6px}.tcard .yr{font-size:34px;font-weight:700;color:#ffd166}.tcard b{font-size:24px}.tcard span{font-size:19px;color:#c9d0ff}`;
    return doc(spec, css(top, extra), inner, js);
  }

  if (spec.template === "so_do_venn") {
    const p = spec.params;
    const cy = 400;
    const R = 205;
    const els: string[] = [];
    let js = "";
    const add = (id: string, cls: string, style: string, html: string, t: number, from?: string) => {
      els.push(clip(id, cls, style, html, t, T, trk()));
      js += fadeIn(id, t, from ?? "{ opacity: 0, scale: 0.9 }");
    };
    const total = 3 + p.chuaA.length + p.chuaB.length + p.chuaGiao.length + (p.tenGiao ? 1 : 0);
    let k = 0;
    add("ca", "vc", `left:${470 - R}px;top:${cy - R}px;width:${2 * R}px;height:${2 * R}px;background:rgba(86,180,233,.28);border:4px solid #56B4E9`, "", at(k++, total, T));
    add("cb", "vc", `left:${810 - R}px;top:${cy - R}px;width:${2 * R}px;height:${2 * R}px;background:rgba(230,159,0,.28);border:4px solid #E69F00`, "", at(k++, total, T));
    add("na", "vn", `left:${470 - 150}px;top:${cy - R - 52}px;width:300px;color:#56B4E9`, richText(p.tenA), at(k, total, T));
    add("nb", "vn", `left:${810 - 150}px;top:${cy - R - 52}px;width:300px;color:#E69F00`, richText(p.tenB), at(k++, total, T));
    if (p.tenGiao) add("ng", "vn", `left:${640 - 120}px;top:${cy + R + 12}px;width:240px;color:#F0E442;font-size:26px`, richText(p.tenGiao), at(k++, total, T));
    const list = (items: string[], cx: number, id: string) =>
      items.forEach((it, i) => add(`${id}${i}`, "vi", `left:${cx - 100}px;width:200px;top:${cy - ((items.length - 1) * 26) + i * 52 - 20}px`, richText(it), at(k++, total, T)));
    list(p.chuaA, 395, "ia");
    list(p.chuaB, 885, "ib");
    list(p.chuaGiao, 640, "ig");
    return doc(spec, css(top, `.vc{position:absolute;border-radius:50%}.vn{position:absolute;text-align:center;font-size:32px;font-weight:700}.vi{position:absolute;text-align:center;font-size:24px;line-height:1.2}`), els.join("\n"), js);
  }

  if (spec.template === "bieu_do_so_lieu") {
    const { nhan, cacChuoi, kieu, donVi } = spec.params;
    const L = 130;
    const Rr = HF_W - 70;
    const topY = spec.tieuDe ? 150 : 90;
    const botY = HF_H - 120;
    const all = cacChuoi.flatMap((c) => c.giaTri);
    const mx = Math.max(0, ...all);
    const mn = Math.min(0, ...all);
    const kf = (botY - topY) / ((mx - mn) || 1);
    const zero = topY + mx * kf;
    const yOf = (v: number) => zero - v * kf;
    const M = nhan.length;
    const slot = (Rr - L) / M;
    const els: string[] = [];
    let js = "";
    els.push(clip("axis", "ax", `left:${L}px;top:${r2(zero)}px;width:${Rr - L}px`, "", 0.2, T, trk()));
    js += fadeIn("axis", 0.2, "{ opacity: 0 }", 0.4);
    // vạch chia trục y
    for (let g = 0; g <= 4; g++) {
      const v = mn + ((mx - mn) * g) / 4;
      els.push(clip(`g${g}`, "yl", `left:20px;width:${L - 36}px;top:${r2(yOf(v) - 14)}px`, esc(String(Math.round(v * 10) / 10)), 0.2, T, trk()));
    }
    nhan.forEach((l, i) => els.push(clip(`x${i}`, "xl", `left:${r2(L + i * slot)}px;width:${r2(slot)}px;top:${botY + 18}px`, esc(l), 0.3, T, trk())));
    const S = cacChuoi.length;
    const bw = Math.min(70, (slot * 0.8) / S);
    let line = "";
    cacChuoi.forEach((c, s) => {
      const t = at(s, S, T);
      const col = PAL[s % PAL.length] as string;
      if (kieu === "cot") {
        c.giaTri.forEach((v, i) => {
          const x = L + i * slot + (slot - bw * S) / 2 + s * bw;
          const h = Math.max(Math.abs(v) * kf, 2);
          els.push(clip(`b${s}_${i}`, "bar", `left:${r2(x)}px;width:${r2(bw - 4)}px;top:${r2(v >= 0 ? zero - h : zero)}px;height:${r2(h)}px;background:${col}`, "", r2(t + i * 0.12), T, trk()));
          js += `tl.fromTo("#b${s}_${i}", { scaleY: 0, opacity: 1, transformOrigin: "50% ${v >= 0 ? "100%" : "0%"}" }, { scaleY: 1, duration: 0.5, ease: "power3.out" }, ${r2(t + i * 0.12)});\n`;
          els.push(clip(`v${s}_${i}`, "vl", `left:${r2(x - 10)}px;width:${r2(bw + 16)}px;top:${r2(v >= 0 ? zero - h - 30 : zero + h + 4)}px`, esc(String(v)), r2(t + i * 0.12 + 0.4), T, trk()));
          js += fadeIn(`v${s}_${i}`, r2(t + i * 0.12 + 0.4), "{ opacity: 0 }", 0.3);
        });
      } else {
        const pts = c.giaTri.map((v, i) => `${r2(L + i * slot + slot / 2)},${r2(yOf(v))}`);
        line += `<polyline id="p${s}" points="${pts.join(" ")}" pathLength="1" fill="none" stroke="${col}" stroke-width="5" stroke-linejoin="round" stroke-dasharray="1" stroke-dashoffset="1"/>`;
        js += `tl.to("#p${s}", { strokeDashoffset: 0, duration: ${r2(Math.min(2, (T - t) * 0.6))}, ease: "power1.inOut" }, ${t});\n`;
        c.giaTri.forEach((v, i) => {
          const dt = r2(t + (i / Math.max(M - 1, 1)) * Math.min(2, (T - t) * 0.6));
          els.push(clip(`pt${s}_${i}`, "pt", `left:${r2(L + i * slot + slot / 2 - 8)}px;top:${r2(yOf(v) - 8)}px;background:${col}`, "", dt, T, trk()));
          js += fadeIn(`pt${s}_${i}`, dt, "{ opacity: 0, scale: 0 }", 0.25);
          els.push(clip(`pv${s}_${i}`, "vl", `left:${r2(L + i * slot + slot / 2 - 40)}px;width:80px;top:${r2(yOf(v) - 38)}px`, esc(String(v)), dt, T, trk()));
          js += fadeIn(`pv${s}_${i}`, dt, "{ opacity: 0 }", 0.25);
        });
      }
    });
    if (kieu === "duong") els.push(clip("lines", "lines", `inset:0`, `<svg width="${HF_W}" height="${HF_H}" viewBox="0 0 ${HF_W} ${HF_H}">${line}</svg>`, 0.2, T, trk()));
    cacChuoi.forEach((c, s) => els.push(clip(`lg${s}`, "lg", `left:${L + s * 250}px;top:${HF_H - 56}px`, `<i style="background:${PAL[s % PAL.length]}"></i>${esc(c.ten)}`, 0.3, T, trk())));
    if (donVi) els.push(clip("un", "un", `right:${HF_W - Rr + 4}px;top:${topY - 44}px`, `(${esc(donVi)})`, 0.3, T, trk()));
    const extra = `.ax{position:absolute;height:3px;background:#9aa3d0}.yl{position:absolute;text-align:right;font-size:20px;color:#9aa3d0}.xl{position:absolute;text-align:center;font-size:22px}.bar{position:absolute;border-radius:6px 6px 0 0}.vl{position:absolute;text-align:center;font-size:20px;font-weight:700}.pt{position:absolute;width:16px;height:16px;border-radius:50%}.lines{position:absolute}.lg{position:absolute;font-size:22px;display:flex;align-items:center;gap:10px}.lg i{display:inline-block;width:22px;height:22px;border-radius:5px}.un{position:absolute;font-size:20px;color:#9aa3d0}`;
    return doc(spec, css(top, extra), els.join("\n"), js);
  }

  if (spec.template === "the_ghi_nho") {
    const cards = spec.params.cacThe;
    const N = cards.length;
    const w = N === 1 ? 760 : Math.min(520, Math.floor((HF_W - 128 - (N - 1) * 24) / N));
    const h = N === 1 ? 360 : 300;
    const left0 = Math.round((HF_W - (N * w + (N - 1) * 24)) / 2);
    const els: string[] = [];
    let js = "";
    cards.forEach((c, i) => {
      const t = at(i, N, T);
      const flip = r2(t + Math.max((T - 1.2) / N, 1.2) * 0.5);
      els.push(clip(`c${i}`, "fc", `left:${left0 + i * (w + 24)}px;top:${top + 70}px;width:${w}px;height:${h}px`, `<div id="in${i}" class="fin"><div class="ff">${richText(c.matTruoc)}</div><div class="fb">${richText(c.matSau)}</div></div>`, t, T, trk()));
      js += fadeIn(`c${i}`, t, "{ opacity: 0, y: 30 }", 0.45) + `tl.fromTo("#in${i}", { rotateY: 0 }, { rotateY: 180, duration: 0.7, ease: "power2.inOut" }, ${flip});\n`;
    });
    const extra = `.fc{position:absolute;perspective:1200px}.fin{position:absolute;inset:0;transform-style:preserve-3d}.ff,.fb{position:absolute;inset:0;backface-visibility:hidden;border-radius:18px;display:flex;align-items:center;justify-content:center;text-align:center;padding:28px;font-size:34px;line-height:1.3;font-weight:700}.ff{background:#1c2350;border:4px solid #56B4E9}.fb{background:#14392f;border:4px solid #009E73;transform:rotateY(180deg);font-weight:400;font-size:30px}`;
    return doc(spec, css(top, extra), els.join("\n"), js);
  }

  if (spec.template === "trich_dan_van_ban") {
    const p = spec.params;
    let html = esc(p.vanBan);
    const kws = p.tuKhoa.filter((k) => p.vanBan.includes(k));
    kws.forEach((k, i) => {
      html = html.split(esc(k)).join(`<mark id="k${i}">${esc(k)}</mark>`);
    });
    // chỉ giữ lần xuất hiện đầu của mỗi id (id phải duy nhất)
    kws.forEach((_k, i) => {
      let seen = 0;
      html = html.replace(new RegExp(`<mark id="k${i}">`, "g"), () => (seen++ === 0 ? `<mark id="k${i}">` : "<mark>"));
    });
    const els = [clip("qt", "qt", `left:90px;right:90px;top:${top + 40}px`, `<span class="qm">“</span>${html}`, 0.3, T, trk())];
    let js = fadeIn("qt", 0.3, "{ opacity: 0, y: 24 }", 0.7);
    const nK = kws.length + 1;
    kws.forEach((_k, i) => {
      const t = r2(1.4 + ((T - 3.2) * i) / nK);
      js += `tl.fromTo("#k${i}", { backgroundColor: "rgba(255,209,102,0)", color: "#f3f5ff" }, { backgroundColor: "rgba(255,209,102,0.9)", color: "#10142b", duration: 0.4 }, ${t});\n`;
    });
    const tEnd = r2(Math.max(T * 0.62, 1.6));
    if (p.tacGia) {
      els.push(clip("au", "au", `right:90px;bottom:${p.ghiChu ? 190 : 110}px`, `— ${esc(p.tacGia)}`, tEnd, T, trk()));
      js += fadeIn("au", tEnd);
    }
    if (p.ghiChu) {
      els.push(clip("nt", "nt", `left:90px;right:90px;bottom:56px`, esc(p.ghiChu), r2(tEnd + 0.5), T, trk()));
      js += fadeIn("nt", r2(tEnd + 0.5));
    }
    const extra = `.qt{position:absolute;font-size:36px;line-height:1.55;font-family:"Noto Serif","Noto Sans",serif}.qt mark{background:transparent;color:inherit;padding:2px 6px;border-radius:6px}.qm{font-size:90px;color:#ffd166;line-height:0;vertical-align:-30px;margin-right:8px}.au{position:absolute;font-size:28px;color:#ffd166;font-style:italic}.nt{position:absolute;font-size:26px;color:#c9d0ff;border-left:6px solid #009E73;padding:10px 18px;background:rgba(0,158,115,.12);border-radius:6px}`;
    return doc(spec, css(top, extra), els.join("\n"), js);
  }

  if (spec.template === "tu_vung") {
    const p = spec.params;
    const parts: { id: string; html: string; cls: string }[] = [{ id: "w", cls: "vw", html: esc(p.tu) }];
    if (p.phienAm || p.loaiTu) parts.push({ id: "ipa", cls: "vp", html: `${p.phienAm ? `<span>${esc(p.phienAm)}</span>` : ""}${p.loaiTu ? `<em>${esc(p.loaiTu)}</em>` : ""}` });
    parts.push({ id: "mn", cls: "vm", html: esc(p.nghia) });
    if (p.viDu) parts.push({ id: "ex", cls: "ve", html: esc(p.viDu) });
    if (p.viDuDich) parts.push({ id: "ext", cls: "vt", html: esc(p.viDuDich) });
    const N = parts.length;
    const els = parts.map((q, i) => clip(q.id, q.cls, "", q.html, at(i, N, T), T, trk()));
    const js = parts.map((q, i) => fadeIn(q.id, at(i, N, T), q.id === "w" ? "{ opacity: 0, scale: 0.8 }" : "{ opacity: 0, y: 20 }")).join("");
    const extra = `.vcard{position:absolute;left:140px;right:140px;top:${top + 30}px;bottom:70px;border-radius:24px;background:#1c2350;border:4px solid #4f6bed;padding:36px 48px;display:flex;flex-direction:column;justify-content:center;gap:16px}.vw{font-size:84px;font-weight:700;color:#ffd166}.vp{font-size:32px;color:#56B4E9;display:flex;gap:18px;align-items:center}.vp em{font-size:22px;padding:2px 14px;border-radius:14px;background:#009E73;color:#fff;font-style:normal}.vm{font-size:42px}.ve{font-size:30px;color:#c9d0ff;margin-top:10px;font-style:italic}.vt{font-size:26px;color:#9aa3d0}`;
    return doc(spec, css(top, extra), `<div class="vcard">\n${els.join("\n")}\n</div>`, js);
  }

  if (spec.template === "can_bang_phuong_trinh_hoa_hoc") {
    const { chatThamGia: L, sanPham: R, heSoCuoi: H } = spec.params;
    const sides = (names: string[], off: number, ids: number[]) => names.map((nm, i) => `<span class="co" id="co${ids[i]}">${(H[off + i] as number) > 1 ? H[off + i] : ""}</span><span class="fm">${chem(nm)}</span>`).join('<span class="pl"> + </span>');
    const all = L.length + R.length;
    const eq = `${sides(L, 0, L.map((_x, i) => i))}<span class="ar"> → </span>${sides(R, L.length, R.map((_x, i) => L.length + i))}`;
    const els = [clip("eq", "eq", `left:40px;right:40px;top:${top + 150}px`, eq, 0.3, T, trk())];
    let js = fadeIn("eq", 0.3, "{ opacity: 0, y: 20 }", 0.6);
    // hệ số hiện lần lượt, bật sáng rồi chuyển sang màu thường
    for (let i = 0; i < all; i++) {
      const t = r2(1.6 + ((T - 3.4) * i) / all);
      js += `tl.fromTo("#co${i}", { opacity: 0, scale: 0.3, color: "#ffd166" }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2.4)" }, ${t});\ntl.to("#co${i}", { color: "#56B4E9", duration: 0.4 }, ${r2(t + 0.9)});\n`;
    }
    els.push(clip("ok", "okm", `left:0;right:0;top:${top + 340}px`, "Phương trình đã cân bằng: số nguyên tử mỗi nguyên tố hai vế bằng nhau", r2(Math.max(T - 1.8, 2)), T, trk()));
    js += fadeIn("ok", r2(Math.max(T - 1.8, 2)));
    const extra = `.eq{position:absolute;text-align:center;font-size:62px;white-space:nowrap}.fm{padding:0 4px}.co{display:inline-block;min-width:34px;color:#56B4E9;font-weight:700}.ar,.pl{color:#9aa3d0;padding:0 10px}sub{font-size:.6em}.okm{position:absolute;text-align:center;font-size:30px;color:#009E73;font-weight:700}`;
    return doc(spec, css(top, extra), els.join("\n"), js);
  }

  // cay_xac_suat
  if (spec.template !== "cay_xac_suat") throw new Error(`Mẫu chưa hỗ trợ: ${spec.template}`);
  const p = spec.params;
  const branches = p.cacNhanh;
  type Leaf = { label: string; prob: number; y: number };
  const leaves: { b: number; label: string; prob: number; edge?: number }[] = [];
  branches.forEach((b, bi) => {
    if (b.con?.length) for (const c of b.con) leaves.push({ b: bi, label: `${b.ten}, ${c.ten}`, prob: b.xs * c.xs, edge: c.xs });
    else leaves.push({ b: bi, label: b.ten, prob: b.xs });
  });
  const y0 = spec.tieuDe ? 170 : 110;
  const y1 = HF_H - 90;
  const step = (y1 - y0) / Math.max(leaves.length - 1, 1);
  const placed: Leaf[] = leaves.map((l, i) => ({ ...l, y: leaves.length === 1 ? (y0 + y1) / 2 : y0 + i * step }));
  const bY = branches.map((_b, bi) => {
    const ls = placed.filter((l) => leaves[placed.indexOf(l)]?.b === bi);
    return ls.reduce((a, l) => a + l.y, 0) / ls.length;
  });
  const X0 = 150;
  const X1 = 520;
  const X2 = 960;
  const rootY = (y0 + y1) / 2;
  const els: string[] = [];
  let js = "";
  const fmtP = (v: number) => String(Math.round(v * 1000) / 1000).replace(".", ",");
  const line = (id: string, x1: number, y1_: number, x2: number, y2: number, t: number) => {
    els.push(clip(id, "ln2", "inset:0", `<svg width="${HF_W}" height="${HF_H}" viewBox="0 0 ${HF_W} ${HF_H}"><line id="${id}s" x1="${x1}" y1="${y1_}" x2="${x2}" y2="${y2}" pathLength="1" stroke="#9aa3d0" stroke-width="3" stroke-dasharray="1" stroke-dashoffset="1"/></svg>`, t, T, trk()));
    js += `tl.to("#${id}s", { strokeDashoffset: 0, duration: 0.5, ease: "power2.out" }, ${t});\n`;
  };
  const node = (id: string, x: number, y: number, html: string, cls: string, t: number) => {
    els.push(clip(id, cls, `left:${x - 80}px;top:${y - 22}px;width:160px`, html, t, T, trk()));
    js += fadeIn(id, t, "{ opacity: 0, scale: 0.8 }", 0.35);
  };
  const lab = (id: string, x: number, y: number, text: string, t: number) => {
    els.push(clip(id, "pl2", `left:${x - 40}px;top:${y - 30}px;width:80px`, text, t, T, trk()));
    js += fadeIn(id, t, "{ opacity: 0 }", 0.3);
  };
  const total = 1 + branches.length + leaves.length;
  let k = 0;
  node("root", X0, rootY, esc(p.goc ?? "Bắt đầu"), "nd root", at(k++, total, T));
  branches.forEach((b, bi) => {
    const t = at(k++, total, T);
    line(`e${bi}`, X0 + 80, rootY, X1 - 80, bY[bi] as number, t);
    lab(`p${bi}`, (X0 + X1) / 2, ((rootY + (bY[bi] as number)) / 2), fmtP(b.xs), t);
    node(`n${bi}`, X1, bY[bi] as number, esc(b.ten), "nd", t);
  });
  placed.forEach((l, i) => {
    const t = at(k++, total, T);
    const edge = leaves[i]?.edge;
    if (edge !== undefined) {
      line(`f${i}`, X1 + 80, bY[leaves[i]?.b as number] as number, X2 - 80, l.y, t);
      lab(`q${i}`, (X1 + X2) / 2, ((bY[leaves[i]?.b as number] as number) + l.y) / 2, fmtP(edge), t);
    }
    node(`l${i}`, X2, l.y, `${esc(l.label)}<br><small>= ${fmtP(l.prob)}</small>`, "nd leaf", t);
  });
  const extra = `.nd{position:absolute;text-align:center;font-size:22px;padding:8px 6px;border-radius:12px;background:#1c2350;border:3px solid #56B4E9}.root{border-color:#ffd166;font-weight:700}.leaf{border-color:#009E73;background:#14392f;font-size:20px}.leaf small{font-size:22px;color:#F0E442;font-weight:700}.pl2{position:absolute;text-align:center;font-size:22px;color:#F0E442;font-weight:700}.ln2{position:absolute}`;
  return doc(spec, css(top, extra), els.join("\n"), js);
}
