"""Nhập .pptx → cảnh slide OpenMAIC (canvas 1000 × 562,5) giữ bố cục.

Đọc bằng python-pptx; hình khối preset dùng bộ dựng hình của ppt-master (MIT, pptx_to_svg/prstgeom_to_svg.py),
công thức Office Math → LaTeX dùng ppt-master source_to_md/_omml_latex.py (MIT).
Kế thừa: hình nền + hình không phải placeholder của master/layout (logo, dải màu) được đưa vào cảnh;
cỡ/màu chữ lấy theo run → lstStyle của hình → placeholder layout/master → txStyles của master.
"""
from __future__ import annotations

import base64
import io
import json
import math
import re
import sys
from xml.etree import ElementTree as ET

from lxml import etree
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE
from pptx.util import Emu

NSM = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "m": "http://schemas.openxmlformats.org/officeDocument/2006/math",
    "mc": "http://schemas.openxmlformats.org/markup-compatibility/2006",
    "a14": "http://schemas.microsoft.com/office/drawing/2010/main",
    "c": "http://schemas.openxmlformats.org/drawingml/2006/chart",
}
A = "{%s}" % NSM["a"]
CANVAS_W = 1000.0
CANVAS_H = 562.5
MAX_IMG = 1280
SCHEME_ALIAS = {"tx1": "dk1", "tx2": "dk2", "bg1": "lt1", "bg2": "lt2"}


def out(obj: dict) -> None:
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")


class Ctx:
    def __init__(self, prs):
        self.prs = prs
        sw, sh = prs.slide_width, prs.slide_height
        self.k = min(CANVAS_W / sw, CANVAS_H / sh)  # EMU → px canvas
        self.ox = (CANVAS_W - sw * self.k) / 2
        self.oy = (CANVAS_H - sh * self.k) / 2
        self.n = 0
        self.colors: dict[str, str] = {}
        self.images = 0
        self.best: tuple[float, str] = (0.0, "")

    def nid(self, p: str = "el") -> str:
        self.n += 1
        return f"{p}{self.n}"


# ---------------------------------------------------------------- màu

def theme_colors(master) -> dict[str, str]:
    res: dict[str, str] = {}
    for rel in master.part.rels.values():
        if rel.reltype.endswith("/theme"):
            root = etree.fromstring(rel.target_part.blob)
            sch = root.find(f".//{A}clrScheme")
            if sch is None:
                continue
            for c in sch:
                name = etree.QName(c).localname
                s = c.find(f"{A}srgbClr")
                y = c.find(f"{A}sysClr")
                if s is not None:
                    res[name] = "#" + s.get("val").upper()
                elif y is not None:
                    res[name] = "#" + (y.get("lastClr") or "000000").upper()
    return res


def mod(hex_: str, el) -> str:
    """Áp lumMod/lumOff/tint/shade (gần đúng) lên màu hex."""
    r, g, b = (int(hex_[i : i + 2], 16) for i in (1, 3, 5))
    for ch in el:
        name = etree.QName(ch).localname
        v = int(ch.get("val", "100000")) / 100000
        if name == "lumMod":
            r, g, b = r * v, g * v, b * v
        elif name == "lumOff":
            r, g, b = r + 255 * v, g + 255 * v, b + 255 * v
        elif name == "tint":
            r, g, b = (255 - (255 - c) * v for c in (r, g, b))
        elif name == "shade":
            r, g, b = r * v, g * v, b * v
    return "#" + "".join(f"{max(0, min(255, int(round(c)))):02X}" for c in (r, g, b))


def alpha_of(el) -> float | None:
    a = el.find(f"{A}alpha") if el is not None else None
    return int(a.get("val")) / 100000 if a is not None else None


def color_el(ctx: Ctx, parent) -> tuple[str | None, float | None]:
    """Phần tử chứa srgbClr/schemeClr/sysClr/prstClr → (#RRGGBB, alpha)."""
    if parent is None:
        return None, None
    for ch in parent:
        name = etree.QName(ch).localname
        if name == "srgbClr":
            return mod("#" + ch.get("val").upper(), ch), alpha_of(ch)
        if name == "schemeClr":
            key = SCHEME_ALIAS.get(ch.get("val"), ch.get("val"))
            base = ctx.colors.get(key)
            return (mod(base, ch) if base else None), alpha_of(ch)
        if name == "sysClr":
            return mod("#" + (ch.get("lastClr") or "000000").upper(), ch), alpha_of(ch)
        if name == "prstClr":
            return {"black": "#000000", "white": "#FFFFFF", "red": "#FF0000", "blue": "#0000FF", "green": "#008000"}.get(ch.get("val"), "#000000"), None
    return None, None


