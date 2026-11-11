"""Khung "studio" cho mẫu Manim thế hệ mới (Đợt Thẩm mỹ): đọc token video dùng chung services/video-theme/tokens.json,
đăng ký phông Inter + Source Serif 4, nền theo phong cách (giay | bang), lưới 12 cột 1920×1080, nhịp beat như bản HyperFrames.
Đơn vị trong mã: px ở khung 1920×1080 (đổi sang đơn vị Manim bằng X/Y/L), cỡ chữ px (đổi bằng FS)."""
import json
import math
import os
from pathlib import Path

import manimpango
import numpy as np
from manim import *  # noqa: F401,F403

HERE = Path(__file__).resolve().parent
TOKENS = json.load(open(os.environ.get("EDUVN_TOKENS") or HERE.parent / "video-theme" / "tokens.json", encoding="utf-8"))
THEME_NAME = os.environ.get("EDUVN_THEME", "giay")
TH = TOKENS["themes"].get(THEME_NAME, TOKENS["themes"]["giay"])
GRID = TOKENS["grid"]
MO = TOKENS["motion"]
TY = TOKENS["type"]
FONT_DIR = Path(os.environ.get("EDUVN_FONTS") or HERE.parent / "video-theme" / "fonts")
for f in TOKENS["fonts"]["files"]:
    p = FONT_DIR / f["file"]
    if p.exists():
        manimpango.register_font(str(p))
UI = TOKENS["fonts"]["ui"]
READ = TOKENS["fonts"]["read"]

W, H = TOKENS["canvas"]["w"], TOKENS["canvas"]["h"]
config.background_color = TH["bg"]
UNIT = config.frame_height / H  # đơn vị Manim cho 1 px
FS_K = 1.92  # Text/MathTex font_size → px chữ ở 1080p (đo thực tế với Inter)


def X(px):
    return (px - W / 2) * UNIT


def Y(py):
    return (H / 2 - py) * UNIT


def P(px, py):
    return np.array([X(px), Y(py), 0.0])


def L(px):
    return px * UNIT


def FS(px):
    return px / FS_K


COL_W = (W - 2 * GRID["marginX"] - (GRID["cols"] - 1) * GRID["gutter"]) / GRID["cols"]


def col_x(i):
    return GRID["marginX"] + i * (COL_W + GRID["gutter"])


def span_w(n):
    return n * COL_W + (n - 1) * GRID["gutter"]


def vn(v, nd=2):
    """Số kiểu Việt: phẩy thập phân, dấu trừ thật."""
    s = f"{v:.{nd}f}".rstrip("0").rstrip(".") if nd else f"{v:.0f}"
    if s in ("-0", ""):
        s = "0"
    return s.replace("-", "−").replace(".", ",")


def tex_num(v, nd=2):
    s = f"{v:.{nd}f}".rstrip("0").rstrip(".") if nd else f"{v:.0f}"
    return ("0" if s in ("-0", "") else s).replace(".", "{,}")


def text(s, px, color=None, weight="NORMAL", font=None, **kw):
    return Text(s, font=font or UI, weight=weight, font_size=FS(px), color=color or TH["ink"], **kw)


def num(s, px, color=None, weight="SEMIBOLD"):
    """Chữ số dạng bảng (tnum) để số đang chạy không rung."""
    return MarkupText(f'<span font_features="tnum">{s}</span>', font=UI, weight=weight, font_size=FS(px), color=color or TH["ink"])


MATH_K = 1.22  # MathTex nhỏ hơn Text cùng font_size → bù để công thức cân với chữ Inter


def math_tex(s, px, color=None, **kw):
    return MathTex(s, font_size=FS(px) * MATH_K, color=color or TH["ink"], **kw)


_PLAIN = set("acemnorsuvwxzACEHIKLMNORSTUVWXZ0123456789")


def put_baseline(mob, src, left_px, base_px):
    """Đặt chữ theo đường chân chữ (baseline) như HTML: lấy đáy một ký tự không dấu, không chân."""
    chars = [c for c in src if not c.isspace()]
    ref = None
    for i, c in enumerate(chars):
        if c in _PLAIN and i < len(mob.submobjects):
            ref = mob.submobjects[i].get_bottom()[1]
            break
    if ref is None:
        ref = mob.get_bottom()[1]
    mob.shift(RIGHT * (X(left_px) - mob.get_left()[0]) + UP * (Y(base_px) - ref))
    return mob


