/* Khung cuối cho 2 cổng (GV = skin B, Học = skin C). Code thật: ui/Shell.tsx nhận props {portal, nav, crumb}.
   <html data-portal="gv|hoc"> <body data-nav="khoá" data-crumb="A|B"> ; nội dung trong <main id="main">.
   data-focus trên body = chế độ tập trung (không dựng khung). */
(function () {
  const { ic } = window.UI;
  const b = document.body, main = document.getElementById("main");
  const portal = document.documentElement.dataset.portal, cur = b.dataset.nav;
  if (!main || b.hasAttribute("data-focus")) return;

  const NAV = {
    gv: [
      ["hom-nay", "home", "Hôm nay", "hom-nay.html", "", "G H"],
      ["lop", "users", "Lớp học", "lop.html", "4", "G L"],
      ["cham-bai", "inbox", "Chấm bài", "cham-bai.html", "23", "G C", true],
      ["ket-qua", "chart", "Kết quả", "ket-qua.html", "", "G K"],
      ["-", "Soạn"],
      ["ngan-hang", "bank", "Ngân hàng câu hỏi", "ngan-hang.html", "", "G N"],
      ["de-thi", "exam", "Đề thi", "soan-de.html", "", "G D"],
      ["bai-giang", "spark", "Bài giảng AI", "#"],
      ["giao-an", "book", "Giáo án", "#"],
      ["bang-giang", "board", "Bảng giảng", "#"],
    ],
    hoc: [
      ["hom-nay", "home", "Hôm nay", "hom-nay.html"],
      ["bai-tap", "exam", "Bài tập", "lam-bai.html", "3"],
      ["luyen-tap", "layers", "Luyện tập", "luyen-tap.html", "12"],
      ["gia-su", "bot", "Gia sư", "gia-su.html"],
      ["giao-trinh", "book", "Giáo trình", "giao-trinh.html"],
      ["ket-qua", "chart", "Kết quả", "ket-qua.html"],
      ["-", "Môn học"],
      ["toan", "", "Toán 10", "giao-trinh.html", "", "", false, "var(--c1)"],
      ["van", "", "Ngữ văn 10", "#", "", "", false, "var(--c2)"],
      ["anh", "", "Tiếng Anh 10", "#", "", "", false, "var(--c3)"],
    ],
  }[portal];

  const link = (n) => n[0] === "-"
    ? `<div class="grp eyebrow">${n[1]}</div><div class="grp-line"></div>`
    : `<a href="${n[3]}" ${n[0] === cur ? 'aria-current="page"' : ""} title="${n[2]}" ${n[7] ? 'class="subj-link"' : ""}>${n[7] ? `<i class="dot" style="--c:${n[7]}"></i>` : ic(n[1])}<span>${n[2]}</span>${n[4] ? `<em class="count ${n[6] ? "hot" : ""}" style="font-style:normal">${n[4]}</em>` : ""}${n[5] ? `<kbd class="nk">${n[5]}</kbd>` : ""}</a>`;

  const crumbs = (b.dataset.crumb || "").split("|").filter(Boolean);
  const crumbHtml = crumbs.map((c, i) => (i < crumbs.length - 1 ? `<a href="#" ${i === crumbs.length - 2 ? 'class="parent"' : ""}>${c}</a><span class="sep">/</span>` : `<span aria-current="page">${c}</span>`)).join("");
  const who = portal === "gv" ? ["LA", "Cô Lan Anh · THPT Chu Văn An", "Giáo viên"] : ["MA", "Nguyễn Minh Anh · 10A1", "Học sinh"];

  window.CMDS = window.CMDS || [
    ...NAV.filter((n) => n[0] !== "-").map((n) => ({ g: "Trang", t: n[2], i: n[1] || "book", href: n[3] })),
    ...(portal === "gv"
      ? [{ g: "Lớp", t: "10A1 · Toán 10", i: "users", href: "lop.html" }, { g: "Lớp", t: "10A3 · Toán 10", i: "users", href: "lop.html" }, { g: "Thao tác", t: "Tạo đề mới", i: "plus", href: "soan-de.html", k: "N" }, { g: "Thao tác", t: "Chấm KT 15′ 10A3", i: "grade", href: "cham-bai.html", k: "C" }]
      : [{ g: "Thao tác", t: "Làm tiếp Luyện tập Hàm số bậc hai", i: "play", href: "lam-bai.html" }, { g: "Thao tác", t: "Hỏi gia sư", i: "chat", href: "gia-su.html" }]),
    { g: "Thao tác", t: "Đổi giao diện sáng/tối", i: "moon", href: "javascript:UI.toggleTheme()" },
  ];

  const app = document.createElement("div");
  app.className = "app";
  app.innerHTML = `<a class="skip" href="#main">Tới nội dung</a>
    <aside class="side" aria-label="Điều hướng">
      <div class="brand"><span class="mark">${ic("cap")}</span><span class="txt">EDUVN</span><span class="tag">${who[2]}</span></div>
      <nav class="nav">${NAV.map(link).join("")}</nav>
      ${portal === "hoc" ? `<div class="streak-mini">${ic("flame")}<div><b>12 ngày</b><small>học liên tiếp · dài nhất 15</small></div></div>` : ""}
      <div class="side-foot">
        ${portal === "gv" ? `<a href="#" title="Kết nối AI">${ic("plug")}<span>Kết nối AI</span></a>` : ""}
        <button class="collapse-btn" data-act="collapse" title="Thu gọn">${ic("panel")}<span>Thu gọn</span></button>
      </div>
    </aside>
    <div class="content" style="min-width:0">
      <header class="top">
        <button class="btn ghost icon menu-btn" data-act="drawer" aria-label="Mở menu">${ic("menu")}</button>
        <nav class="crumb" aria-label="Vị trí">${crumbHtml}</nav>
        <div class="grow"></div>
        <div class="ctx" aria-hidden="true"></div>
        <button class="cmd-trigger" data-act="cmdk" aria-label="Tìm nhanh">${ic("search", "sm")}<span class="txt">Tìm nhanh…</span><kbd>Ctrl K</kbd></button>
        ${portal === "hoc" ? `<span class="streak show-sm" title="Chuỗi ngày học">${ic("flame", "sm")}12</span>` : ""}
        <button class="btn ghost icon hide-sm" data-act="theme" aria-label="Đổi sáng/tối">${ic("moon")}</button>
        <button class="btn ghost icon" aria-label="Thông báo (3 mới)" style="position:relative">${ic("bell")}<i style="position:absolute;top:6px;right:7px;width:7px;height:7px;border-radius:50%;background:var(--danger);box-shadow:0 0 0 2px var(--bg)"></i></button>
        <span class="avatar" title="${who[1]}">${who[0]}</span>
      </header>
    </div>`;
  b.prepend(app);
  main.classList.add("page");
  app.querySelector(".content").append(main);
  if (localStorage.getItem("eduvn-side") === "mini") app.classList.add("mini");

  if (portal === "hoc") {
    const tab = document.createElement("nav");
    tab.className = "tabbar"; tab.setAttribute("aria-label", "Điều hướng");
    tab.innerHTML = NAV.filter((n) => n[1] && !["ket-qua"].includes(n[0])).slice(0, 5).map((n) => `<a href="${n[3]}" ${n[0] === cur ? 'aria-current="page"' : ""}>${ic(n[1])}<span>${n[2]}</span></a>`).join("");
    b.append(tab); b.classList.add("has-tabbar");
  }

  // nút chính nhân bản lên thanh trên khi khối nút đầu trang cuộn khuất
  const top = app.querySelector(".top"), head = document.querySelector(".page-head");
  const primary = head && head.querySelector(".acts .btn.primary");
  if (primary) {
    const ctx = top.querySelector(".ctx"), clone = primary.cloneNode(true);
    clone.className = "btn primary sm"; clone.removeAttribute("id");
    clone.addEventListener("click", (e) => { e.preventDefault(); primary.click(); });
    ctx.append(clone);
    new IntersectionObserver(([en]) => { const on = !en.isIntersecting; top.classList.toggle("compact", on); ctx.setAttribute("aria-hidden", !on); }, { rootMargin: `-${top.offsetHeight}px 0px 0px 0px` }).observe(head.querySelector(".acts") || head);
  }
})();