def fill_of(ctx: Ctx, sppr, style) -> tuple[str | None, float | None, dict | None]:
    """→ (màu, alpha, gradient) ; None = không tô."""
    if sppr is not None:
        if sppr.find(f"{A}noFill") is not None:
            return None, None, None
        sf = sppr.find(f"{A}solidFill")
        if sf is not None:
            c, al = color_el(ctx, sf)
            return c, al, None
        gf = sppr.find(f"{A}gradFill")
        if gf is not None:
            stops = []
            for gs in gf.findall(f"{A}gsLst/{A}gs"):
                c, _ = color_el(ctx, gs)
                if c:
                    stops.append({"pos": round(int(gs.get("pos", "0")) / 1000), "color": c})
            if stops:
                return stops[0]["color"], None, {"type": "linear", "colors": stops, "rotate": 0}
    if style is not None:
        fr = style.find(f"{A}fillRef")
        if fr is not None and fr.get("idx", "0") != "0":
            c, al = color_el(ctx, fr)
            return c, al, None
    return None, None, None


def line_of(ctx: Ctx, sppr, style) -> dict | None:
    ln = sppr.find(f"{A}ln") if sppr is not None else None
    if ln is not None:
        if ln.find(f"{A}noFill") is not None:
            return None
        c, _ = color_el(ctx, ln.find(f"{A}solidFill"))
        w = int(ln.get("w", "12700")) * ctx.k
        if c:
            return {"color": c, "width": max(0.5, round(w, 2)), "style": "dashed" if ln.find(f"{A}prstDash") is not None and ln.find(f"{A}prstDash").get("val") not in ("solid", None) else "solid"}
    if style is not None:
        lr = style.find(f"{A}lnRef")
        if lr is not None and lr.get("idx", "0") != "0" and (ln is None or ln.find(f"{A}noFill") is None):
            c, _ = color_el(ctx, lr)
            if c:
                return {"color": c, "width": 1, "style": "solid"}
    return None


# ---------------------------------------------------------------- chữ

def lvl_props(lst, lvl: int):
    if lst is None:
        return None
    return lst.find(f"{A}lvl{lvl}pPr")


class TextStyle:
    """Chuỗi kế thừa cho một hình chữ: danh sách lstStyle từ gần đến xa."""

    def __init__(self, chain: list):
        self.chain = [c for c in chain if c is not None]

    def get(self, lvl: int, attr: str):
        for lst in self.chain:
            p = lvl_props(lst, lvl)
            if p is None:
                continue
            d = p.find(f"{A}defRPr")
            if attr == "sz" and d is not None and d.get("sz"):
                return int(d.get("sz"))
            if attr == "b" and d is not None and d.get("b") is not None:
                return d.get("b") in ("1", "true")
            if attr == "color" and d is not None and d.find(f"{A}solidFill") is not None:
                return d.find(f"{A}solidFill")
            if attr == "algn" and p.get("algn"):
                return p.get("algn")
            if attr == "bullet":
                if p.find(f"{A}buNone") is not None:
                    return False
                if p.find(f"{A}buChar") is not None or p.find(f"{A}buAutoNum") is not None:
                    return True
        return None


def placeholder_chain(shape, slide) -> list:
    """lstStyle của placeholder tương ứng ở layout, master + txStyles master."""
    chain = []
    try:
        ph = shape.placeholder_format
    except ValueError:
        ph = None
    layout = slide.slide_layout if hasattr(slide, "slide_layout") else None
    master = layout.slide_master if layout is not None else getattr(slide, "slide_master", None)
    kind = "other"
    if ph is not None:
        t = str(ph.type).split(".")[-1].split(" ")[0].upper() if ph.type is not None else "BODY"
        kind = "title" if "TITLE" in t and "SUB" not in t else "body"
        for holder in (layout, master):
            if holder is None:
                continue
            for s in holder.placeholders:
                try:
                    same = s.placeholder_format.idx == ph.idx or (kind == "title" and "TITLE" in str(s.placeholder_format.type).upper() and "SUB" not in str(s.placeholder_format.type).upper())
                except ValueError:
                    same = False
                if same:
                    chain.append(s._element.find(f".//{A}lstStyle"))
                    break
    if master is not None:
        ts = master._element.find(f"{{{NSM['p']}}}txStyles")
        if ts is not None:
            chain.append(ts.find(f"{{{NSM['p']}}}{'titleStyle' if kind == 'title' else 'bodyStyle' if kind == 'body' else 'otherStyle'}"))
    return chain, kind


def esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


_OMML = None


def omml_latex(el) -> str:
    """OMML → LaTeX bằng source_to_md/_omml_latex.py (nạp theo đường dẫn: source_to_md.py cùng tên che mất gói)."""
    global _OMML
    if _OMML is None:
        import importlib.util  # noqa: PLC0415
        from pathlib import Path  # noqa: PLC0415

        f = Path(__import__("eduvn_pptx").SCRIPTS) / "source_to_md" / "_omml_latex.py"
        spec = importlib.util.spec_from_file_location("eduvn_omml_latex", f)
        mod_ = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod_)
        _OMML = mod_._omml_to_latex
    return _OMML(ET.fromstring(etree.tostring(el))).strip()


def text_html(ctx: Ctx, shape, slide, txbody, font_color_default: str | None) -> tuple[str, str, list[str], float]:
    """txBody → (html, chữ thuần, công thức đứng riêng, cỡ chữ lớn nhất px)."""
    chain, kind = placeholder_chain(shape, slide) if shape is not None else ([], "other")
    ts = TextStyle([txbody.find(f"{A}lstStyle"), *chain])
    body_pr = txbody.find(f"{A}bodyPr")
    scale = 1.0
    if body_pr is not None and body_pr.find(f"{A}normAutofit") is not None:
        scale = int(body_pr.find(f"{A}normAutofit").get("fontScale", "100000")) / 100000
    parts: list[str] = []
    plain: list[str] = []
    formulas: list[str] = []
    max_px = 0.0
    in_list = False
    for p in txbody.findall(f"{A}p"):
        ppr = p.find(f"{A}pPr")
        lvl = int(ppr.get("lvl", "0")) + 1 if ppr is not None else 1
        algn = (ppr.get("algn") if ppr is not None else None) or ts.get(lvl, "algn") or "l"
        bullet = None
        if ppr is not None:
            if ppr.find(f"{A}buNone") is not None:
                bullet = False
            elif ppr.find(f"{A}buChar") is not None or ppr.find(f"{A}buAutoNum") is not None:
                bullet = True
        if bullet is None:
            bullet = bool(ts.get(lvl, "bullet")) if kind == "body" else bool(ts.get(lvl, "bullet") or False)
        runs: list[str] = []
        ptext: list[str] = []
        has_any = False
        for ch in p:
            name = etree.QName(ch).localname
            if name in ("r", "fld"):
                t = "".join(ch.itertext()) if name == "fld" else (ch.findtext(f"{A}t") or "")
                if not t:
                    continue
                has_any = True
                rpr = ch.find(f"{A}rPr")
                sz = int(rpr.get("sz")) if rpr is not None and rpr.get("sz") else ts.get(lvl, "sz") or (4400 if kind == "title" else 1800)
                px = sz / 100 * 12700 * ctx.k * scale
                max_px = max(max_px, px)
                color = None
                if rpr is not None and rpr.find(f"{A}solidFill") is not None:
                    color, _ = color_el(ctx, rpr.find(f"{A}solidFill"))
                if color is None and ts.get(lvl, "color") is not None:
                    color, _ = color_el(ctx, ts.get(lvl, "color"))
                color = color or font_color_default
                bold = (rpr.get("b") in ("1", "true")) if rpr is not None and rpr.get("b") is not None else bool(ts.get(lvl, "b"))
                ital = rpr is not None and rpr.get("i") in ("1", "true")
                und = rpr is not None and rpr.get("u") not in (None, "none")
                st = f"font-size:{px:.1f}px;" + (f"color:{color};" if color else "")
                inner = esc(t)
                if bold:
                    inner = f"<strong>{inner}</strong>"
                if ital:
                    inner = f"<em>{inner}</em>"
                if und:
                    inner = f"<u>{inner}</u>"
                runs.append(f'<span style="{st}">{inner}</span>')
                ptext.append(t)
            elif name == "br":
                runs.append("<br>")
                ptext.append("\n")
            elif name == "AlternateContent" or (name == "m" and ch.tag.startswith("{%s}" % NSM["a14"])):
                m = ch.find(".//{%s}oMath" % NSM["m"])
                mp = ch.find(".//{%s}oMathPara" % NSM["m"])
                node = mp if mp is not None else m
                if node is None:
                    continue
                has_any = True
                lt = omml_latex(node)
                if not lt:
                    continue
                sz = ts.get(lvl, "sz") or 1800
                px = sz / 100 * 12700 * ctx.k * scale
                max_px = max(max_px, px)
                runs.append(f'<span style="font-size:{px:.1f}px;">${esc(lt)}$</span>')
                ptext.append(f"${lt}$")
                formulas.append(lt)
        if not has_any:
            # đoạn trống giữ khoảng cách dòng
            end = p.find(f"{A}endParaRPr")
            sz = int(end.get("sz")) if end is not None and end.get("sz") else ts.get(lvl, "sz") or 1800
            runs.append(f'<span style="font-size:{sz / 100 * 12700 * ctx.k * scale:.1f}px;"><br></span>')
        align = {"ctr": "center", "r": "right", "just": "justify"}.get(algn, "left")
        content = "".join(runs)
        if bullet and has_any:
            if not in_list:
                parts.append("<ul>")
                in_list = True
            parts.append(f'<li style="text-align:{align};{f"margin-left:{(lvl - 1) * 1.2}em;" if lvl > 1 else ""}">{content}</li>')
        else:
            if in_list:
                parts.append("</ul>")
                in_list = False
            parts.append(f'<p style="text-align:{align};">{content}</p>')
        plain.append("".join(ptext))
    if in_list:
        parts.append("</ul>")
    return "".join(parts), "\n".join(plain).strip(), formulas, max_px


