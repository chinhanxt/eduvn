/* EDUVN anim-kit v1 — window.EK: lệnh hoạt cảnh cho bài HyperFrames do AI viết.
 * Hợp đồng: docs/anim-studio/kit-api.md. Cần gsap + DrawSVGPlugin + MorphSVGPlugin + MotionPathPlugin nạp trước,
 * và window.EK_CFG = { duration, beats:[{i,t0,t1,cue}], colors:{ten:hex}, combos:{ten:[...]}, motion:{...}, markAlpha, fillAlpha }
 * do máy chủ tiêm. Mọi hàm tất định (không hẹn giờ, không ngẫu nhiên tự do); gọi sai thì ném Error để `check` báo lỗi runtime. */
(function () {
  "use strict";
  var C = window.EK_CFG || {};
  var M = C.motion || { enter: 0.75, exit: 0.5, emph: 0.6, move: 1.2, draw: 1.1, stagger: 0.05, dim: 0.3, rise: 22, ease: { enter: "expo.out", spring: "back.out(1.4)", move: "power3.inOut", exit: "power2.in", draw: "power2.inOut" } };
  var E = M.ease;
  if (window.gsap && gsap.registerPlugin) {
    var plugins = [window.DrawSVGPlugin, window.MorphSVGPlugin, window.MotionPathPlugin].filter(Boolean);
    if (plugins.length) gsap.registerPlugin.apply(gsap, plugins);
  }
  var r2 = function (n) { return Math.round(n * 100) / 100; };
  function els(sel, who) {
    var list = typeof sel === "string" ? Array.prototype.slice.call(document.querySelectorAll(sel)) : [].concat(sel);
    if (!list.length) throw new Error("EK." + who + ": không có phần tử khớp selector " + sel);
    return list;
  }
  function num(t, who) {
    if (typeof t !== "number" || !isFinite(t)) throw new Error("EK." + who + ": thời điểm phải là số giây (gặp " + t + ")");
    return r2(Math.max(0, t));
  }
  function beat(i, who) {
    var b = (C.beats || [])[i];
    if (!b) throw new Error("EK." + who + ": không có beat " + i);
    return b;
  }
  function color(name) {
    var c = (C.colors || {})[name];
    if (!c) throw new Error("EK.color: \"" + name + "\" không phải màu token (dùng: " + Object.keys(C.colors || {}).join(", ") + ")");
    return c;
  }
  function rgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }
  function vn(v, decimals) {
    var s = Math.abs(v).toFixed(decimals);
    var parts = s.split(".");
    var int = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (v < 0 ? "−" : "") + int + (parts[1] ? "," + parts[1] : "");
  }
  var cameraUsed = 0;
  var counted = typeof WeakSet === "function" ? new WeakSet() : null;
  var FROM = {
    up: function () { return { opacity: 0, y: M.rise }; },
    down: function () { return { opacity: 0, y: -M.rise }; },
    left: function () { return { opacity: 0, x: -M.rise * 2 }; },
    right: function () { return { opacity: 0, x: M.rise * 2 }; },
    fade: function () { return { opacity: 0 }; },
    scale: function () { return { opacity: 0, scale: 0.86 }; },
  };

  var EK = {
    version: "1",
    cfg: C,
    T: C.duration || 0,
    b: function (i, f) { var b = beat(i, "b"); return r2(b.t0 + (f || 0) * (b.t1 - b.t0)); },
    cue: function (i) { var b = beat(i, "cue"); return r2(typeof b.cue === "number" ? b.cue : b.t0); },
    end: function (i) { return r2(beat(i, "end").t1); },
    color: color,
    combo: function (name) {
      var c = (C.combos || {})[name];
      if (!c) throw new Error("EK.combo: không có tổ hợp " + name);
      return c.slice();
    },
    rand: function (seed) {
      var a = (seed >>> 0) || 1;
      return function () {
        a = (a + 0x6d2b79f5) >>> 0;
        var t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },

    enter: function (tl, sel, t, o) {
      o = o || {};
      var from = (FROM[o.from || "up"] || FROM.up)();
      var to = { opacity: 1, x: 0, y: 0, scale: 1, duration: o.dur || M.enter, ease: o.ease === "spring" ? E.spring : E.enter };
      if (o.stagger) to.stagger = o.stagger;
      tl.fromTo(els(sel, "enter"), from, to, num(t, "enter"));
      return tl;
    },
    exit: function (tl, sel, t, o) {
      o = o || {};
      var to = { opacity: 0, duration: o.dur || M.exit, ease: E.exit };
      if (o.to === "up") to.y = -M.rise;
      if (o.to === "down") to.y = M.rise;
      tl.to(els(sel, "exit"), to, num(t, "exit"));
      return tl;
    },
    draw: function (tl, sel, t, dur, o) {
      o = o || {};
      var start = o.from === "center" ? "50% 50%" : o.from === "end" ? "100% 100%" : "0%";
      tl.fromTo(els(sel, "draw"), { drawSVG: start, opacity: 1 }, { drawSVG: "0% 100%", duration: dur || M.draw, ease: E.draw }, num(t, "draw"));
      return tl;
    },
    arrow: function (tl, sel, t, dur) {
      var d = dur || 1.2;
      els(sel, "arrow").forEach(function (p) {
        tl.fromTo(p, { drawSVG: "0%", opacity: 1 }, { drawSVG: "0% 100%", duration: d, ease: E.draw }, num(t, "arrow"));
        var head = p.nextElementSibling;
        if (head && head.classList.contains("ek-arrow-head")) tl.fromTo(head, { opacity: 0, scale: 0.6, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.3, ease: E.enter }, r2(t + d * 0.92));
      });
      return tl;
    },
    grow: function (tl, sel, t, dur, o) {
      o = o || {};
      var left = o.from === "left";
      var from = left ? { scaleX: 0, transformOrigin: "0% 50%" } : { scaleY: 0, transformOrigin: "50% 100%" };
      var to = left ? { scaleX: 1 } : { scaleY: 1 };
      to.duration = dur || 1;
      to.ease = E.enter;
      to.stagger = o.stagger === undefined ? 0.06 : o.stagger;
      var list = els(sel, "grow");
      list.forEach(function (el) { if (el instanceof SVGElement) el.style.transformBox = "fill-box"; });
      tl.fromTo(list, from, to, num(t, "grow"));
      return tl;
    },
    morph: function (tl, a, b, t, dur) {
      var target = els(b, "morph")[0];
      tl.to(els(a, "morph"), { morphSVG: target, duration: dur || M.move, ease: E.move }, num(t, "morph"));
      return tl;
    },
    count: function (tl, sel, a, b, t, dur, o) {
      o = o || {};
      var dec = o.decimals !== undefined ? o.decimals : Math.max(String(a).split(".")[1] ? String(a).split(".")[1].length : 0, String(b).split(".")[1] ? String(b).split(".")[1].length : 0);
      var pre = o.prefix || "";
      var suf = o.suffix || "";
      els(sel, "count").forEach(function (el) {
        if (!counted || !counted.has(el)) {
          el.textContent = pre + vn(a, dec) + suf;
          if (counted) counted.add(el);
        }
        var st = { v: a };
        tl.fromTo(st, { v: a }, { v: b, duration: dur || 0.9, ease: "power2.out", onUpdate: function () { el.textContent = pre + vn(st.v, dec) + suf; } }, num(t, "count"));
      });
      return tl;
    },
    mark: function (tl, sel, t, kind, o) {
      o = o || {};
      kind = kind || "highlight";
      var hex = color(o.color || "accent");
      var d = o.dur || M.emph;
      els(sel, "mark").forEach(function (el) {
        if (kind === "highlight" || kind === "underline") {
          var c = kind === "highlight" ? rgba(hex, C.markAlpha || 0.13) : hex;
          el.style.backgroundImage = "linear-gradient(" + c + "," + c + ")";
          el.style.backgroundRepeat = "no-repeat";
          el.style.backgroundPosition = kind === "highlight" ? "0 60%" : "0 96%";
          el.style.webkitBoxDecorationBreak = "clone";
          el.style.boxDecorationBreak = "clone";
          var h = kind === "highlight" ? "78%" : "0.12em";
          tl.fromTo(el, { backgroundSize: "0% " + h }, { backgroundSize: "100% " + h, duration: d, ease: E.draw }, num(t, "mark"));
        } else if (kind === "circle" || kind === "box") {
          if (getComputedStyle(el).position === "static") el.style.position = "relative";
          var ns = "http://www.w3.org/2000/svg";
          var svg = document.createElementNS(ns, "svg");
          svg.setAttribute("class", "ek-mark-svg");
          svg.style.left = "-22px"; svg.style.top = "-14px";
          svg.style.width = "calc(100% + 44px)"; svg.style.height = "calc(100% + 28px)";
          var shape = document.createElementNS(ns, kind === "circle" ? "ellipse" : "rect");
          if (kind === "circle") { shape.setAttribute("cx", "50%"); shape.setAttribute("cy", "50%"); shape.setAttribute("rx", "49%"); shape.setAttribute("ry", "47%"); }
          else { shape.setAttribute("x", "2"); shape.setAttribute("y", "2"); shape.setAttribute("rx", "12"); shape.style.width = "calc(100% - 4px)"; shape.style.height = "calc(100% - 4px)"; }
          shape.setAttribute("pathLength", "1");
          shape.style.stroke = hex;
          shape.style.strokeDasharray = "1";
          shape.style.strokeDashoffset = "1";
          svg.appendChild(shape);
          el.appendChild(svg);
          tl.fromTo(shape, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: d * 1.4, ease: E.draw }, num(t, "mark"));
        } else throw new Error("EK.mark: kind phải là highlight|underline|circle|box");
      });
      return tl;
    },
    unmark: function (tl, sel, t) {
      els(sel, "unmark").forEach(function (el) {
        var shape = el.querySelector(":scope > .ek-mark-svg > *");
        if (shape) tl.to(shape, { opacity: 0, duration: M.exit, ease: E.exit }, num(t, "unmark"));
        else tl.to(el, { backgroundSize: "0% 78%", duration: M.exit, ease: E.exit }, num(t, "unmark"));
      });
      return tl;
    },
    focus: function (tl, sel, t, o) {
      o = o || {};
      var keep = els(sel, "focus");
      var within = els(o.within || ".ek-stage", "focus")[0];
      var others = Array.prototype.filter.call(within.children, function (c) {
        return !keep.some(function (k) { return k === c || c.contains(k) || k.contains(c); });
      });
      var d = o.dur || 0.5;
      if (others.length) tl.to(others, { opacity: M.dim, duration: d, ease: E.move }, num(t, "focus"));
      tl.to(keep, { opacity: 1, duration: d, ease: E.move }, num(t, "focus"));
      return tl;
    },
    unfocus: function (tl, t, o) {
      o = o || {};
      var within = els(o.within || ".ek-stage", "unfocus")[0];
      tl.to(within.children, { opacity: 1, duration: o.dur || 0.5, ease: E.move }, num(t, "unfocus"));
      return tl;
    },
    camera: function (tl, t, dur, o) {
      cameraUsed += 1;
      if (cameraUsed > 1) throw new Error("EK.camera: chỉ được 1 chuyển động camera mỗi cảnh");
      o = o || {};
      if (!dur || dur < 1.5) throw new Error("EK.camera: chuyển động camera phải chậm (≥ 1,5 s)");
      var world = els(".ek-world", "camera")[0];
      tl.to(world, { x: o.x || 0, y: o.y || 0, scale: o.scale || 1, duration: dur, ease: E.move }, num(t, "camera"));
      return tl;
    },
    words: function (tl, sel, cues, o) {
      o = o || {};
      els(sel, "words").forEach(function (el) {
        var ws = Array.prototype.slice.call(el.querySelectorAll(".ek-w"));
        if (!ws.length) throw new Error("EK.words: " + sel + " chưa tách từ (thêm thuộc tính data-ek-words)");
        var times = Array.isArray(cues) ? cues : ws.map(function (_, i) { return cues.t + i * (cues.per || 0.3); });
        ws.forEach(function (w, i) {
          var at = times[Math.min(i, times.length - 1)] + (i >= times.length ? (i - times.length + 1) * 0.25 : 0);
          tl.fromTo(w, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45, ease: E.enter }, num(at, "words"));
          if (o.karaoke) {
            tl.to(w, { color: color("accent"), duration: 0.15, ease: "none" }, num(at, "words"));
            var next = i + 1 < ws.length ? times[Math.min(i + 1, times.length - 1)] : at + 0.6;
            tl.to(w, { color: color("ink"), duration: 0.2, ease: "none" }, num(Math.max(at + 0.16, next), "words"));
          }
        });
      });
      return tl;
    },
    swap: function (tl, a, b, t, o) {
      o = o || {};
      var d = o.dur || 0.7;
      els(a, "swap").forEach(function (el) {
        if (getComputedStyle(el).position === "static") el.style.position = "relative";
        var line = el.querySelector(":scope > .ek-strike");
        if (!line) {
          line = document.createElement("span");
          line.className = "ek-strike";
          el.appendChild(line);
        }
        tl.fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: d * 0.6, ease: E.draw }, num(t, "swap"));
        tl.to(el, { opacity: M.dim, y: -M.rise, duration: d, ease: E.move }, r2(t + d * 0.6));
      });
      tl.fromTo(els(b, "swap"), { opacity: 0, y: M.rise }, { opacity: 1, y: 0, duration: d, ease: E.enter }, r2(t + d * 0.8));
      return tl;
    },
    follow: function (tl, sel, pathSel, t, dur, o) {
      o = o || {};
      var path = els(pathSel, "follow")[0];
      var mp = { path: path, alignOrigin: [0.5, 0.5] };
      if (o.align) { mp.align = path; mp.autoRotate = true; }
      else mp.align = path;
      tl.to(els(sel, "follow"), { motionPath: mp, duration: dur || M.move, ease: E.move }, num(t, "follow"));
      return tl;
    },
    fill: function (tl, sel, t, mau, o) {
      o = o || {};
      var hex = color(mau);
      tl.to(els(sel, "fill"), { fill: o.alpha !== undefined && o.alpha < 1 ? rgba(hex, o.alpha) : hex, duration: o.dur || M.emph, ease: E.move }, num(t, "fill"));
      return tl;
    },
    tint: function (tl, sel, t, mau, o) {
      o = o || {};
      var prop = o.prop || "color";
      if (["color", "stroke", "fill"].indexOf(prop) < 0) throw new Error("EK.tint: prop phải là color|stroke|fill");
      var to = { duration: o.dur || 0.5, ease: E.move };
      to[prop] = color(mau);
      tl.to(els(sel, "tint"), to, num(t, "tint"));
      return tl;
    },
  };
  window.EK = EK;
})();