def wrap(s, max_chars):
    """Chia dòng cân bằng (không để một chữ lẻ dòng cuối)."""
    words = s.split()
    if len(s) <= max_chars or len(words) < 2:
        return s
    n = math.ceil(len(s) / max_chars)
    target = len(s) / n
    lines, cur = [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > target + 3 and len(lines) < n - 1:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    lines.append(cur)
    return "\n".join(lines)


def schedule(T, weights):
    """Giống studio.ts: chia phần thân (trừ mở đầu + giữ kết) theo trọng số; at(j, m) rải đều hành động trong beat."""
    lead = min(MO["lead"], T * 0.08)
    hold = min(MO["holdMax"], T * 0.1)
    body = max(T - lead - hold, 0.5)
    s = sum(weights)
    out, acc = [], 0.0
    for w in weights:
        start = lead + body * acc / s
        slot = body * w / s
        acc += w
        out.append(Beat(start, slot))
    return out


class Beat:
    def __init__(self, start, slot):
        self.start, self.slot = start, slot

    def at(self, j, m):
        return self.start + self.slot * j / max(m, 1)

    def d(self, base, m=1):
        return max(0.35, min(base, self.slot / max(m, 1) * 0.8))


ENTER = rate_functions.ease_out_cubic
MOVE = rate_functions.ease_in_out_cubic


import re

PAL = TOKENS["palette"]
COMBOS = {k: [PAL[c] for c in v] for k, v in TOKENS["combos"].items() if not k.startswith("$")}
SPLIT = {"leftX": col_x(0), "leftW": span_w(5), "figX": col_x(6), "figW": span_w(6)}
_SPLIT_RE = re.compile(r"^(.+?)(\s*:\s*|\s+(?:qua|của|trong|với|bằng|là)\s+)(.+)$")


def _esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def title_parts(title):
    """Giống titleHtml (studio.ts): cụm khái niệm chính tô màu nhấn."""
    m = _SPLIT_RE.match(title)
    if m:
        return [(m.group(1), True), (m.group(2) + m.group(3), False)]
    ws = title.split()
    if len(ws) >= 4:
        return [(" ".join(ws[:-2]) + " ", False), (" ".join(ws[-2:]), True)]
    return [(title, False)]


def balance_lines(s, max_chars):
    """Chia dòng cân bằng (không để một chữ lẻ)."""
    words = s.split()
    if len(s) <= max_chars or len(words) < 2:
        return [s]
    n = math.ceil(len(s) / max_chars)
    target = len(s) / n
    lines, cur = [], ""
    for w in words:
        if cur and len(cur) + 1 + len(w) > target + 2 and len(lines) < n - 1:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    lines.append(cur)
    return lines


class StudioScene(Scene):
    """Cảnh nền giấy, đầu đề (dòng phân loại + nhãn nhấn + tiêu đề serif có từ khoá tô màu), dòng lời giảng dưới cùng, đồng hồ beat."""

    def setup(self):
        from common import SPEC, TOTAL

        self.T = TOTAL
        self.title = SPEC.get("tieuDe")
        self.caps = [c for c in json.loads(os.environ.get("EDUVN_CAPTIONS") or "[]") if str(c.get("text", "")).strip()]
        self.head_bottom = GRID["metaTop"] + 46

    def now(self):
        return self.renderer.time

    def goto(self, t):
        left = t - self.now()
        if left > 1 / 60:
            self.wait(left)

    def head(self, meta, eyebrow=None, layout="split"):
        max_w = SPLIT["leftW"] if layout == "split" else span_w(12)
        parts = []
        mt = MarkupText(f'<span letter_spacing="{int(0.1 * 30 * 1024 * 0.1)}">{_esc(meta.upper())}</span>', font=UI, weight="SEMIBOLD", font_size=FS(30), color=TH["ink3"])
        put_baseline(mt, meta.upper(), GRID["marginX"], GRID["metaTop"] + 24)
        parts.append(mt)
        y = GRID["metaTop"] + 46
        if eyebrow and not (self.title and eyebrow.lower() in self.title.lower()):
            eb = MarkupText(f'<span letter_spacing="{int(0.08 * 36 * 1024 * 0.1)}">{_esc(eyebrow.upper())}</span>', font=UI, weight="BOLD", font_size=FS(36), color=TH["accent"])
            put_baseline(eb, eyebrow.upper(), GRID["marginX"], GRID["eyebrowTop"] + 29)
            parts.append(eb)
            y = GRID["eyebrowTop"] + 50
        if self.title:
            size = TY["title"]["size"]
            lh = size * TY["title"]["line"]
            per = int(max_w / (size * 0.47))
            tp = title_parts(self.title)
            if len(self.title) > per and len(tp) == 2 and all(len(t.strip()) <= per for t, _ in tp):
                l2 = tp[1][0].strip()
                lines = [tp[0][0].strip() + (":" if l2.startswith(":") else ""), l2.lstrip(":").strip()]  # xuống dòng đúng ranh giới cụm từ khoá
            else:
                lines = balance_lines(self.title, per)
            # tô màu theo cụm của cả tiêu đề, rồi cắt theo dòng
            colored = []
            for seg, kw in title_parts(self.title):
                colored += [(ch, kw) for ch in seg]
            pos = 0
            for i, ln in enumerate(lines):
                while pos < len(colored) and colored[pos][0] == " ":
                    pos += 1
                spans, cur, cur_kw = [], "", None
                for ch in ln:
                    kw = colored[pos][1] if pos < len(colored) else False
                    pos += 1
                    if cur_kw is None or kw == cur_kw:
                        cur += ch
                    else:
                        spans.append((cur, cur_kw))
                        cur = ch
                    cur_kw = kw
                spans.append((cur, cur_kw))
                mk = "".join(f'<span foreground="{TH["accent"] if k else TH["ink"]}">{_esc(t)}</span>' for t, k in spans)
                tm = MarkupText(mk, font=READ, weight="SEMIBOLD", font_size=FS(size))
                if tm.width > L(max_w):
                    tm.scale_to_fit_width(L(max_w))
                put_baseline(tm, ln, GRID["marginX"], y + (lh - size) / 2 + size * 0.8 + i * lh)
                parts.append(tm)
            y += round(len(lines) * lh) + 8
        self.head_bottom = y
        # đường kẻ + dòng lời giảng
        rule = Line(P(GRID["marginX"], GRID["ruleY"]), P(GRID["marginX"] + span_w(12), GRID["ruleY"]), stroke_color=TH["line"], stroke_width=2)
        self.add(rule)
        if self.caps:
            self._cap_clock = 0.0
            holder = VGroup()
            mobs = []
            for c in self.caps:
                t = text(c["text"], TY["caption"]["size"], TH["ink"], weight="MEDIUM")
                if t.width > L(span_w(12)):
                    t.scale_to_fit_width(L(span_w(12)))
                put_baseline(t, c["text"], GRID["marginX"], GRID["captionTop"] + 42)
                t.set_opacity(0)
                mobs.append((float(c["t"]), t))
                holder.add(t)

            def upd(m, dt):
                self._cap_clock += dt
                now = self._cap_clock
                for i, (t0, mob) in enumerate(mobs):
                    t1 = mobs[i + 1][0] if i + 1 < len(mobs) else 1e9
                    if now < t0 or now >= t1:
                        a = 0.0
                    else:
                        a = min(1.0, (now - t0) / 0.4)
                        if now > t1 - 0.3:
                            a *= (t1 - now) / 0.3
                    mob.set_opacity(max(0.0, min(1.0, a)))

            holder.add_updater(upd)
            self.add(holder)
        self.play(*[FadeIn(m, shift=UP * L(10)) for m in parts], run_time=0.7, rate_func=ENTER)

    def finish(self):
        self.goto(self.T)


def card(x_px, y_px, w_px, h_px, bar=None):
    """Thẻ ghi chú: nền trắng, viền mảnh, vạch màu bên trái (giống .card của bản HTML)."""
    box = RoundedRectangle(corner_radius=L(10), width=L(w_px), height=L(h_px), stroke_color=TH["line"], stroke_width=2, fill_color=TH["surface"], fill_opacity=1)
    box.move_to(P(x_px + w_px / 2, y_px + h_px / 2))
    b = Rectangle(width=L(6), height=L(h_px - 4), stroke_width=0, fill_color=bar or TH["accent"], fill_opacity=1).move_to(P(x_px + 3, y_px + h_px / 2))
    return VGroup(box, b)
