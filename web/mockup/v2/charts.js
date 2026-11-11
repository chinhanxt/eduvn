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
      const max = Math.max(...bins.map((b) => b.n)), step = Math.max(1, Math.ceil((max + 1) / 4)), top = step * 4, firstMax = bins.findIndex((b) => b.n === max);
      const n = bins.length, band = w / n, bw = Math.min(24, band - 2);
      const y = (v) => m.t + h - (v / top) * h, x = (v) => m.l + (v / 10) * w;
      let s = `<svg class="chart" width="${W}" height="${height}" role="img" aria-label="Phổ điểm">`;
      s += `<g class="grid">`; for (let v = 0; v <= top; v += step) s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`; s += `<text x="${m.l - 8}" y="${m.t - 20}" text-anchor="end">${unit}</text></g>`;
      bins.forEach((b, i) => {
        const bx = m.l + i * band + (band - bw) / 2, by = y(b.n), bh = m.t + h - by;
        const below = b.x1 <= threshold;
        s += `<g class="g" tabindex="0" data-tip="${b.n} ${unit}|Điểm ${b.x0}–${b.x1}${i === n - 1 ? "" : " (chưa gồm " + b.x1 + ")"}"><rect class="hit" x="${m.l + i * band}" y="${m.t}" width="${band}" height="${h}"/>${b.n ? `<path class="mark" d="${colPath(bx, by, bw, bh)}" fill="${below ? "var(--seq-dim)" : "var(--c1)"}"/>` : ""}${i === firstMax ? `<text class="lbl-strong" x="${bx + bw / 2}" y="${by - 6}" text-anchor="middle">${b.n}</text>` : ""}</g>`;
      });
      s += `<g class="axis"><line x1="${m.l}" x2="${W - m.r}" y1="${m.t + h}" y2="${m.t + h}"/></g>`;
      for (let v = 0; v <= 10; v++) s += `<text x="${x(v)}" y="${m.t + h + 18}" text-anchor="middle">${v}</text>`;
      s += `<g class="ref"><line x1="${x(threshold)}" x2="${x(threshold)}" y1="${m.t - 18}" y2="${m.t + h}"/><text x="${x(threshold) + 6}" y="${m.t - 20}">Ngưỡng đạt ${vn(threshold)}</text></g>`;
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

  /* Thang điểm 0–10 với ngưỡng: mỗi bài là một chấm có nhãn giá trị; bài mới nhất đậm.
     Trả lời: "các bài gần đây nằm trên hay dưới ngưỡng, đang lên hay xuống?" */
  function track(el, { vals, labels = [], threshold = 5, height = 34, showAxis = false }) {
    mount(el, (W) => {
      const p = 10, x = (v) => p + (v / 10) * (W - 2 * p), cy = showAxis ? 14 : height / 2 + 4, n = vals.length;
      let s = `<svg class="chart" width="${W}" height="${height + (showAxis ? 14 : 0)}" role="img" aria-label="Điểm ${n} bài gần nhất: ${vals.map((v) => vn(v, 2).replace(/,?0+$/, "")).join(", ")}">`;
      s += `<rect x="${p}" y="${cy - 3}" width="${x(threshold) - p}" height="6" rx="3" fill="var(--danger-bg)"/><rect x="${x(threshold)}" y="${cy - 3}" width="${W - p - x(threshold)}" height="6" rx="3" fill="var(--bg-sunken)"/>`;
      s += `<line x1="${x(threshold)}" x2="${x(threshold)}" y1="${cy - 8}" y2="${cy + 8}" stroke="var(--ink-3)" stroke-width="1"/>`;
      vals.forEach((v, i) => {
        const last = i === n - 1, r = last ? 5 : 3.5;
        s += `<g class="g" tabindex="0" data-tip="${vn(v, 2).replace(/,?0+$/, "") || "0"}|${labels[i] || "Bài " + (i + 1)}"><circle cx="${x(v)}" cy="${cy}" r="12" class="hit"/><circle cx="${x(v)}" cy="${cy}" r="${r}" fill="${last ? (v < threshold ? "var(--danger)" : "var(--ink)") : "var(--chart-axis)"}" stroke="var(--bg-raised)" stroke-width="2"/></g>`;
      });
      const lv = vals[n - 1];
      s += `<text x="${x(lv)}" y="${cy - 9}" text-anchor="middle" class="lbl-strong" style="font-size:11px">${vn(lv, 2).replace(/,?0+$/, "")}</text>`;
      if (showAxis) [0, 5, 10].forEach((t) => (s += `<text x="${x(t)}" y="${cy + 22}" text-anchor="middle" style="font-size:11px">${t}</text>`));
      return s + `</svg>`;
    });
  }

  /* Cơ cấu học lực một lớp: thanh 20px chia Giỏi/Khá/TB/Yếu, số HS in trong khối nếu đủ chỗ */
  const GRADE = [["Giỏi", "var(--div-pos-2)", "#fff"], ["Khá", "var(--div-pos-1)", "#0b0b0b"], ["TB", "var(--grade-mid)", "#0b0b0b"], ["Yếu", "var(--div-neg-2)", "#fff"]];
  function gradeBar(el, counts, { height = 20 } = {}) {
    const tot = counts.reduce((a, b) => a + b, 0);
    el.innerHTML = `<div class="gbar" role="img" aria-label="${GRADE.map((g, i) => g[0] + " " + counts[i]).join(", ")} trên ${tot}" style="display:flex;gap:2px;height:${height}px">${counts.map((c, i) => c ? `<span tabindex="0" data-tip="${c} HS|${GRADE[i][0]} · ${Math.round((c / tot) * 100)}%" style="flex:${c} 1 0;min-width:22px;justify-content:center;background:${GRADE[i][1]};color:${GRADE[i][2]};border-radius:4px;display:flex;align-items:center;padding:0 4px;font:600 11px/1 var(--font-ui);font-variant-numeric:tabular-nums;overflow:hidden">${c}</span>` : "").join("")}</div>`;
  }
  const gradeLegend = () => `<div class="legend" style="font-size:12px;gap:12px">${GRADE.map((g) => `<span><i style="--c:${g[1]}"></i>${g[0]}</span>`).join("")}</div>`;

  /* Biểu đồ chấm: mỗi hàng một nhãn + một chấm trên thang chung, vạch tham chiếu, giá trị in cạnh chấm.
     Trả lời: "chủ đề nào dưới mức 50%?" */
  function dotplot(el, { rows, max = 100, ref, unit = "%", labelW = 150, rowH = 30, refLabel }) {
    mount(el, (W) => {
      const m = { t: refLabel ? 18 : 6, r: 44, b: 22, l: Math.min(labelW, W * 0.42) }, w = W - m.l - m.r, H = m.t + rows.length * rowH + m.b;
      const x = (v) => m.l + (v / max) * w;
      let s = `<svg class="chart" width="${W}" height="${H}" role="img" aria-label="${rows.map((r) => r.label + " " + (r.v ?? "chưa có") + unit).join(", ")}">`;
      s += `<g class="grid">`; [0, max / 2, max].forEach((t) => (s += `<line x1="${x(t)}" x2="${x(t)}" y1="${m.t}" y2="${H - m.b}"/><text x="${x(t)}" y="${H - 6}" text-anchor="middle">${t}${unit}</text>`)); s += `</g>`;
      if (ref != null) s += `<g class="ref"><line x1="${x(ref)}" x2="${x(ref)}" y1="${m.t - 4}" y2="${H - m.b}"/>${refLabel ? `<text x="${x(ref)}" y="${m.t - 6}" text-anchor="middle" style="font-size:11px">${refLabel}</text>` : ""}</g>`;
      rows.forEach((r, i) => {
        const cy = m.t + i * rowH + rowH / 2, low = ref != null && r.v != null && r.v < ref;
        s += `<g class="g" tabindex="0" data-tip="${r.v ?? "—"}${r.v != null ? unit : ""}|${esc(r.label)}"><rect class="hit" x="0" y="${cy - rowH / 2}" width="${W}" height="${rowH}"/>`;
        s += `<text x="${m.l - 12}" y="${cy + 4}" text-anchor="end" ${low ? 'class="lbl-strong"' : 'style="fill:var(--ink-2)"'}>${esc(r.label)}</text>`;
        s += `<line x1="${m.l}" x2="${W - m.r}" y1="${cy}" y2="${cy}" stroke="var(--chart-grid)"/>`;
        if (r.v != null) s += `<line x1="${m.l}" x2="${x(r.v)}" y1="${cy}" y2="${cy}" stroke="${low ? "var(--c2)" : "var(--c1)"}" stroke-width="2"/><circle cx="${x(r.v)}" cy="${cy}" r="5" fill="${low ? "var(--c2)" : "var(--c1)"}" stroke="var(--bg-raised)" stroke-width="2"/><text x="${x(r.v) + 10}" y="${cy + 4}" ${low ? 'class="lbl-strong"' : ""}>${r.v}${unit}</text>`;
        else s += `<text x="${m.l + 4}" y="${cy + 4}" style="font-size:11px">chưa học</text>`;
        s += `</g>`;
      });
      return s + `</svg>`;
    });
  }

  /* Dải giờ trong ngày: trục giờ có nhãn, mỗi việc một mốc có nhãn — trả lời "việc nào lúc nào, bây giờ ở đâu?" */
  function dayline(el, { from = 7, to = 22, now, events, height = 64, ink = "var(--ink)", sub = "var(--ink-3)", line = "var(--chart-axis)" }) {
    mount(el, (W) => {
      const p = 12, x = (h) => p + ((h - from) / (to - from)) * (W - 2 * p), y = 24;
      let s = `<svg class="chart" width="${W}" height="${height}" role="img" aria-label="Lịch hôm nay: ${events.map((e) => e.t + " " + e.l).join(", ")}">`;
      s += `<line x1="${p}" x2="${W - p}" y1="${y}" y2="${y}" stroke="${line}" stroke-width="2" stroke-linecap="round"/>`;
      for (let h = from; h <= to; h += 3) s += `<line x1="${x(h)}" x2="${x(h)}" y1="${y - 4}" y2="${y + 4}" stroke="${line}"/><text x="${x(h)}" y="${y + 18}" text-anchor="middle" style="fill:${sub};font-size:11px">${h}h</text>`;
      if (now != null) s += `<line x1="${p}" x2="${x(now)}" y1="${y}" y2="${y}" stroke="${ink}" stroke-width="2" stroke-linecap="round"/><circle cx="${x(now)}" cy="${y}" r="4" fill="${ink}"/>`;
      events.forEach((e) => {
        const [hh, mm] = e.t.split(":").map(Number), cx = x(hh + mm / 60);
        s += `<g class="g" tabindex="0" data-tip="${e.t}|${esc(e.l)}"><circle cx="${cx}" cy="${y}" r="12" class="hit"/><rect x="${cx - 6}" y="${y - 6}" width="12" height="12" rx="3" transform="rotate(45 ${cx} ${y})" fill="${e.c || ink}" stroke="var(--_dl-bg, var(--bg-raised))" stroke-width="2"/><text x="${cx < 60 ? cx - 6 : cx}" y="${y - 12}" text-anchor="${cx < 60 ? "start" : "middle"}" style="fill:${ink};font-size:11px;font-weight:600">${e.t}${W > 600 && e.s ? " · " + esc(e.s) : ""}</text></g>`;
      });
      return s + `</svg>`;
    });
  }

  /* Lịch nhiệt: cột = tuần, hàng = thứ; màu theo bậc (thang 4 bậc có chú giải số) */
  function heatmap(el, { vals, endLabel = "Hôm nay", bins = [0, 1, 10, 20], unit = "câu", startDow = 0 }) {
    const steps = ["var(--chart-grid)", "var(--seq-250)", "var(--seq-400)", "var(--seq-650)"];
    const lvl = (v) => (v >= bins[3] ? 3 : v >= bins[2] ? 2 : v >= bins[1] ? 1 : 0);
    const days = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    const cells = Array(startDow).fill(null).concat(vals); const weeks = Math.ceil(cells.length / 7);
    let h = `<div style="display:grid;grid-template-columns:22px repeat(${weeks},minmax(10px,16px));grid-template-rows:repeat(7,minmax(10px,16px));grid-auto-flow:column;gap:3px;font-size:10px;color:var(--ink-3)" role="img" aria-label="${vals.length} ngày, ${vals.filter((v) => v >= bins[2]).length} ngày từ ${bins[2]} ${unit}">`;
    h += days.map((d, i) => `<span style="grid-column:1;grid-row:${i + 1};align-self:center">${i % 2 ? "" : d}</span>`).join("");
    cells.forEach((v, i) => { const last = i === cells.length - 1; h += v == null ? `<span></span>` : `<span tabindex="0" data-tip="${v} ${unit}|${last ? endLabel : (cells.length - 1 - i) + " ngày trước"}" style="border-radius:3px;background:${steps[lvl(v)]};${last ? "outline:2px solid var(--ink);outline-offset:1px" : ""}"></span>`; });
    h += `</div><div class="legend" style="font-size:11px;gap:10px;margin-top:8px"><span><i style="--c:${steps[0]}"></i>0</span><span><i style="--c:${steps[1]}"></i>${bins[1]}–${bins[2] - 1}</span><span><i style="--c:${steps[2]}"></i>${bins[2]}–${bins[3] - 1}</span><span><i style="--c:${steps[3]}"></i>${bins[3]}+ ${unit}</span></div>`;
    el.innerHTML = h;
  }

  /* Cột theo ngày: trục y có vạch số, vạch mục tiêu, nhãn ở cột hôm nay */
  function columns(el, { vals, labels, height = 140, unit = "câu", target, highlightLast = true }) {
    mount(el, (W) => {
      const m = { t: 18, r: 4, b: 22, l: 28 }, w = W - m.l - m.r, h = height - m.t - m.b, n = vals.length, band = w / n, bw = Math.min(16, band - 4);
      const max0 = Math.max(...vals, target || 0, 1), step = Math.ceil(max0 / 3 / 5) * 5, top = step * 3;
      const y = (v) => m.t + h - (v / top) * h;
      let s = `<svg class="chart" width="${W}" height="${height}" role="img" aria-label="Số ${unit} mỗi ngày, ${n} ngày">`;
      s += `<g class="grid">`; for (let v = 0; v <= top; v += step) s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${m.l - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`; s += `</g>`;
      vals.forEach((v, i) => {
        const bx = m.l + i * band + (band - bw) / 2, by = y(v), bh = m.t + h - by, last = i === n - 1 && highlightLast;
        const miss = target && v < target;
        s += `<g class="g" tabindex="0" data-tip="${v} ${unit}|${labels[i]}${target ? (miss ? " · dưới mục tiêu" : " · đạt mục tiêu") : ""}"><rect class="hit" x="${m.l + i * band}" y="${m.t}" width="${band}" height="${h}"/>${v ? `<path class="mark" d="${colPath(bx, by, bw, bh, 3)}" fill="${last ? "var(--c1)" : "var(--seq-dim)"}"/>` : ""}${last ? `<text class="lbl-strong" x="${bx + bw / 2}" y="${by - 6}" text-anchor="middle">${v}</text>` : ""}</g>`;
        if (i === 0 || i === n - 1 || i === Math.floor(n / 2)) s += `<text x="${i === 0 ? bx : i === n - 1 ? bx + bw : bx + bw / 2}" y="${height - 6}" text-anchor="${i === 0 ? "start" : i === n - 1 ? "end" : "middle"}">${labels[i]}</text>`;
      });
      if (target) s += `<g class="ref"><line x1="${m.l}" x2="${W - m.r}" y1="${y(target)}" y2="${y(target)}" stroke-dasharray="0"/><text x="${m.l + 4}" y="${y(target) - 5}" style="font-size:11px;paint-order:stroke;stroke:var(--bg-raised);stroke-width:3px">Mục tiêu ${target}</text></g>`;
      s += `<g class="axis"><line x1="${m.l}" x2="${W - m.r}" y1="${m.t + h}" y2="${m.t + h}"/></g>`;
      return s + `</svg>`;
    });
  }

  /* Thanh phân đoạn mỏng (thứ bậc NB/TH/VD/VDC): 8px, bo tròn, khe 2px */
  function segbar(el, parts) {
    const tot = parts.reduce((a, p) => a + p.v, 0);
    el.innerHTML = `<div style="display:flex;gap:2px;height:8px" role="img" aria-label="${parts.map((p) => p.l + " " + p.v).join(", ")}">${parts.filter((p) => p.v).map((p) => `<span tabindex="0" data-tip="${p.v}|${p.l}" style="flex:${p.v / tot};background:${p.c};border-radius:999px"></span>`).join("")}</div>`;
  }

  window.Charts = { histogram, difficulty, track, gradeBar, gradeLegend, dotplot, dayline, heatmap, columns, segbar, vn };
})();