# ---------------------------------------------------------------- hình

def geom_path(prst: str, w: float, h: float, sppr) -> str:
    from pptx_to_svg.emu_units import Xfrm  # noqa: PLC0415
    from pptx_to_svg.prstgeom_to_svg import convert_prst_geom  # noqa: PLC0415

    w, h = max(w, 1), max(h, 1)
    try:
        r = convert_prst_geom(prst, Xfrm(0, 0, w, h), ET.fromstring(etree.tostring(sppr)) if sppr is not None else None)
    except Exception:  # noqa: BLE001
        r = None
    if r is not None:
        if r.tag == "path" and r.path_d:
            return r.path_d
        a = r.attrs
        if r.tag == "ellipse":
            cx, cy, rx, ry = (float(a.get(k, 0)) for k in ("cx", "cy", "rx", "ry"))
            return f"M {cx - rx} {cy} A {rx} {ry} 0 1 0 {cx + rx} {cy} A {rx} {ry} 0 1 0 {cx - rx} {cy} Z"
        if r.tag in ("polygon", "polyline") and a.get("points"):
            pts = a["points"].replace(",", " ").split()
            xy = [f"{pts[i]} {pts[i + 1]}" for i in range(0, len(pts) - 1, 2)]
            return "M " + " L ".join(xy) + (" Z" if r.tag == "polygon" else "")
        if r.tag == "rect" and a.get("rx"):
            rx = float(a["rx"])
            return f"M {rx} 0 L {w - rx} 0 Q {w} 0 {w} {rx} L {w} {h - rx} Q {w} {h} {w - rx} {h} L {rx} {h} Q 0 {h} 0 {h - rx} L 0 {rx} Q 0 0 {rx} 0 Z"
    return f"M 0 0 L {w} 0 L {w} {h} L 0 {h} Z"


def image_src(ctx: Ctx, blob: bytes, ctype: str, crop: tuple[float, float, float, float] | None, box_w: float, box_h: float) -> str | None:
    from PIL import Image  # noqa: PLC0415

    if ctype == "image/svg+xml":
        return "data:image/svg+xml;base64," + base64.b64encode(blob).decode()
    try:
        im = Image.open(io.BytesIO(blob))
        im.load()
    except Exception:  # noqa: BLE001 — EMF/WMF… bỏ qua
        return None
    if crop and any(crop):
        l, t, r, b = crop
        W, H = im.size
        im = im.crop((int(W * l), int(H * t), max(int(W * l) + 1, int(W * (1 - r))), max(int(H * t) + 1, int(H * (1 - b)))))
    # ảnh trên canvas 1000px: giữ tối đa ~2× kích thước hiển thị, trần MAX_IMG
    target = min(MAX_IMG, max(64, int(max(box_w, box_h) * 2)))
    if max(im.size) > target:
        im.thumbnail((target, target))
    has_alpha = im.mode in ("RGBA", "LA", "P")
    buf = io.BytesIO()
    if has_alpha:
        im.convert("RGBA").save(buf, "PNG", optimize=True)
        mime = "image/png"
    else:
        im.convert("RGB").save(buf, "JPEG", quality=82, optimize=True)
        mime = "image/jpeg"
    ctx.images += 1
    return f"data:{mime};base64," + base64.b64encode(buf.getvalue()).decode()


