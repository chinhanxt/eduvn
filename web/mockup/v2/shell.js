/* Khung 2 cổng cho mockup. Code thật: mỗi cổng 1 layout React riêng (gv/Shell.tsx, hoc/Shell.tsx).
   <body data-shell="gv|hoc" data-nav="khoá" data-crumb="A|B|C"> ; nội dung trang nằm trong <main id="main">. */
(function () {
  const { ic } = window.UI;
  const b = document.body, main = document.getElementById("main");
  const shell = b.dataset.shell, cur = b.dataset.nav;
  if (!shell || !main) return;
  // trang trong huong-a|b|c/: link tương đối lùi 1 cấp; "Hôm nay" trỏ về chính hướng đó
  const inDir = /\/huong-[abc]\//.test(location.pathname);
  const here = location.pathname.split("/").pop();
  const href = (h, key) => (h === "#" ? "#" : inDir ? (key === "trang-chu" ? here : "../" + h) : h);

  const GV = [
    ["trang-chu", "home", "Hôm nay", "gv-trang-chu.html", "", false, "G H"],
    ["lop", "users", "Lớp học", "#", "4", false, "G L"],
    ["cham", "inbox", "Chấm bài", "#", "23", true, "G C"],
    ["ket-qua", "chart", "Kết quả", "gv-ket-qua.html", "", false, "G K"],
    ["-", "Soạn"],
    ["ngan-hang", "bank", "Ngân hàng câu hỏi", "gv-ngan-hang.html", "", false, "G N"],
    ["de-thi", "exam", "Đề thi", "gv-soan-de.html", "", false, "G D"],
    ["bai-giang", "spark", "Bài giảng AI", "#"],
    ["giao-an", "book", "Giáo án", "#"],
    ["bang-giang", "board", "Bảng giảng", "#"],
    ["so-do", "graph", "Sơ đồ", "#"],
  ];
  const HOC = [
    ["trang-chu", "home", "Hôm nay", "hoc-trang-chu.html"],
    ["bai", "exam", "Bài tập", "hoc-lam-bai.html"],
    ["luyen", "layers", "Luyện tập", "hoc-luyen-tap.html"],
    ["gia-su", "bot", "Gia sư", "hoc-gia-su.html"],
    ["ket-qua", "chart", "Kết quả", "hoc-ket-qua.html"],
  ];
  window.CMDS = window.CMDS || [
    ...(shell === "gv" ? GV : HOC).filter((n) => n[0] !== "-").map((n) => ({ g: "Trang", t: n[2], i: n[1], href: n[3] })),
    ...(shell === "gv"
      ? [
          { g: "Lớp", t: "10A1 · Toán 10", i: "users", href: "gv-ket-qua.html" },
          { g: "Lớp", t: "10A3 · Toán 10", i: "users", href: "#" },
          { g: "Lớp", t: "11B2 · Toán 11", i: "users", href: "#" },
          { g: "Thao tác", t: "Tạo đề mới", i: "plus", href: "gv-soan-de.html", k: "N" },
          { g: "Thao tác", t: "Thêm câu hỏi", i: "plus", href: "gv-ngan-hang.html" },
          { g: "Thao tác", t: "Đổi giao diện sáng/tối", i: "moon", href: "javascript:UI.toggleTheme()" },
        ]
      : [
          { g: "Thao tác", t: "Hỏi gia sư", i: "chat", href: "hoc-gia-su.html" },
          { g: "Thao tác", t: "Ôn 12 thẻ hôm nay", i: "layers", href: "hoc-luyen-tap.html" },
          { g: "Thao tác", t: "Đổi giao diện sáng/tối", i: "moon", href: "javascript:UI.toggleTheme()" },
        ]),
  ];

  const crumbs = (b.dataset.crumb || "").split("|").filter(Boolean);
  const crumbHtml = crumbs.map((c, i) => (i < crumbs.length - 1 ? `<a href="#" ${i === crumbs.length - 2 ? 'class="parent"' : ""}>${c}</a><span class="sep">/</span>` : `<span aria-current="page">${c}</span>`)).join("");
  const themeBtn = `<button class="btn ghost icon hide-sm" data-act="theme" aria-label="Đổi sáng/tối">${ic("moon")}</button>`;

  if (shell === "gv") {
    const nav = GV.map((n) =>
      n[0] === "-"
        ? `<div class="grp eyebrow">${n[1]}</div><div class="grp-line"></div>`
        : `<a href="${href(n[3], n[0])}" ${n[0] === cur ? 'aria-current="page"' : ""} title="${n[2]}">${ic(n[1])}<span>${n[2]}</span>${n[4] ? `<em class="count ${n[5] ? "hot" : ""}" style="font-style:normal">${n[4]}</em>` : ""}${n[6] ? `<kbd class="nk">${n[6]}</kbd>` : ""}</a>`
    ).join("");
    const wrap = document.createElement("div");
    wrap.className = "app";
    wrap.innerHTML = `<a class="skip" href="#main">Tới nội dung</a>
      <aside class="side" aria-label="Điều hướng">
        <div class="brand"><span class="mark">${ic("cap")}</span><span class="txt">EDUVN</span><span class="tag">Giáo viên</span></div>
        <nav class="nav">${nav}</nav>
        <div class="side-foot">
          <a href="#" title="Kết nối AI">${ic("plug")}<span>Kết nối AI</span></a>
          <button class="collapse-btn" data-act="collapse" title="Thu gọn (Ctrl+B)">${ic("panel")}<span>Thu gọn</span></button>
        </div>
      </aside>
      <div style="min-width:0">
        <header class="top">
          <button class="btn ghost icon menu-btn" data-act="drawer" aria-label="Mở menu">${ic("menu")}</button>
          <nav class="crumb" aria-label="Vị trí">${crumbHtml}</nav>
          <div class="grow"></div>
          <div class="ctx" aria-hidden="true"></div>
          <button class="cmd-trigger" data-act="cmdk" aria-label="Tìm nhanh">${ic("search", "sm")}<span class="txt">Tìm nhanh…</span><kbd>Ctrl K</kbd></button>
          ${themeBtn}
          <button class="btn ghost icon" aria-label="Thông báo (3 mới)" style="position:relative">${ic("bell")}<i style="position:absolute;top:7px;right:8px;width:7px;height:7px;border-radius:50%;background:var(--danger);box-shadow:0 0 0 2px var(--bg)"></i></button>
          <span class="avatar" title="Cô Lan Anh · THPT Chu Văn An">LA</span>
        </header>
      </div>`;
    main.classList.add("page");
    b.prepend(wrap);
    wrap.lastElementChild.append(main);
    if (b.dataset.banner) wrap.lastElementChild.querySelector(".top").insertAdjacentHTML("afterend", b.dataset.banner);
    compactHeader(wrap.querySelector(".top"));
  }

  if (shell === "hoc") {
    const nav = HOC.map((n) => `<a href="${href(n[3], n[0])}" ${n[0] === cur ? 'aria-current="page"' : ""}>${ic(n[1])}<span>${n[2]}</span></a>`).join("");
    const top = document.createElement("header");
    top.className = "hoc-top";
    top.innerHTML = `<a class="brand" href="${href("hoc-trang-chu.html", "trang-chu")}" style="padding:0"><span class="mark">${ic("cap")}</span><span class="txt">EDUVN</span></a>
      <nav class="hoc-nav" aria-label="Điều hướng">${nav}</nav>
      <div class="grow" style="flex:1"></div>
      <span class="streak" title="Chuỗi ngày học liên tiếp">${ic("flame", "sm")}12 ngày</span>
      <button class="btn ghost icon" data-act="cmdk" aria-label="Tìm nhanh (Ctrl K)">${ic("search")}</button>
      ${themeBtn}
      <span class="avatar" title="Nguyễn Minh Anh · 10A1">MA</span>`;
    const tab = document.createElement("nav");
    tab.className = "tabbar"; tab.setAttribute("aria-label", "Điều hướng");
    tab.innerHTML = nav.replace(/<span>/g, "<span>");
    main.classList.add("page");
    b.prepend(top);
    top.after(main);
    b.append(tab);
    b.classList.add("has-tabbar");
  }

  /* Đầu trang cuộn khỏi màn hình → thanh trên hiện nút chính của trang (bản sao, cùng hành vi).
     Không bao giờ chồng: thanh trên đặc, đầu trang chỉ cuộn bên dưới nó. */
  function compactHeader(top) {
    const head = document.querySelector(".page-head");
    const primary = head && head.querySelector(".acts .btn.primary");
    if (!head || !primary) return;
    const ctx = top.querySelector(".ctx");
    const clone = primary.cloneNode(true); clone.className = "btn primary sm"; clone.removeAttribute("id");
    clone.addEventListener("click", (e) => { e.preventDefault(); primary.click(); });
    ctx.append(clone);
    new IntersectionObserver(([en]) => { const on = !en.isIntersecting; top.classList.toggle("compact", on); ctx.setAttribute("aria-hidden", !on); }, { rootMargin: `-${top.offsetHeight}px 0px 0px 0px` }).observe(head.querySelector(".acts") || head);
  }
})();
