#!/usr/bin/env python3
"""EDUVN ↔ ppt-master (MIT, hugohe3/ppt-master) — sidecar dựng/nhập PowerPoint gốc.

Máy chủ EDUVN (server/src/services/pptx) sinh SVG theo hợp đồng ppt-master rồi gọi script này:

    eduvn_pptx.py build   <job.json>      # SVG → .pptx gốc (+ đổ vào mẫu .pptx của trường)
    eduvn_pptx.py omml                    # stdin: ["\\frac{a}{b}", ...] → JSON OMML từng công thức
    eduvn_pptx.py analyze <mau.pptx>      # đọc màu/phông/bố cục của mẫu → JSON
    eduvn_pptx.py import  <bai.pptx>      # .pptx → cảnh slide (JSON phần tử OpenMAIC), xem import_pptx.py

Chạy bằng venv ~/Apps/pptmaster (python-pptx, Pillow, skia-pathops, uharfbuzz). Không gọi mạng.
Mọi kết quả in ra stdout dạng một dòng JSON; lỗi → {"ok": false, "error": "..."} và mã thoát 1.
"""
from __future__ import annotations

import json
import os
import posixpath
import re
import subprocess
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

HERE = Path(__file__).resolve().parent
SKILL = Path(os.environ.get("PPTMASTER_SKILL") or Path.home() / "Apps/pptmaster/src/ppt-master")
SCRIPTS = SKILL / "scripts"
sys.path.insert(0, str(SCRIPTS))
sys.path.insert(0, str(HERE))

SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG_NS)

REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
CT_NS = "http://schemas.openxmlformats.org/package/2006/content-types"
T_SLIDE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide"
T_LAYOUT = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout"
T_NOTES = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide"
T_NOTES_MASTER = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster"
T_THEME = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme"
T_MASTER = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster"


def out(obj: dict) -> None:
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")


# ---------------------------------------------------------------------------
# Công thức: LaTeX → OMML (bộ biên dịch MIT của ppt-master)
# ---------------------------------------------------------------------------

def compile_formula(latex: str, display: bool) -> tuple[bool, str]:
    from svg_to_pptx.native_objects.formula_compiler import (  # noqa: PLC0415
        FormulaCompileError,
        compile_latex_to_inline_omml,
        compile_latex_to_omml,
    )
    try:
        return True, (compile_latex_to_omml(latex) if display else compile_latex_to_inline_omml(latex))
    except FormulaCompileError as exc:
        return False, str(exc)
    except Exception as exc:  # noqa: BLE001 — công thức lạ không được làm hỏng cả bài
        return False, f"{type(exc).__name__}: {exc}"


def cmd_omml() -> int:
    items = json.loads(sys.stdin.read() or "[]")
    res = []
    for it in items:
        latex = it if isinstance(it, str) else it.get("latex", "")
        display = True if isinstance(it, str) else bool(it.get("display", True))
        ok, val = compile_formula(latex, display)
        res.append({"latex": latex, "ok": ok, **({"omml": val} if ok else {"error": val})})
    out({"ok": True, "results": res})
    return 0


def fix_formulas(svg_dir: Path, warnings: list[str]) -> int:
    """Công thức không biên dịch được thì bỏ marker, giữ chữ xem trước (không để lọt LaTeX thô, không chặn cả bài)."""
    count = 0
    for svg in sorted(svg_dir.glob("*.svg")):
        tree = ET.parse(svg)
        root = tree.getroot()
        changed = False
        for el in root.iter():
            inline = el.get("data-pptx-inline-formula")
            if inline is not None:
                ok, err = compile_formula(inline, False)
                count += 1
                if not ok:
                    del el.attrib["data-pptx-inline-formula"]
                    warnings.append(f"{svg.stem}: công thức “{inline[:60]}” xuất dạng chữ ({err[:80]})")
                    changed = True
            if el.get("data-pptx-replace-with") == "formula":
                meta = el.find(f"{{{SVG_NS}}}metadata")
                latex = ""
                try:
                    latex = json.loads(meta.text or "{}").get("latex", "") if meta is not None else ""
                except json.JSONDecodeError:
                    latex = ""
                ok, err = compile_formula(latex, True) if latex else (False, "thiếu LaTeX")
                count += 1
                if not ok:
                    for k in [k for k in el.attrib if k.startswith("data-pptx-") and k != "data-pptx-bounds"]:
                        del el.attrib[k]
                    if meta is not None:
                        el.remove(meta)
                    warnings.append(f"{svg.stem}: công thức “{latex[:60]}” xuất dạng chữ ({err[:80]})")
                    changed = True
        if changed:
            tree.write(svg, encoding="utf-8", xml_declaration=False)
    return count