def chart_el(ctx: Ctx, shape, box: dict) -> dict | None:
    try:
        ch = shape.chart
        plot = ch.plots[0]
        cats = [str(c) for c in plot.categories]
        series = [[float(v) if v is not None else 0.0 for v in s.values] for s in plot.series]
        names = [s.name or f"Dãy {i + 1}" for i, s in enumerate(plot.series)]
    except Exception:  # noqa: BLE001
        return None
    xml = etree.tostring(shape.chart._chartSpace).decode()
    kind = "column"
    if "<c:pieChart" in xml:
        kind = "pie"
    elif "<c:doughnutChart" in xml:
        kind = "ring"
    elif "<c:lineChart" in xml:
        kind = "line"
    elif "<c:areaChart" in xml:
        kind = "area"
    elif "<c:radarChart" in xml:
        kind = "radar"
    elif "<c:scatterChart" in xml:
        kind = "scatter"
    elif 'barDir val="bar"' in xml:
        kind = "bar"
    palette = [ctx.colors.get(f"accent{i}") for i in range(1, 7)]
    return {**box, "id": ctx.nid("chart"), "type": "chart", "chartType": kind, "data": {"labels": cats, "legends": names, "series": series}, "themeColors": [c for c in palette if c] or ["#2F5D8A"], "textColor": ctx.colors.get("dk1", "#333333")}


def table_el(ctx: Ctx, shape, box: dict) -> dict:
    tbl = shape.table
    rows = []
    for r in tbl.rows:
        row = []
        for c in r.cells:
            if c.is_spanned:
                continue
            cell = {"id": ctx.nid("c"), "text": c.text.replace("\n", " "), "colspan": c.span_width, "rowspan": c.span_height}
            tcpr = c._tc.find(f"{A}tcPr")
            col, _ = color_el(ctx, tcpr.find(f"{A}solidFill")) if tcpr is not None and tcpr.find(f"{A}solidFill") is not None else (None, None)
            st = {}
            if col:
                st["backcolor"] = col
            r0 = c._tc.find(f".//{A}rPr")
            if r0 is not None:
                if r0.get("b") in ("1", "true"):
                    st["bold"] = True
                fc, _ = color_el(ctx, r0.find(f"{A}solidFill"))
                if fc:
                    st["color"] = fc
            if st:
                cell["style"] = st
            row.append(cell)
        rows.append(row)
    total = sum(c.width for c in tbl.columns) or 1
    return {**box, "id": ctx.nid("table"), "type": "table", "outline": {"width": 1, "style": "solid", "color": "#BBBBBB"}, "colWidths": [c.width / total for c in tbl.columns], "data": rows, "theme": {"color": ctx.colors.get("accent1", "#2F5D8A"), "rowHeader": bool(tbl.first_row)}}


def iter_shapes(shapes):
    """Như python-pptx `shapes` nhưng không bỏ sót hình bọc trong mc:AlternateContent (công thức Office Math, hình PowerPoint 2010+)."""
    from pptx.shapes import shapetree as st  # noqa: PLC0415

    kind = type(shapes).__name__
    factory = st.SlideShapeFactory if kind in ("SlideShapes", "GroupShapes") else getattr(st, "_LayoutShapeFactory", st.BaseShapeFactory) if kind == "LayoutShapes" else getattr(st, "_MasterShapeFactory", st.BaseShapeFactory) if kind == "MasterShapes" else st.BaseShapeFactory
    BaseShapeFactory = factory  # noqa: N806
    tree = shapes._spTree
    for child in tree.iterchildren():
        tag = etree.QName(child).localname
        if tag in ("sp", "pic", "grpSp", "graphicFrame", "cxnSp"):
            yield BaseShapeFactory(child, shapes)
        elif tag == "AlternateContent":
            choice = child.find("{%s}Choice" % NSM["mc"])
            if choice is None:
                continue
            for inner in choice:
                if etree.QName(inner).localname in ("sp", "pic", "grpSp", "graphicFrame", "cxnSp"):
                    yield BaseShapeFactory(inner, shapes)


