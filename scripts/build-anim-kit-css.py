#!/usr/bin/env python3
"""Cập nhật khối :root của services/anim-kit/kit.css từ services/video-theme/tokens.json (giữ nguyên phần lớp còn lại)."""
import json, pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
t = json.loads((root / "services/video-theme/tokens.json").read_text())
th, p = t["themes"]["giay"], t["palette"]
def rgba(h, a):
    n = int(h[1:], 16); return f"rgba({n>>16&255},{n>>8&255},{n&255},{a})"
v = {"bg": th["bg"], "surface": th["surface"], "sunken": th["sunken"], "fill": th["fill"], "line": th["line"], "grid": th["grid"], "ink": th["ink"], "ink2": th["ink2"], "ink3": th["ink3"], "accent": th["accent"], "accent-soft": th["accentSoft"], "accent-ink": th["accentInk"], "ok": th["ok"], "bad": th["bad"]}
s = ":root{\n" + "".join(f"  --{k}:{x};\n" for k, x in v.items())
s += "".join(f"  --c-{k}:{x};\n" for k, x in p.items() if not k.startswith("$"))
s += f"  --mark:{rgba(th['mark'], th['markAlpha'])};\n  --ui:\"Inter\",sans-serif;\n  --read:\"Source Serif 4\",serif;\n  --shadow:{th['shadow']};\n}}"
css = root / "services/anim-kit/kit.css"
css.write_text(re.sub(r":root\{.*?\n\}", lambda _: s, css.read_text(), count=1, flags=re.S))
print("kit.css :root cập nhật")