# ---------------------------------------------------------------------------
# build: SVG → PPTX
# ---------------------------------------------------------------------------

def run(cmd: list[str], cwd: Path, timeout: int = 600) -> subprocess.CompletedProcess:
    env = {**os.environ, "PYTHONIOENCODING": "utf-8"}
    return subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, timeout=timeout, env=env)


def tail(s: str, n: int = 12) -> str:
    return "\n".join([ln for ln in (s or "").splitlines() if ln.strip()][-n:])


def cmd_build(job_path: str) -> int:
    job = json.loads(Path(job_path).read_text(encoding="utf-8"))
    proj = Path(job["project"]).resolve()
    output = Path(job["output"]).resolve()
    warnings: list[str] = []
    formulas = fix_formulas(proj / "svg_output", warnings)
    py = sys.executable
    args = ["--primary-language", "vi-VN", "--reflow-text", "--native-charts-and-tables", "-q"]
    args += ["-t", job.get("transition") or "fade"]
    if job.get("transitionDuration"):
        args += ["--transition-duration", str(job["transitionDuration"])]
    has_notes = any((proj / "notes").glob("*.md")) if (proj / "notes").exists() else False
    args += ["--with-notes"] if has_notes else ["--no-notes"]
    if job.get("narration") and (proj / "audio").exists():
        args += ["--recorded-narration", "audio"]
    if (proj / "animations.json").exists():
        args += ["--animation-config", "animations.json"]
    elif job.get("narration"):
        args += ["--no-animations"]
    tmp_out = proj / "exports" / "eduvn.pptx"
    tmp_out.parent.mkdir(parents=True, exist_ok=True)
    route = "quick"
    chk = run([py, str(SCRIPTS / "svg_quality_checker.py"), str(proj), "--quick-generate", "--canonical-authoring", "--stage", "final", "--json"], proj)
    res = None
    if chk.returncode == 0:
        res = run([py, str(SCRIPTS / "svg_to_pptx.py"), str(proj), "--quick-generate", "-o", str(tmp_out), *args], proj)
    if res is None or res.returncode != 0 or not tmp_out.exists():
        # Trang tự do (cảnh AI chồng lớp) không qua được cổng kiểm “Quick” → đường xuất tương thích của ppt-master (vẫn là hình gốc sửa được).
        route = "compat"
        if res is not None and res.returncode != 0:
            warnings.append("quick: " + tail(res.stdout + res.stderr, 3))
        res = run([py, str(SCRIPTS / "svg_to_pptx.py"), str(proj), "--enable-dangerous-nonconforming-svg-export", "-o", str(tmp_out), *args], proj)
    if res.returncode != 0 or not tmp_out.exists():
        out({"ok": False, "error": "ppt-master không dựng được PPTX", "detail": tail(res.stdout + res.stderr, 20), "warnings": warnings})
        return 1
    final = tmp_out
    tpl = job.get("template")
    if tpl:
        transplant(tmp_out, Path(tpl["path"]), output, job.get("slides") or [], tpl)
    else:
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(final.read_bytes())
    out({"ok": True, "output": str(output), "route": route, "formulas": formulas, "warnings": warnings})
    return 0


# ---------------------------------------------------------------------------
# Mẫu .pptx của trường: đọc thông tin + đổ bài vào mẫu (giữ master/layout/theme nguyên byte)
# ---------------------------------------------------------------------------

A = "http://schemas.openxmlformats.org/drawingml/2006/main"
P = "http://schemas.openxmlformats.org/presentationml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


