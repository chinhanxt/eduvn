/* EDUVN v2 — hành vi dùng chung cho mockup (sẽ thành gói ui/ khi code thật).
   Không thư viện ngoài. Mỗi hàm nhỏ, tự đứng được. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ic = (id, cls = "") => `<svg class="i ${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const root = document.documentElement;
  const UI = (window.UI = { $, $$, ic });

  /* ---------- Giao diện sáng/tối (nhớ lựa chọn) ---------- */
  const saved = localStorage.getItem("eduvn-theme");
  if (saved) root.dataset.theme = saved;
  const qsTheme = new URLSearchParams(location.search).get("theme");
  if (qsTheme) root.dataset.theme = qsTheme;
  UI.toggleTheme = () => {
    const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.dataset.theme = dark ? "light" : "dark";
    localStorage.setItem("eduvn-theme", root.dataset.theme);
  };

  /* ---------- Sidebar: thu gọn (desktop) / ngăn kéo (di động) ---------- */
  const app = $(".app");
  if (app && localStorage.getItem("eduvn-side") === "mini") app.classList.add("mini");
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-act]");
    if (!t) { if (app && app.classList.contains("drawer") && !e.target.closest(".side")) app.classList.remove("drawer"); return; }
    const act = t.dataset.act;
    if (act === "collapse") { app.classList.toggle("mini"); localStorage.setItem("eduvn-side", app.classList.contains("mini") ? "mini" : ""); }
    if (act === "drawer") { e.stopPropagation(); app.classList.toggle("drawer"); }
    if (act === "theme") UI.toggleTheme();
    if (act === "cmdk") UI.openCmdk();
  });

  /* ---------- Toast: nhẹ, một dòng, tối đa 2 hiển thị, còn lại xếp hàng; tự tắt, dừng khi rê chuột; Hoàn tác ---------- */
  let region = null; const queue = []; const MAX = 2;
  function ensureRegion() {
    if (!region) { region = document.createElement("div"); region.className = "toasts"; region.setAttribute("role", "status"); region.setAttribute("aria-live", "polite"); document.body.append(region); }
    return region;
  }
  UI.toast = (opt) => { queue.push(opt); pump(); };
  function pump() { const r = ensureRegion(); while (queue.length && r.children.length < MAX) show(queue.shift()); }
  function show({ title, msg = "", kind = "ok", undo, action, life }) {
    life = life || (undo ? 8000 : 4000);
    const el = document.createElement("div");
    el.className = "toast " + kind;
    const icon = { ok: "ok", err: "err", info: "info" }[kind];
    const act = undo ? "Hoàn tác" : action ? action.label : "";
    el.innerHTML = `${ic(icon)}<div class="msg"><b></b><span></span></div>${act ? `<button class="act">${act}</button>` : ""}<button class="close" aria-label="Đóng">${ic("x", "sm")}</button>`;
    el.querySelector("b").textContent = title; el.querySelector(".msg span").textContent = msg;
    el.title = msg ? title + " — " + msg : title;
    let left = life, start = Date.now(), timer;
    const close = () => { clearTimeout(timer); el.classList.add("out"); el.addEventListener("animationend", () => { el.remove(); pump(); }, { once: true }); };
    const arm = () => { start = Date.now(); timer = setTimeout(close, left); };
    el.addEventListener("mouseenter", () => { clearTimeout(timer); left -= Date.now() - start; });
    el.addEventListener("mouseleave", arm);
    el.querySelector(".close").onclick = close;
    if (act) el.querySelector(".act").onclick = () => { (undo || action.run)(); close(); };
    ensureRegion().append(el); arm();
  }

  /* ---------- Nút chống bấm lặp: data-busy="ms" → khoá, quay, xong ✓, mở lại ----------
     Thật: khoá theo promise của request + idempotency key; mockup: giả lập thời gian. */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-busy]");
    if (!b || b.getAttribute("aria-busy") === "true" || b.classList.contains("is-done")) return;
    e.preventDefault();
    const ms = +b.dataset.busy || 900, html = b.innerHTML, w = b.offsetWidth;
    b.style.minWidth = w + "px"; b.setAttribute("aria-busy", "true");
    setTimeout(() => {
      b.removeAttribute("aria-busy");
      if (b.dataset.done) { b.classList.add("is-done"); b.innerHTML = `${ic("check", "sm")}<span>${b.dataset.done}</span>`; }
      if (b.dataset.toast) UI.toast({ title: b.dataset.toast, msg: b.dataset.toastMsg || "", undo: b.dataset.undo ? () => UI.toast({ title: "Đã hoàn tác", kind: "info", life: 2500 }) : null });
      setTimeout(() => { b.classList.remove("is-done"); b.innerHTML = html; b.style.minWidth = ""; }, b.dataset.done ? 1400 : 0);
    }, ms);
  });

  /* ---------- Bảng lệnh Ctrl+K ---------- */
  const CMDS = window.CMDS || [];
  let scrim = null, sel = 0;
  UI.openCmdk = () => {
    if (!scrim) {
      scrim = document.createElement("div"); scrim.className = "scrim"; scrim.hidden = true;
      scrim.innerHTML = `<div class="cmdk" role="dialog" aria-label="Bảng lệnh"><div class="q">${ic("search")}<input placeholder="Tìm trang, lớp, học sinh, câu hỏi…" aria-label="Tìm"><kbd>Esc</kbd></div><div class="res" role="listbox"></div><div class="foot"><span><kbd>↑</kbd> <kbd>↓</kbd> chọn</span><span><kbd>↵</kbd> mở</span><span><kbd>Ctrl</kbd> <kbd>K</kbd> mở/đóng</span></div></div>`;
      document.body.append(scrim);
      scrim.addEventListener("click", (e) => { if (e.target === scrim) closeCmdk(); });
      const inp = $("input", scrim);
      inp.addEventListener("input", () => { sel = 0; render(inp.value); });
      inp.addEventListener("keydown", (e) => {
        const items = $$(".res a", scrim);
        if (e.key === "ArrowDown") { sel = Math.min(sel + 1, items.length - 1); mark(); e.preventDefault(); }
        if (e.key === "ArrowUp") { sel = Math.max(sel - 1, 0); mark(); e.preventDefault(); }
        if (e.key === "Enter" && items[sel]) location.href = items[sel].href;
      });
    }
    scrim.hidden = false; render(""); const inp = $("input", scrim); inp.value = ""; inp.focus();
  };
  function closeCmdk() { if (scrim) scrim.hidden = true; }
  function norm(s) { return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").toLowerCase(); }
  function render(q) {
    const nq = norm(q), groups = {};
    CMDS.filter((c) => !nq || norm(c.t).includes(nq)).slice(0, 12).forEach((c) => (groups[c.g] = groups[c.g] || []).push(c));
    const res = $(".res", scrim);
    res.innerHTML = Object.entries(groups).map(([g, cs]) => `<div class="grp eyebrow">${g}</div>` + cs.map((c) => `<a href="${c.href}" role="option">${ic(c.i)}<span>${c.t}</span>${c.k ? `<kbd>${c.k}</kbd>` : ""}</a>`).join("")).join("") || `<div class="empty" style="padding:32px"><p>Không thấy “${q.replace(/[<>&]/g, "")}”.</p></div>`;
    mark();
  }
  function mark() { $$(".res a", scrim).forEach((a, i) => a.setAttribute("aria-selected", i === sel)); const a = $$(".res a", scrim)[sel]; a && a.scrollIntoView({ block: "nearest" }); }
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); scrim && !scrim.hidden ? closeCmdk() : UI.openCmdk(); }
    if (e.key === "Escape") { closeCmdk(); $$(".scrim:not([hidden])").forEach((s) => (s.hidden = true)); }
  });

  /* ---------- Tooltip biểu đồ: phần tử có data-tip="giá trị|nhãn" ---------- */
  let tip = null;
  function showTip(el, x, y) {
    if (!tip) { tip = document.createElement("div"); tip.className = "tip"; document.body.append(tip); }
    const [v, l] = el.dataset.tip.split("|");
    tip.innerHTML = "<b></b><span></span>"; tip.firstChild.textContent = v; tip.lastChild.textContent = l || "";
    tip.style.left = x + "px"; tip.style.top = y + "px"; tip.classList.add("on");
  }
  document.addEventListener("pointermove", (e) => {
    const el = e.target.closest && e.target.closest("[data-tip]");
    if (el) { const r = el.getBoundingClientRect(); showTip(el, r.left + r.width / 2, r.top); } else if (tip) tip.classList.remove("on");
  });
  document.addEventListener("focusin", (e) => { const el = e.target.closest("[data-tip]"); if (el) { const r = el.getBoundingClientRect(); showTip(el, r.left + r.width / 2, r.top); } });
  document.addEventListener("focusout", () => tip && tip.classList.remove("on"));

  /* ---------- Streaming chữ: nhả theo cụm, ~ tốc độ SSE thật ---------- */
  UI.stream = (el, text, { cps = 90, onDone } = {}) => {
    let i = 0, last = performance.now(), stop = false;
    el.classList.add("caret");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    function step(now) {
      if (stop) return;
      const n = reduce ? text.length : Math.max(1, Math.round(((now - last) / 1000) * cps));
      last = now; i = Math.min(text.length, i + n);
      el.textContent = text.slice(0, i);
      if (i < text.length) requestAnimationFrame(step); else { el.classList.remove("caret"); onDone && onDone(); }
    }
    requestAnimationFrame(step);
    return () => { stop = true; el.classList.remove("caret"); };
  };

  /* ---------- URL giữ trạng thái: chip/seg có data-q="khoá=giá trị" ---------- */
  UI.setQuery = (k, v, push) => {
    const u = new URL(location.href);
    if (v === null || v === "") u.searchParams.delete(k); else u.searchParams.set(k, v);
    if (k !== "trang") u.searchParams.delete("trang");
    history[push ? "pushState" : "replaceState"](null, "", u);
    const shown = $("[data-url]"); if (shown) shown.textContent = u.pathname.replace(/.*\/v2\//, "/") + u.search;
  };


  /* ---------- Trạng thái vùng dữ liệu (mockup + hợp đồng cho code thật) ----------
     Mỗi vùng lấy dữ liệu đánh dấu data-region; khi code thật, <Region status> render đúng 4 nhánh:
     ok | dang-tai (skeleton cùng hình) | trong (data-empty-*) | loi (thông báo + Thử lại). Mất mạng = băng dưới thanh trên.
     Mockup: ?trang-thai=dang-tai|trong|loi|mat-mang */
  UI.states = () => {
    const qs = new URLSearchParams(location.search), st = qs.get("trang-thai");
    if (!qs.has("shot") && document.querySelector("[data-region]")) {
      const bar = document.createElement("nav"); bar.className = "mock-states"; bar.setAttribute("aria-label", "Mockup: xem trạng thái");
      bar.innerHTML = '<span>Mockup</span>' + [["", "Bình thường"], ["dang-tai", "Đang tải"], ["trong", "Trống"], ["loi", "Lỗi"], ["mat-mang", "Mất mạng"]].map(([k, l]) => `<a href="?${k ? "trang-thai=" + k : ""}" ${(st || "") === k ? 'aria-current="true"' : ""}>${l}</a>`).join("");
      document.body.append(bar);
    }
    if (!st) return;
    if (st === "mat-mang") {
      const top = document.querySelector(".top, .exam-top");
      top && top.insertAdjacentHTML("afterend", `<div class="banner" role="status">${ic("offline", "sm")}<span><b>Mất kết nối.</b> Đang hiện dữ liệu đã lưu lúc 14:02; thay đổi sẽ tự gửi khi có mạng.</span><button class="btn sm">Thử lại</button></div>`);
      return;
    }
    document.querySelectorAll("[data-region]").forEach((r) => {
      const h = r.offsetHeight; r.style.minHeight = Math.min(h, 420) + "px";
      const rows = +r.dataset.skelRows || 4;
      if (st === "dang-tai") r.innerHTML = `<div class="skel-list" aria-busy="true" aria-label="Đang tải">${Array.from({ length: rows }, (_, i) => `<div class="skel-row"><span class="skel circle" style="width:28px;height:28px"></span><div style="flex:1"><div class="skel line" style="width:${[72, 54, 64, 46][i % 4]}%"></div><div class="skel line" style="width:${[38, 30, 44, 26][i % 4]}%;height:8px"></div></div><span class="skel line" style="width:56px"></span></div>`).join("")}</div>`;
      if (st === "trong") r.innerHTML = `<div class="empty"><div class="art">${ic(r.dataset.emptyIcon || "inbox", "lg")}</div><h3>${r.dataset.emptyTitle || "Chưa có dữ liệu"}</h3><p>${r.dataset.emptyText || ""}</p>${r.dataset.emptyAct ? `<div class="acts"><button class="btn sm">${r.dataset.emptyAct}</button></div>` : ""}</div>`;
      if (st === "loi") r.innerHTML = `<div class="empty err"><div class="art">${ic("alert", "lg")}</div><h3>Không tải được</h3><p>Máy chủ không phản hồi (mã 503). Dữ liệu khác trên trang vẫn dùng được.</p><div class="acts"><button class="btn sm" data-busy="900">${ic("refresh", "sm")}<span>Thử lại</span></button></div></div>`;
    });
  };

  /* ---------- Skeleton → nội dung (giả lập tải lần đầu) ---------- */
  UI.reveal = (ms = 700) => setTimeout(() => $$("[data-skel]").forEach((s) => { s.hidden = true; const real = s.nextElementSibling; if (real) { real.hidden = false; real.classList.add("enter"); } }), ms);
})();