def walk(ctx: Ctx, shapes, slide, tf, els: list, texts: list, skip_placeholders: bool) -> None:
    """tf: hàm (x, y) EMU → px canvas, cùng hệ số tỉ lệ sx, sy."""
    for sh in iter_shapes(shapes):
        try:
            if skip_placeholders and sh.is_placeholder:
                continue
            emit(ctx, sh, slide, tf, els, texts)
        except Exception:  # noqa: BLE001 — một hình lỗi không làm hỏng cả slide
            continue


def emit(ctx: Ctx, sh, slide, tf, els: list, texts: list) -> None:
    fn, sx, sy = tf
    if sh.shape_type == MSO_SHAPE_TYPE.GROUP:
        xfrm = sh._element.find(f"{{{NSM['p']}}}grpSpPr/{A}xfrm")
        if xfrm is None:
            walk(ctx, sh.shapes, slide, tf, els, texts, False)
            return
        off, ext = xfrm.find(f"{A}off"), xfrm.find(f"{A}ext")
        cho, che = xfrm.find(f"{A}chOff"), xfrm.find(f"{A}chExt")
        ox, oy, ew, eh = int(off.get("x")), int(off.get("y")), int(ext.get("cx")), int(ext.get("cy"))
        cx, cy = (int(cho.get("x")), int(cho.get("y"))) if cho is not None else (ox, oy)
        cw, chh = (int(che.get("cx")), int(che.get("cy"))) if che is not None else (ew, eh)
        kx = ew / cw if cw else 1
        ky = eh / chh if chh else 1

        def inner(x, y, fn=fn):
            return fn(ox + (x - cx) * kx, oy + (y - cy) * ky)

        walk(ctx, sh.shapes, slide, (inner, sx * kx, sy * ky), els, texts, False)
        return
    if sh.left is None or sh.width is None:
        return
    x, y = fn(sh.left, sh.top)
    w, h = sh.width * sx, sh.height * sy
    if x + w <= 0 or y + h <= 0 or x >= CANVAS_W or y >= CANVAS_H:
        return  # hình nằm ngoài trang (biểu tượng lời đọc, hình chờ…)
    box = {"left": round(x, 2), "top": round(y, 2), "width": round(max(w, 1), 2), "height": round(max(h, 1), 2)}
    rot = sh.rotation if hasattr(sh, "rotation") else 0
    if rot:
        box["rotate"] = round(rot, 2)
    el = sh._element
    sppr = el.find(f"{{{NSM['p']}}}spPr")
    style = el.find(f"{{{NSM['p']}}}style")

    if sh.shape_type == MSO_SHAPE_TYPE.PICTURE or el.tag.endswith("}pic"):
        try:
            img = sh.image
        except Exception:  # noqa: BLE001
            return
        crop = (sh.crop_left, sh.crop_top, sh.crop_right, sh.crop_bottom)
        src = image_src(ctx, img.blob, img.content_type, crop, w, h)
        if src:
            els.append({**box, "id": ctx.nid("img"), "type": "image", "src": src, "fixedRatio": True})
        return
    if getattr(sh, "has_chart", False) and sh.has_chart:
        c = chart_el(ctx, sh, box)
        if c:
            els.append(c)
        return
    if getattr(sh, "has_table", False) and sh.has_table:
        els.append(table_el(ctx, sh, box))
        texts.append(" ".join(c.text for r in sh.table.rows for c in r.cells))
        return
    if el.tag.endswith("}cxnSp") or sh.shape_type == MSO_SHAPE_TYPE.LINE:
        ln = line_of(ctx, sppr, style) or {"color": ctx.colors.get("dk1", "#333333"), "width": 1}
        flip_h = sh._element.find(f".//{A}xfrm") is not None and sh._element.find(f".//{A}xfrm").get("flipH") == "1"
        flip_v = sh._element.find(f".//{A}xfrm") is not None and sh._element.find(f".//{A}xfrm").get("flipV") == "1"
        start = [w if flip_h else 0, h if flip_v else 0]
        end = [0 if flip_h else w, 0 if flip_v else h]
        tail = sppr.find(f"{A}ln/{A}tailEnd") if sppr is not None else None
        head = sppr.find(f"{A}ln/{A}headEnd") if sppr is not None else None
        pts = ["arrow" if head is not None and head.get("type") not in (None, "none") else "", "arrow" if tail is not None and tail.get("type") not in (None, "none") else ""]
        els.append({"id": ctx.nid("line"), "type": "line", "left": box["left"], "top": box["top"], "width": max(ln["width"], 1), "height": 0, "start": [round(v, 2) for v in start], "end": [round(v, 2) for v in end], "style": ln.get("style", "solid"), "color": ln["color"], "points": pts})
        return

    txbody = el.find(f"{{{NSM['p']}}}txBody")
    font_default = None
    if style is not None and style.find(f"{A}fontRef") is not None:
        font_default, _ = color_el(ctx, style.find(f"{A}fontRef"))
    html, plain, formulas, max_px = ("", "", [], 0.0)
    if txbody is not None:
        html, plain, formulas, max_px = text_html(ctx, sh, slide, txbody, font_default or ctx.colors.get("dk1"))
    fill, alpha, grad = fill_of(ctx, sppr, style)
    line = line_of(ctx, sppr, style)
    prst_el = sppr.find(f"{A}prstGeom") if sppr is not None else None
    prst = prst_el.get("prst") if prst_el is not None else ("rect" if sppr is not None and sppr.find(f"{A}custGeom") is None else "rect")
    if plain:
        texts.append(plain)
        if max_px > ctx.best[0]:
            ctx.best = (max_px, plain)
    body_pr = txbody.find(f"{A}bodyPr") if txbody is not None else None
    anchor = body_pr.get("anchor") if body_pr is not None and body_pr.get("anchor") else None
    try:
        is_title = sh.is_placeholder and "TITLE" in str(sh.placeholder_format.type).upper() and "SUB" not in str(sh.placeholder_format.type).upper()
    except ValueError:
        is_title = False
    if is_title and anchor is None:
        anchor = "ctr"
    valign = {"ctr": "middle", "b": "bottom"}.get(anchor or "t", "top")
    only_formula = bool(formulas) and plain.replace(" ", "") == "".join(f"${f}$" for f in formulas).replace(" ", "")
    if fill is None and grad is None and line is None:
        if only_formula and len(formulas) == 1:
            els.append({**box, "id": ctx.nid("latex"), "type": "latex", "latex": formulas[0], "color": ctx.colors.get("dk1", "#000000"), "align": "center", "path": "", "viewBox": [box["width"], box["height"]], "fixedRatio": True})
            return
        if html and plain:
            els.append({**box, "id": ctx.nid("text"), "type": "text", "content": html, "defaultFontName": "", "defaultColor": ctx.colors.get("dk1", "#333333"), "lineHeight": 1.2, "vAlign": valign, **({"name": "title"} if is_title else {})})
        return
    shape = {**box, "id": ctx.nid("shape"), "type": "shape", "viewBox": [box["width"], box["height"]], "path": geom_path(prst, box["width"], box["height"], sppr), "fixedRatio": False, "fill": fill or "transparent"}
    if alpha is not None:
        shape["opacity"] = round(alpha, 3)
    if grad:
        shape["gradient"] = grad
    if line:
        shape["outline"] = line
    if html and plain:
        shape["text"] = {"content": html, "defaultFontName": "", "defaultColor": ctx.colors.get("dk1", "#333333"), "align": valign}
    els.append(shape)