def rels_path(part: str) -> str:
    d, f = posixpath.split(part)
    return posixpath.join(d, "_rels", f + ".rels")


def parse_rels(data: bytes | None) -> list[dict]:
    if not data:
        return []
    root = ET.fromstring(data)
    return [dict(r.attrib) for r in root.findall(f"{{{REL_NS}}}Relationship")]


def rels_xml(rels: list[dict]) -> bytes:
    body = "".join(
        f'<Relationship Id="{r["Id"]}" Type="{r["Type"]}" Target="{xml_attr(r["Target"])}"' + (f' TargetMode="{r["TargetMode"]}"' if r.get("TargetMode") else "") + "/>"
        for r in rels
    )
    return f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="{REL_NS}">{body}</Relationships>'.encode()


def xml_attr(s: str) -> str:
    return s.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")


def resolve(base_part: str, target: str) -> str:
    if target.startswith("/"):
        return target[1:]
    return posixpath.normpath(posixpath.join(posixpath.dirname(base_part), target))


def relative(from_part: str, to_part: str) -> str:
    return posixpath.relpath(to_part, posixpath.dirname(from_part))


class ContentTypes:
    def __init__(self, data: bytes):
        root = ET.fromstring(data)
        self.defaults = {d.get("Extension").lower(): d.get("ContentType") for d in root.findall(f"{{{CT_NS}}}Default")}
        self.overrides = {o.get("PartName").lstrip("/"): o.get("ContentType") for o in root.findall(f"{{{CT_NS}}}Override")}

    def of(self, part: str) -> str | None:
        return self.overrides.get(part) or self.defaults.get(part.rsplit(".", 1)[-1].lower())

    def xml(self) -> bytes:
        d = "".join(f'<Default Extension="{e}" ContentType="{c}"/>' for e, c in self.defaults.items())
        o = "".join(f'<Override PartName="/{p}" ContentType="{c}"/>' for p, c in self.overrides.items())
        return f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="{CT_NS}">{d}{o}</Types>'.encode()


def theme_info(data: bytes) -> dict:
    root = ET.fromstring(data)
    colors: dict[str, str] = {}
    scheme = root.find(f".//{{{A}}}clrScheme")
    if scheme is not None:
        for c in scheme:
            name = c.tag.split("}")[1]
            srgb = c.find(f"{{{A}}}srgbClr")
            sysc = c.find(f"{{{A}}}sysClr")
            if srgb is not None:
                colors[name] = "#" + srgb.get("val", "000000").upper()
            elif sysc is not None:
                colors[name] = "#" + (sysc.get("lastClr") or ("000000" if sysc.get("val") == "windowText" else "FFFFFF")).upper()
    fonts = {}
    for kind in ("majorFont", "minorFont"):
        f = root.find(f".//{{{A}}}fontScheme/{{{A}}}{kind}/{{{A}}}latin")
        if f is not None:
            fonts["major" if kind == "majorFont" else "minor"] = f.get("typeface")
    return {"colors": colors, "fonts": fonts}


def layout_info(data: bytes) -> dict:
    root = ET.fromstring(data)
    csld = root.find(f"{{{P}}}cSld")
    info = {"type": root.get("type") or "", "name": csld.get("name") if csld is not None else "", "placeholders": []}
    for sp in root.iter(f"{{{P}}}sp"):
        ph = sp.find(f".//{{{P}}}nvPr/{{{P}}}ph")
        if ph is None:
            continue
        off = sp.find(f"{{{P}}}spPr/{{{A}}}xfrm/{{{A}}}off")
        ext = sp.find(f"{{{P}}}spPr/{{{A}}}xfrm/{{{A}}}ext")
        box = None
        if off is not None and ext is not None:
            box = [int(off.get("x", 0)), int(off.get("y", 0)), int(ext.get("cx", 0)), int(ext.get("cy", 0))]
        info["placeholders"].append({"type": ph.get("type") or "body", "idx": ph.get("idx") or "0", "box": box})
    return info


def master_placeholders(data: bytes) -> dict:
    """Vị trí title/body mặc định ở master (layout thường kế thừa)."""
    li = layout_info(data)
    res = {}
    for ph in li["placeholders"]:
        if ph["box"] and ph["type"] in ("title", "body") and ph["type"] not in res:
            res[ph["type"]] = ph["box"]
    return res


