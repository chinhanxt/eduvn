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

  /* ---------- Toast: hàng đợi, tối đa 3 hiển thị, tự tắt, dừng khi rê chuột, hoàn tác ---------- */
  let region = null; const queue = []; const MAX = 3;
  function ensureRegion() {
    if (!region) { region = document.createElement("div"); region.className = "toasts"; region.setAttribute("role", "status"); region.setAttribute("aria-live", "polite"); document.body.append(region); }
    return region;
  }
  UI.toast = (opt) => { queue.push(opt); pump(); };
  function pump() {
    const r = ensureRegion();
    while (queue.length && r.children.length < MAX) show(queue.shift());
  }
  function show({ title, msg = "", kind = "ok", undo, life = 5000 }) {
    const el = document.createElement("div");
    el.className = "toast"; el.style.setProperty("--life", life + "ms");
    const icon = { ok: ["ok", "ic-ok"], err: ["err", "ic-err"], info: ["info", "ic-info"] }[kind];
    el.innerHTML = `${ic(icon[0], icon[1])}<div class="msg"><b></b><span></span></div>${undo ? '<button class="act">Hoàn tác</button>' : ""}<button class="close" aria-label="Đóng">${ic("x", "sm")}</button><i class="life"></i>`;
    el.querySelector("b").textContent = title; el.querySelector(".msg span").textContent = msg;
    let left = life, start = Date.now(), timer;
    const close = () => { clearTimeout(timer); el.classList.add("out"); el.addEventListener("animationend", () => { el.remove(); pump(); }, { once: true }); };
    const arm = () => { start = Date.now(); timer = setTimeout(close, left); };
    el.addEventListener("mouseenter", () => { clearTimeout(timer); left -= Date.now() - start; });
    el.addEventListener("mouseleave", arm);
    el.querySelector(".close").onclick = close;
    if (undo) el.querySelector(".act").onclick = () => { undo(); close(); };
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

  /* ---------- Skeleton → nội dung (giả lập tải lần đầu) ---------- */
  UI.reveal = (ms = 700) => setTimeout(() => $$("[data-skel]").forEach((s) => { s.hidden = true; const real = s.nextElementSibling; if (real) { real.hidden = false; real.classList.add("enter"); } }), ms);
})();