def slide_background(ctx: Ctx, slide) -> tuple[dict, list]:
    """Nền: màu đặc / gradient / ảnh (ảnh → phần tử dưới cùng). Lần theo slide → layout → master."""
    chain = [slide, slide.slide_layout, slide.slide_layout.slide_master]
    for holder in chain:
        bg = holder._element.find(f"{{{NSM['p']}}}cSld/{{{NSM['p']}}}bg")
        if bg is None:
            continue
        bgpr = bg.find(f"{{{NSM['p']}}}bgPr")
        ref = bg.find(f"{{{NSM['p']}}}bgRef")
        if bgpr is not None:
            sf = bgpr.find(f"{A}solidFill")
            if sf is not None:
                c, _ = color_el(ctx, sf)
                return {"type": "solid", "color": c or "#FFFFFF"}, []
            gf = bgpr.find(f"{A}gradFill")
            if gf is not None:
                stops = []
                for gs in gf.findall(f"{A}gsLst/{A}gs"):
                    c, _ = color_el(ctx, gs)
                    if c:
                        stops.append({"pos": round(int(gs.get("pos", "0")) / 1000), "color": c})
                if stops:
                    return {"type": "gradient", "gradient": {"type": "linear", "colors": stops, "rotate": 180}}, []
            blip = bgpr.find(f"{A}blipFill/{A}blip")
            if blip is not None:
                rid = blip.get(f"{{{NSM['r']}}}embed")
                try:
                    part = holder.part.related_part(rid)
                    src = image_src(ctx, part.blob, part.content_type, None, CANVAS_W, CANVAS_H)
                except Exception:  # noqa: BLE001
                    src = None
                if src:
                    return {"type": "solid", "color": "#FFFFFF"}, [{"id": ctx.nid("bg"), "type": "image", "left": ctx.ox, "top": ctx.oy, "width": CANVAS_W - 2 * ctx.ox, "height": CANVAS_H - 2 * ctx.oy, "src": src, "fixedRatio": False}]
        if ref is not None:
            c, _ = color_el(ctx, ref)
            if c:
                return {"type": "solid", "color": c}, []
    return {"type": "solid", "color": ctx.colors.get("lt1", "#FFFFFF")}, []