def bg_color(data: bytes, colors: dict) -> str | None:
    root = ET.fromstring(data)
    bg = root.find(f"{{{P}}}cSld/{{{P}}}bg")
    if bg is None:
        return None
    srgb = bg.find(f".//{{{A}}}srgbClr")
    if srgb is not None:
        return "#" + srgb.get("val", "FFFFFF").upper()
    sch = bg.find(f".//{{{A}}}schemeClr")
    if sch is not None:
        m = {"bg1": "lt1", "bg2": "lt2", "tx1": "dk1", "tx2": "dk2"}
        return colors.get(m.get(sch.get("val"), sch.get("val")))
    if bg.find(f".//{{{A}}}blipFill") is not None:
        return "image"
    return None


def analyze(path: Path) -> dict:
    z = zipfile.ZipFile(path)
    names = set(z.namelist())
    pres = z.read("ppt/presentation.xml")
    root = ET.fromstring(pres)
    sz = root.find(f"{{{P}}}sldSz")
    cx, cy = int(sz.get("cx")), int(sz.get("cy"))
    prel = parse_rels(z.read("ppt/_rels/presentation.xml.rels"))
    masters = [resolve("ppt/presentation.xml", r["Target"]) for r in prel if r["Type"] == T_MASTER]
    if not masters:
        raise ValueError("Tệp mẫu không có slide master")
    master = masters[0]
    mrels = parse_rels(z.read(rels_path(master)) if rels_path(master) in names else None)
    theme_part = next((resolve(master, r["Target"]) for r in mrels if r["Type"] == T_THEME), None)
    th = theme_info(z.read(theme_part)) if theme_part else {"colors": {}, "fonts": {}}
    mdata = z.read(master)
    mph = master_placeholders(mdata)
    layouts = []
    for r in mrels:
        if r["Type"] != T_LAYOUT:
            continue
        part = resolve(master, r["Target"])
        if part not in names:
            continue
        li = layout_info(z.read(part))
        for ph in li["placeholders"]:
            base = mph.get("title" if ph["type"] in ("title", "ctrTitle") else "body" if ph["type"] in ("body", "obj", "subTitle") else ph["type"])
            if ph["box"] is None or ph["box"][2] <= 0 or ph["box"][3] <= 0:
                # vị trí kế thừa (hoặc xfrm thiếu chiều) → lấy theo master
                if base:
                    ph["box"] = [ph["box"][i] if ph["box"] and ph["box"][i] > 0 and i in (0, 2) else base[i] for i in range(4)] if ph["box"] else base
        layouts.append({"part": part, **li})
    slides = sum(1 for r in prel if r["Type"] == T_SLIDE)
    bg = bg_color(mdata, th["colors"])
    has_logo = any(n.startswith("ppt/media/") for n in names) and b"<p:pic" in mdata or any(b"<p:pic" in z.read(l["part"]) for l in layouts)
    return {"width": cx, "height": cy, "theme": th, "layouts": layouts, "background": bg, "sampleSlides": slides, "hasPicture": bool(has_logo), "master": master}


def cmd_analyze(path: str) -> int:
    out({"ok": True, **analyze(Path(path))})
    return 0


def pick_layout(layouts: list[dict], kind: str) -> dict:
    order = {
        "title": ["title", "ctrTitle"],
        "section": ["secHead", "titleOnly", "title"],
        "content": ["obj", "tx", "titleOnly"],
        "titleOnly": ["titleOnly", "obj", "tx"],
        "blank": ["blank", "titleOnly", "obj"],
    }.get(kind, ["titleOnly", "obj"])
    for t in order:
        for l in layouts:
            if l["type"] == t:
                return l
    for l in layouts:  # mẫu không gắn type: đoán theo placeholder
        types = {p["type"] for p in l["placeholders"]}
        if kind == "title" and "ctrTitle" in types:
            return l
        if kind in ("content", "titleOnly", "section") and "title" in types:
            return l
    return layouts[0]


