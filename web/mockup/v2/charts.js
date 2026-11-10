/* EDUVN v2 — biểu đồ SVG tự vẽ (không thư viện). Vẽ theo bề rộng thật của khung
   (ResizeObserver) để chữ trục luôn 12px, không bị co giãn theo viewBox.
   Quy tắc (dataviz): cột ≤ 24px, đầu bo 4px vuông ở đáy, khe 2px, lưới sợi tóc liền,
   nhãn chọn lọc, mọi giá trị có tooltip + bảng tương đương. */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const vn = (x, d = 1) => x.toLocaleString("vi-VN", { minimumFractionDigits: d, maximumFractionDigits: d });
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // cột có đầu bo 4px, đáy vuông
  const colPath = (x, y, w, h, r = 4) => { r = Math.min(r, h, w / 2); return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`; };
  const barPath = (x, y, w, h, r = 4) => { r = Math.min(r, w, h / 2); return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`; };
  function mount(el, draw) {
    const go = () => { const w = el.clientWidth; if (w > 0) el.innerHTML = draw(w); };
    new ResizeObserver(go).observe(el); go();
  }

  /* Phổ điểm: cột theo khoảng 1 điểm (0–10), vạch ngưỡng đạt, đánh dấu trung vị */
  function histogram(el, { bins, threshold = 5, median, height = 220, unit = "HS" }) {
    mount(el, (W) => {
      const m = { t: 34, r: 8, b: 36, l: 32 }, w = W - m.l - m.r, h = height - m.t - m.b;
      const max = Math.max(...bins.map((b) => b.n)), step = Math.max(1, Math.ceil(max / 4)), top = step * 4;
      const n = bins.length, band = w / n, bw = Math.min(24, band - 2);
      const y = (v) => m.t + h - (v / top) * h, x = (v) => m.l + (v / 10) * w;
      let s = `<svg class="chart" width="${W}" height="${height}" role="img" aria-label="Phổ điểm">`;
      s += `<g class="grid">`; for (let v = 0; v <= top; v += step) s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`; s += `<text x="${m.l - 8}" y="${m.t - 20}" text-anchor="end">${unit}</text></g>`;
      bins.forEach((b, i) => {
        const bx = m.l + i * band + (band - bw) / 2, by = y(b.n), bh = m.t + h - by;
        const below = b.x1 <= threshold;
        s += `<g class="g" tabindex="0" data-tip="${b.n} ${unit}|Điểm ${b.x0}–${b.x1}${i === n - 1 ? "" : " (chưa gồm " + b.x1 + ")"}"><rect class="hit" x="${m.l + i * band}" y="${m.t}" width="${band}" height="${h}"/>${b.n ? `<path class="mark" d="${colPath(bx, by, bw, bh)}" fill="${below ? "var(--seq-dim)" : "var(--c1)"}"/>` : ""}${b.n >= max ? `<text class="lbl-strong" x="${bx + bw / 2}" y="${by - 6}" text-anchor="middle">${b.n}</text>` : ""}</g>`;
      });
      s += `<g class="axis"><line x1="${m.l}" x2="${W - m.r}" y1="${m.t + h}" y2="${m.t + h}"/></g>`;
      for (let v = 0; v <= 10; v++) s += `<text x="${x(v)}" y="${m.t + h + 18}" text-anchor="middle">${v}</text>`;
      s += `<g class="ref"><line x1="${x(threshold)}" x2="${x(threshold)}" y1="${m.t - 8}" y2="${m.t + h}"/><text x="${x(threshold) + 6}" y="${m.t - 2}">Ngưỡng đạt ${vn(threshold)}</text></g>`;
      if (median != null) s += `<g><path d="M${x(median) - 5},${m.t + h + 26} L${x(median) + 5},${m.t + h + 26} L${x(median)},${m.t + h + 21}Z" fill="var(--ink)"/><text x="${x(median) + 9}" y="${m.t + h + 30}" class="lbl-strong" style="font-size:11px">Trung vị ${vn(median, 1)}</text></g>`;
      return s + `</svg>`;
    });
  }

  /* Độ khó từng câu: thanh ngang % làm đúng, sắp tăng dần; câu < ngưỡng gắn cờ (icon + chữ) */
  function difficulty(el, { rows, flag = 40, rowH = 26 }) {
    mount(el, (W) => {
      const m = { t: 8, r: 48, b: 28, l: 56 }, w = W - m.l - m.r, H = m.t + rows.length * rowH + m.b;
      const x = (p) => m.l + (p / 100) * w;
      let s = `<svg class="chart" width="${W}" height="${H}" role="img" aria-label="Tỉ lệ làm đúng từng câu">`;
      // vùng < ngưỡng: nền nhạt thay cho vạch (vạch sẽ cắt qua nhãn giá trị)
      s += `<rect x="${m.l}" y="${m.t}" width="${x(flag) - m.l}" height="${H - m.t - m.b}" fill="var(--bg-sunken)"/>`;
      s += `<g class="grid">`; [0, 25, 50, 75, 100].forEach((p) => (s += `<line x1="${x(p)}" x2="${x(p)}" y1="${m.t}" y2="${H - m.b}"/><text x="${x(p)}" y="${H - m.b + 18}" text-anchor="middle">${p}%</text>`)); s += `</g>`;
      rows.forEach((r, i) => {
        const yy = m.t + i * rowH, bh = Math.min(16, rowH - 8), by = yy + (rowH - bh) / 2, low = r.p < flag;
        s += `<g class="g" tabindex="0" data-tip="${r.p}% làm đúng|${esc(r.label)} · ${esc(r.topic)}"><rect class="hit" x="0" y="${yy}" width="${W}" height="${rowH}"/>`;
        s += `<text x="${m.l - 10}" y="${by + bh / 2 + 4}" text-anchor="end" ${low ? 'class="lbl-strong"' : ""}>${esc(r.label)}</text>`;
        s += `<path class="mark" d="${barPath(m.l, by, Math.max(2, x(r.p) - m.l), bh)}" fill="${low ? "var(--c2)" : "var(--c1)"}"/>`;
        s += `<text x="${x(r.p) + 6}" y="${by + bh / 2 + 4}" ${low ? 'class="lbl-strong"' : ""}>${r.p}%${low ? " ⚑" : ""}</text></g>`;
      });
      return s + `</svg>`;
    });
  }

  /* Sparkline: 2px, chấm cuối 8px có viền nền 2px */
  function spark(el, vals, { height = 28, color = "var(--c1)", min, max } = {}) {
    mount(el, (W) => {
      const lo = min ?? Math.min(...vals), hi = max ?? Math.max(...vals), p = 5;
      const x = (i) => p + (i / (vals.length - 1)) * (W - 2 * p), y = (v) => p + (1 - (v - lo) / (hi - lo || 1)) * (height - 2 * p);
      const d = vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
      const lx = x(vals.length - 1), ly = y(vals.at(-1));
      return `<svg class="chart" width="${W}" height="${height}" aria-hidden="true"><path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${lx}" cy="${ly}" r="4" fill="${color}" stroke="var(--bg-raised)" stroke-width="2"/></svg>`;
    });
  }

  /* Cột theo ngày (hoạt động 14 ngày): 1 chuỗi, nhãn chỉ ở cột hôm nay */
  function columns(el, { vals, labels, height = 120, unit = "câu", highlightLast = true }) {
    mount(el, (W) => {
      const m = { t: 18, r: 4, b: 22, l: 4 }, w = W - m.l - m.r, h = height - m.t - m.b, n = vals.length, band = w / n, bw = Math.min(16, band - 4);
      const max = Math.max(...vals, 1);
      let s = `<svg class="chart" width="${W}" height="${height}" role="img" aria-label="Hoạt động theo ngày">`;
      s += `<g class="axis"><line x1="${m.l}" x2="${W - m.r}" y1="${m.t + h}" y2="${m.t + h}"/></g>`;
      vals.forEach((v, i) => {
        const bx = m.l + i * band + (band - bw) / 2, bh = (v / max) * h, by = m.t + h - bh, last = i === n - 1 && highlightLast;
        s += `<g class="g" tabindex="0" data-tip="${v} ${unit}|${labels[i]}"><rect class="hit" x="${m.l + i * band}" y="${m.t}" width="${band}" height="${h}"/>${v ? `<path class="mark" d="${colPath(bx, by, bw, bh, 3)}" fill="${last ? "var(--c1)" : "var(--seq-dim)"}"/>` : `<rect x="${bx}" y="${m.t + h - 2}" width="${bw}" height="2" fill="var(--chart-grid)"/>`}${last ? `<text class="lbl-strong" x="${bx + bw / 2}" y="${by - 6}" text-anchor="middle">${v}</text>` : ""}</g>`;
        if (i === 0 || i === n - 1 || i === Math.floor(n / 2)) s += `<text x="${i === 0 ? bx : i === n - 1 ? bx + bw : bx + bw / 2}" y="${height - 6}" text-anchor="${i === 0 ? "start" : i === n - 1 ? "end" : "middle"}">${labels[i]}</text>`;
      });
      return s + `</svg>`;
    });
  }

  /* Thanh phân đoạn mỏng (thứ bậc NB/TH/VD/VDC): 8px, bo tròn, khe 2px */
  function segbar(el, parts) {
    const tot = parts.reduce((a, p) => a + p.v, 0);
    el.innerHTML = `<div style="display:flex;gap:2px;height:8px" role="img" aria-label="${parts.map((p) => p.l + " " + p.v).join(", ")}">${parts.filter((p) => p.v).map((p) => `<span tabindex="0" data-tip="${p.v}|${p.l}" style="flex:${p.v / tot};background:${p.c};border-radius:999px"></span>`).join("")}</div>`;
  }

  window.Charts = { histogram, difficulty, spark, columns, segbar, vn };
})();