def show_master_shapes(holder) -> bool:
    v = holder._element.get("showMasterSp")
    return v not in ("0", "false")


TURNING = {"fade": "fade", "push": "slideX", "cover": "slideX", "pull": "slideX", "wipe": "slideX", "split": "slideY", "zoom": "scale", "morph": "fade", "dissolve": "fade", "randomBar": "random", "random": "random", "cut": "no"}


def turning_mode(slide) -> str | None:
    """Kiểu chuyển trang của slide (p:transition, kể cả trong mc:AlternateContent) → turningMode của OpenMAIC."""
    root = slide._element
    for tr in root.iter("{%s}transition" % NSM["p"]):
        for ch in tr:
            name = etree.QName(ch).localname
            if name in ("sndAc", "extLst"):
                continue
            return TURNING.get(name, "fade")
        return None
    return None


def cmd_import(path: str, _args: list[str]) -> int:
    prs = Presentation(path)
    ctx = Ctx(prs)
    base = (lambda x, y: (ctx.ox + x * ctx.k, ctx.oy + y * ctx.k), ctx.k, ctx.k)
    slides = []
    title_guess = ""
    for i, slide in enumerate(prs.slides):
        layout = slide.slide_layout
        master = layout.slide_master
        ctx.colors = theme_colors(master)
        bg, bg_els = slide_background(ctx, slide)
        els: list = list(bg_els)
        texts: list[str] = []
        if show_master_shapes(slide) and show_master_shapes(layout):
            walk(ctx, master.shapes, slide, base, els, [], True)
        if show_master_shapes(slide):
            walk(ctx, layout.shapes, slide, base, els, [], True)
        ctx.best = (0.0, "")
        walk(ctx, slide.shapes, slide, base, els, texts, False)
        title = ""
        try:
            if slide.shapes.title is not None and slide.shapes.title.has_text_frame:
                title = slide.shapes.title.text_frame.text.strip()
        except Exception:  # noqa: BLE001
            title = ""
        if not title:
            # không có placeholder tiêu đề: lấy dòng chữ cỡ lớn nhất của trang
            title = ctx.best[1].split("\n")[0].strip() or next((t.split("\n")[0].strip() for t in texts if t.strip()), f"Trang {i + 1}")
        title = re.sub(r"\s+", " ", title)[:120]
        if i == 0:
            title_guess = title
        notes = ""
        if slide.has_notes_slide:
            notes = (slide.notes_slide.notes_text_frame.text if slide.notes_slide.notes_text_frame is not None else "").strip()
        hidden = slide._element.get("show") in ("0", "false")
        slides.append({"title": title, "elements": els, "background": bg, "notes": notes, "text": "\n".join(texts)[:4000], "hidden": hidden, "turningMode": turning_mode(slide)})
    out({"ok": True, "title": title_guess, "width": prs.slide_width, "height": prs.slide_height, "images": ctx.images, "slides": slides})
    return 0