_SP_RE = re.compile(r"<p:sp>(?:(?!<p:sp>).)*?</p:sp>", re.S)


def to_placeholder(xml: str, shape_name: str, ph: dict | None) -> str:
    """Biến hình chữ tên `shape_name` thành placeholder của layout (kế thừa vị trí, phông, màu của mẫu)."""
    if ph is None:
        return xml
    for m in list(_SP_RE.finditer(xml)):
        sp = m.group(0)
        if f'name="{shape_name}"' not in sp:
            continue
        ph_attr = f'type="{ph["type"]}"' if ph["type"] not in ("body", "obj") else ""
        if ph["idx"] not in ("0", None) or ph["type"] in ("body", "obj"):
            ph_attr += f' idx="{ph["idx"]}"'
        new = re.sub(r"<p:cNvSpPr[^>]*/>|<p:cNvSpPr[^>]*>.*?</p:cNvSpPr>", '<p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>', sp, count=1, flags=re.S)
        new = re.sub(r"<p:nvPr\s*/>|<p:nvPr>.*?</p:nvPr>", f"<p:nvPr><p:ph {ph_attr.strip()}/></p:nvPr>", new, count=1, flags=re.S)
        new = re.sub(r"<p:spPr>.*?</p:spPr>|<p:spPr\s*/>", "<p:spPr/>", new, count=1, flags=re.S)
        new = re.sub(r"<a:bodyPr[^>]*/>|<a:bodyPr[^>]*>.*?</a:bodyPr>", "<a:bodyPr><a:normAutofit/></a:bodyPr>", new, count=1, flags=re.S)
        # bỏ định dạng chữ tường minh để mẫu quyết định
        new = re.sub(r"<a:rPr([^>]*?)(/?)>", lambda mm: "<a:rPr" + re.sub(r'\s(sz|b|i)="[^"]*"', "", mm.group(1)) + mm.group(2) + ">", new)
        new = re.sub(r"<a:solidFill>.*?</a:solidFill>", "", new, flags=re.S) if "<p:txBody>" in new else new
        new = re.sub(r"<a:(latin|ea|cs) typeface=\"[^\"]*\"\s*/>", "", new)
        new = re.sub(r"<a:pPr[^>]*?(/?)>", lambda mm: "<a:pPr" + mm.group(1) + ">", new)
        new = re.sub(r"<a:buNone\s*/>", "", new)
        xml = xml.replace(sp, new, 1)  # cả bản mc:Choice lẫn mc:Fallback
    return xml


def transplant(gen_path: Path, tpl_path: Path, out_path: Path, plan: list[dict], tpl_opts: dict) -> None:
    gen = zipfile.ZipFile(gen_path)
    tpl = zipfile.ZipFile(tpl_path)
    files: dict[str, bytes] = {n: tpl.read(n) for n in tpl.namelist() if not n.endswith("/")}
    gnames = set(gen.namelist())
    ct = ContentTypes(files["[Content_Types].xml"])
    gct = ContentTypes(gen.read("[Content_Types].xml"))
    pres_xml = files["ppt/presentation.xml"].decode("utf-8")
    prels = parse_rels(files["ppt/_rels/presentation.xml.rels"])

    # 1) bỏ slide mẫu trong tệp mẫu (giữ master/layout/theme/media)
    removed_ids = []
    for r in [r for r in prels if r["Type"] == T_SLIDE]:
        part = resolve("ppt/presentation.xml", r["Target"])
        for rr in parse_rels(files.get(rels_path(part))):
            if rr["Type"] == T_NOTES:
                np_ = resolve(part, rr["Target"])
                files.pop(np_, None)
                files.pop(rels_path(np_), None)
                ct.overrides.pop(np_, None)
        files.pop(part, None)
        files.pop(rels_path(part), None)
        ct.overrides.pop(part, None)
        prels.remove(r)
        removed_ids.append(r["Id"])
    pres_xml = re.sub(r"<p:sldIdLst>.*?</p:sldIdLst>|<p:sldIdLst\s*/>", "", pres_xml, flags=re.S)
    pres_xml = re.sub(r"<p:custShowLst>.*?</p:custShowLst>", "", pres_xml, flags=re.S)
    pres_xml = re.sub(r'<p:ext uri="\{521415D9-36F7-43E2-AB2F-B90AF26B5E84\}">.*?</p:ext>', "", pres_xml, flags=re.S)

    info = analyze(tpl_path)
    layouts = info["layouts"]
    used = set(files)
    copied: dict[str, str] = {}

    def fresh(part: str) -> str:
        if part not in used:
            used.add(part)
            return part
        d, f = posixpath.split(part)
        stem, ext = (f.rsplit(".", 1) + [""])[:2]
        stem = re.sub(r"\d+$", "", stem) or "part"
        i = 1
        while True:
            cand = posixpath.join(d, f"{stem}{i}.{ext}" if ext else f"{stem}{i}")
            if cand not in used:
                used.add(cand)
                return cand
            i += 1

    def copy_part(src: str, rename_rels: dict | None = None) -> str:
        """Chép một part từ bản dựng (kèm .rels đệ quy) sang gói mẫu, đổi tên nếu trùng."""
        if src in copied:
            return copied[src]
        dst = fresh(src)
        copied[src] = dst
        files[dst] = gen.read(src)
        ctype = gct.of(src)
        ext = src.rsplit(".", 1)[-1].lower()
        if ctype and gct.overrides.get(src):
            ct.overrides[dst] = ctype
        elif ext not in ct.defaults and ctype:
            ct.defaults[ext] = ctype
        rp = rels_path(src)
        if rp in gnames:
            new_rels = []
            for rr in parse_rels(gen.read(rp)):
                if rr.get("TargetMode") == "External":
                    new_rels.append(rr)
                    continue
                if rename_rels and rr["Type"] in rename_rels:
                    tgt = rename_rels[rr["Type"]]
                    if tgt is None:
                        continue
                    new_rels.append({**rr, "Target": relative(dst, tgt)})
                    continue
                child = resolve(src, rr["Target"])
                if child not in gnames:
                    continue
                new_rels.append({**rr, "Target": relative(dst, copy_part(child))})
            files[rels_path(dst)] = rels_xml(new_rels)
        return dst

    # notes master (nếu bản dựng có ghi chú mà mẫu chưa có)
    tpl_nm = next((resolve("ppt/presentation.xml", r["Target"]) for r in prels if r["Type"] == T_NOTES_MASTER), None)
    gprels = parse_rels(gen.read("ppt/_rels/presentation.xml.rels"))
    gen_nm = next((resolve("ppt/presentation.xml", r["Target"]) for r in gprels if r["Type"] == T_NOTES_MASTER), None)
    gen_pres = gen.read("ppt/presentation.xml").decode("utf-8")
    gen_slide_rids = re.findall(r'<p:sldId [^>]*r:id="([^"]+)"', gen_pres)
    gmap = {r["Id"]: resolve("ppt/presentation.xml", r["Target"]) for r in gprels}
    gen_slides = [gmap[i] for i in gen_slide_rids if i in gmap]
    needs_notes = any(any(rr["Type"] == T_NOTES for rr in parse_rels(gen.read(rels_path(s)) if rels_path(s) in gnames else None)) for s in gen_slides)
    if needs_notes and not tpl_nm and gen_nm:
        tpl_nm = copy_part(gen_nm)
        rid = next_rid(prels)
        prels.append({"Id": rid, "Type": T_NOTES_MASTER, "Target": relative("ppt/presentation.xml", tpl_nm)})
        pres_xml = re.sub(r"(</p:sldMasterIdLst>)", rf'\1<p:notesMasterIdLst><p:notesMasterId r:id="{rid}"/></p:notesMasterIdLst>', pres_xml, count=1)

    # 2) chép slide đã dựng, trỏ về layout của mẫu
    sld_entries = []
    next_id = 256
    for i, src in enumerate(gen_slides):
        sp = plan[i] if i < len(plan) else {}
        lay = pick_layout(layouts, sp.get("layout") or "titleOnly")
        dst = fresh(f"ppt/slides/slide{i + 1}.xml")
        copied[src] = dst
        xml = gen.read(src).decode("utf-8")
        # bỏ nền riêng của slide để nền/logo của master hiện ra
        if tpl_opts.get("useMasterBackground", True):
            xml = re.sub(r"<p:bg>.*?</p:bg>", "", xml, count=1, flags=re.S)
        if sp.get("title"):
            ph = next((p for p in lay["placeholders"] if p["type"] in ("title", "ctrTitle")), None)
            xml = to_placeholder(xml, sp["title"], ph)
        if sp.get("subtitle"):
            ph = next((p for p in lay["placeholders"] if p["type"] in ("subTitle",)), None) or next((p for p in lay["placeholders"] if p["type"] in ("body", "obj") and p["idx"] != "0"), None)
            xml = to_placeholder(xml, sp["subtitle"], ph)
        if sp.get("body"):
            ph = next((p for p in lay["placeholders"] if p["type"] in ("body", "obj") and p["idx"] != "0"), None)
            xml = to_placeholder(xml, sp["body"], ph)
        files[dst] = xml.encode("utf-8")
        ct.overrides[dst] = "application/vnd.openxmlformats-officedocument.presentationml.slide+xml"
        new_rels = []
        for rr in parse_rels(gen.read(rels_path(src)) if rels_path(src) in gnames else None):
            if rr.get("TargetMode") == "External":
                new_rels.append(rr)
            elif rr["Type"] == T_LAYOUT:
                new_rels.append({**rr, "Target": relative(dst, lay["part"])})
            elif rr["Type"] == T_NOTES:
                nsrc = resolve(src, rr["Target"])
                ndst = copy_part(nsrc, {T_NOTES_MASTER: tpl_nm, T_SLIDE: dst})
                new_rels.append({**rr, "Target": relative(dst, ndst)})
            else:
                child = resolve(src, rr["Target"])
                if child in gnames:
                    new_rels.append({**rr, "Target": relative(dst, copy_part(child))})
        files[rels_path(dst)] = rels_xml(new_rels)
        rid = next_rid(prels)
        prels.append({"Id": rid, "Type": T_SLIDE, "Target": relative("ppt/presentation.xml", dst)})
        sld_entries.append(f'<p:sldId id="{next_id}" r:id="{rid}"/>')
        next_id += 1

    lst = "<p:sldIdLst>" + "".join(sld_entries) + "</p:sldIdLst>"
    anchor = "</p:handoutMasterIdLst>" if "</p:handoutMasterIdLst>" in pres_xml else "</p:notesMasterIdLst>" if "</p:notesMasterIdLst>" in pres_xml else "</p:sldMasterIdLst>"
    pres_xml = pres_xml.replace(anchor, anchor + lst, 1)
    files["ppt/presentation.xml"] = pres_xml.encode("utf-8")
    files["ppt/_rels/presentation.xml.rels"] = rels_xml(prels)
    # timing của bài có lời đọc nằm trong presProps của bản dựng (useTimings) — giữ presProps của mẫu nhưng bật chạy theo thời gian
    files["[Content_Types].xml"] = ct.xml()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as zo:
        zo.writestr("[Content_Types].xml", files.pop("[Content_Types].xml"))
        for n, b in files.items():
            zo.writestr(n, b)


def next_rid(rels: list[dict]) -> str:
    nums = [int(m.group(1)) for r in rels if (m := re.match(r"rId(\d+)$", r["Id"]))]
    return f"rId{max(nums, default=0) + 1}"


# ---------------------------------------------------------------------------

def main(argv: list[str]) -> int:
    if len(argv) < 2:
        out({"ok": False, "error": __doc__})
        return 2
    cmd = argv[1]
    try:
        if cmd == "build":
            return cmd_build(argv[2])
        if cmd == "omml":
            return cmd_omml()
        if cmd == "analyze":
            return cmd_analyze(argv[2])
        if cmd == "import":
            from import_pptx import cmd_import  # noqa: PLC0415

            return cmd_import(argv[2], argv[3:] if len(argv) > 3 else [])
    except Exception as exc:  # noqa: BLE001
        out({"ok": False, "error": f"{type(exc).__name__}: {exc}"})
        return 1
    out({"ok": False, "error": f"Lệnh lạ: {cmd}"})
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
