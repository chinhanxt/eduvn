// Bài giảng AI → MỘT tệp HTML chạy không cần mạng (OM-808): slide + lời giảng (âm thanh base64, giải mã lười) + phụ đề
// + spotlight/laser + quiz chấm tại chỗ + cảnh tương tác (srcdoc, thư viện nhúng data:) + danh sách cảnh, ←/→/Space, #scene-N.
// Ý tưởng từ OpenMAIC lib/export/standalone-html + lib/standalone-player (MIT), viết lại gọn; dựng slide bằng slideHtml.ts (chỉ import).
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import katex from "katex";
import { vendorFile } from "../services/aiLessons/vendor";
import { type StoredScene, estimateMs } from "../services/aiLessons/types";
import { BASE_CSS, type Canvas, esc, mathInline, slideBody } from "./slideHtml";

export type OfflineOpts = {
  /** "kem-loi-giang": nhúng âm thanh + clip hoạt hình; "khong-loi-giang": phụ đề chạy theo thời gian đọc. */
  mode: "kem-loi-giang" | "khong-loi-giang";
  audioDir?: string;
  animDir?: string;
  onlineUrl?: string;
  /** Trần dung lượng (byte); vượt thì ném lỗi khuyên dùng gói .zip. */
  maxBytes?: number;
  /** "files": âm thanh/clip là tệp đi kèm (audio/…, anim/…) thay vì base64 — dùng trong gói .zip. */
  media?: "embed" | "files";
};

export const latexHtml = (tex: string): string => {
  try {
    return katex.renderToString(tex, { throwOnError: false, output: "html" });
  } catch {
    return esc(tex);
  }
};

const MIME: Record<string, string> = { ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf", ".json": "application/json" };

/** CSS có url(fonts/…) → chỉ giữ woff2 dạng data: (KaTeX). */
async function inlineCssFonts(css: string, baseDir: string): Promise<string> {
  const urls = new Set<string>();
  for (const m of css.matchAll(/url\((["']?)([^)"']+\.woff2)\1\)/g)) urls.add(m[2]!);
  const data = new Map<string, string>();
  for (const u of urls) {
    const buf = await readFile(path.join(baseDir, u)).catch(() => null);
    if (buf) data.set(u, `data:font/woff2;base64,${buf.toString("base64")}`);
  }
  return css.replace(/src:([^;}]+)/g, (whole, list: string) => {
    const w = /url\((["']?)([^)"']+\.woff2)\1\)\s*format\(["']?woff2["']?\)/.exec(list);
    const d = w ? data.get(w[2]!) : undefined;
    return d ? `src:url(${d}) format("woff2")` : whole;
  });
}

const cssCache = new Map<string, string>();
export async function katexCss(): Promise<string> {
  const hit = cssCache.get("katex");
  if (hit) return hit;
  const v = vendorFile("/vendor/interactive/katex@0.16.38/dist/katex.min.css");
  if (!v) return "";
  const css = await inlineCssFonts(await readFile(v.file, "utf8"), path.dirname(v.file));
  cssCache.set("katex", css);
  return css;
}

/** Tài nguyên /vendor/interactive/… trong HTML cảnh tương tác → data: URL (chạy không mạng, iframe sandbox không origin). */
export async function inlineInteractive(html: string): Promise<string> {
  const re = /(?:https?:\/\/[^"'\s)]+)?\/vendor\/interactive\/[^"'\s)<>]+/g;
  const found = new Set(html.match(re) ?? []);
  let out = html;
  for (const url of found) {
    const p = url.replace(/^https?:\/\/[^/]+/, "").split(/[?#]/)[0]!;
    const v = vendorFile(p);
    if (!v) continue;
    const ext = path.extname(v.file);
    let body: Buffer | string = await readFile(v.file).catch(() => Buffer.alloc(0));
    if (!body.length) continue;
    if (ext === ".css") body = await inlineCssFonts(body.toString("utf8"), path.dirname(v.file));
    const b64 = Buffer.isBuffer(body) ? body.toString("base64") : Buffer.from(body, "utf8").toString("base64");
    out = out.split(url).join(`data:${MIME[ext] ?? "application/octet-stream"};base64,${b64}`);
  }
  return out;
}

const unesc = (t: string) => t.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
/** Công thức $…$ nằm trong chữ của slide (AI hay viết vậy) → KaTeX dựng sẵn; chỉ thay trong phần chữ, không đụng thuộc tính thẻ. */
export function mathInText(html: string): string {
  return html.replace(/>([^<]*)</g, (whole, text: string) => (text.includes("$") ? `>${text.replace(/\$([^$]{1,300})\$/g, (_m, t: string) => latexHtml(unesc(t)))}<` : whole));
}

type Seg = { kind: "speech"; text: string; ms: number; audio?: number } | { kind: "focus"; el: string; effect: "spotlight" | "laser" };
type PScene = { type: string; title: string; html?: string; boxes?: Record<string, [number, number, number, number]>; questions?: unknown[]; srcdoc?: string; clip?: number; segs: Seg[] };

/** Đọc tệp media → base64 (hoặc "" khi chỉ cần biết tệp có thật — chế độ "files"); không có → null. */
async function fileB64(file: string | undefined, dir: string | undefined, existsOnly = false): Promise<string | null> {
  if (!file || !dir) return null;
  const p = path.join(dir, path.basename(file));
  const st = await stat(p).catch(() => null);
  if (!st || st.size < 100) return null;
  return existsOnly ? "" : (await readFile(p)).toString("base64");
}

/** Dựng tệp HTML. */
export async function renderOfflineHtml(meta: { title: string; subject?: string; grade?: number | null }, scenes: StoredScene[], o: OfflineOpts): Promise<string> {
  const media: { mime: string; b64: string; href?: string }[] = [];
  let bytes = 0;
  const files = o.media === "files";
  const addMedia = (mime: string, b64: string, href?: string) => {
    media.push(files && href ? { mime, b64: "", href } : { mime, b64 });
    bytes += files ? 0 : b64.length;
    if (o.maxBytes && bytes > o.maxBytes) throw new Error(`Bài quá lớn cho một tệp HTML (> ${Math.round(o.maxBytes / 1e6)} MB) — hãy dùng "Gói bài giảng .zip"`);
    return media.length - 1;
  };
  const out: PScene[] = [];
  for (const sc of scenes) {
    const segs: Seg[] = [];
    for (const a of sc.actions ?? []) {
      if (a.type === "speech") {
        const b64 = o.mode === "kem-loi-giang" ? await fileB64(a.audioFile, o.audioDir, files) : null;
        segs.push({ kind: "speech", text: a.text, ms: a.durationMs ?? estimateMs(a.text), ...(b64 !== null ? { audio: addMedia("audio/mpeg", b64, `audio/${path.basename(a.audioFile ?? "")}`) } : {}) });
      } else if ((a.type === "spotlight" || a.type === "laser") && typeof (a as { elementId?: unknown }).elementId === "string") {
        segs.push({ kind: "focus", el: (a as { elementId: string }).elementId, effect: a.type });
      }
    }
    if (sc.type === "slide") {
      const canvas = (sc.content as unknown as { canvas: Canvas }).canvas;
      const boxes: PScene["boxes"] = {};
      for (const e of canvas.elements) boxes[e.id] = [e.left, e.top, e.width, e.type === "line" ? 8 : e.height];
      let clip: number | undefined;
      if (o.mode === "kem-loi-giang" && sc.animation?.status === "xong" && sc.animation.hash) {
        const b64 = await fileB64(`${sc.animation.hash}.mp4`, o.animDir, files);
        if (b64 !== null) clip = addMedia("video/mp4", b64, `anim/${sc.animation.hash}.mp4`);
      }
      out.push({ type: "slide", title: sc.title, html: mathInText(slideBody(canvas, { latex: latexHtml })), boxes, segs, ...(clip !== undefined ? { clip } : {}) });
    } else if (sc.type === "quiz") {
      const qs = ((sc.content as { questions?: { type: string; question: string; options?: { value: string; label: string }[]; answer?: string[]; analysis?: string }[] }).questions ?? []).map((q) => ({
        type: q.type,
        q: mathInline(q.question, latexHtml),
        options: (q.options ?? []).map((x) => ({ v: x.value, h: mathInline(x.label, latexHtml) })),
        answer: q.answer ?? [],
        analysis: q.analysis ? mathInline(q.analysis, latexHtml) : "",
      }));
      out.push({ type: "quiz", title: sc.title, questions: qs, segs });
    } else {
      const html = String((sc.content as { html?: string }).html ?? "");
      out.push({ type: "interactive", title: sc.title, srcdoc: await inlineInteractive(html), segs });
    }
  }
  const data = { title: meta.title, sub: [meta.subject, meta.grade ? `Lớp ${meta.grade}` : ""].filter(Boolean).join(" · "), online: o.onlineUrl ?? "", mode: o.mode, scenes: out };
  const mediaTags = media.map((m, i) => `<script type="text/plain" id="m${i}" data-mime="${m.mime}"${m.href ? ` data-href="${esc(m.href)}"` : ""}>${m.b64}</script>`).join("\n");
  // </script> trong JSON phải được tách
  const json = JSON.stringify(data).replace(/<\//g, "<\\/").replace(/<!--/g, "<\\!--");
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(meta.title)} — bài giảng ngoại tuyến EDUVN</title>
<style>${await katexCss()}</style>
<style>${BASE_CSS}${PLAYER_CSS}</style>
</head><body>
<div class="app" id="app">
  <header class="top"><button class="ic" id="menu" aria-label="Danh sách cảnh" title="Danh sách cảnh">☰</button><div class="ttl"><b id="t"></b><small id="st"></small></div><span class="sp"></span><span class="cnt" id="cnt"></span><button class="ic" id="fs" title="Toàn màn hình" aria-label="Toàn màn hình">⛶</button></header>
  <nav class="list" id="list" hidden></nav>
  <main class="stagewrap"><div class="frame" id="frame"></div></main>
  <footer class="ctl"><button class="ic" id="prev" aria-label="Cảnh trước">◀</button><button class="play" id="play">▶ Phát</button><button class="ic" id="next" aria-label="Cảnh sau">▶</button><label class="chk"><input type="checkbox" id="subs" checked> Phụ đề</label><span class="sp"></span><small class="note">Bản ngoại tuyến · EDUVN</small></footer>
</div>
<script type="application/json" id="data">${json}</script>
${mediaTags}
<script>${PLAYER_JS}</script>
</body></html>`;
}

const PLAYER_CSS = `
:root{--paper:#fdfcf9;--card:#f5f2ea;--line:#e6decc;--ink:#1f2428;--muted:#6d645a;--blue:#2f5d8a;--good:#2e7d4f;--bad:#b23a48}
html,body{background:var(--paper);color:var(--ink);font-family:Inter,'Segoe UI',Roboto,'Noto Sans',Arial,sans-serif}
.app{display:grid;grid-template-rows:auto 1fr auto;height:100vh;height:100dvh}
.top,.ctl{display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--line);background:var(--paper)}
.ctl{border-top:1px solid var(--line);border-bottom:0}
.ttl{display:flex;flex-direction:column;min-width:0}.ttl b{font-family:'Source Serif 4',Cambria,Georgia,serif;font-size:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ttl small,.note,.cnt{color:var(--muted);font-size:12px}
.cnt{font-family:ui-monospace,Consolas,monospace}.sp{flex:1}
button{font:inherit;cursor:pointer;border-radius:8px;border:1px solid var(--line);background:#fff;color:var(--ink);padding:6px 12px;transition:background .15s,transform .1s}
button:hover{background:var(--card)}button:active{transform:scale(.97)}button:focus-visible{outline:2px solid var(--blue);outline-offset:2px}
.ic{min-width:38px}.play{background:var(--blue);color:#fff;border-color:var(--blue);min-width:96px}.play:hover{background:#264d73}
.chk{display:flex;gap:6px;align-items:center;font-size:14px;color:var(--muted)}
.list{position:fixed;top:58px;left:0;bottom:58px;width:min(320px,86vw);overflow:auto;background:#fff;border-right:1px solid var(--line);z-index:30;padding:8px;box-shadow:0 8px 30px rgba(0,0,0,.08)}
.list a{display:block;padding:9px 10px;border-radius:8px;color:var(--ink);text-decoration:none;font-size:14px}.list a:hover{background:var(--card)}.list a.on{background:#e8eef5;color:var(--blue);font-weight:600}
.list a small{color:var(--muted);margin-right:6px;font-family:ui-monospace,Consolas,monospace}
.stagewrap{display:flex;align-items:center;justify-content:center;padding:16px;min-height:0;overflow:auto}
.frame{width:min(100%,calc((100dvh - 150px)*16/9));position:relative;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.06),0 10px 30px rgba(0,0,0,.06);background:#fff}
.frame .stage{animation:in .35s ease}.frame video{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#fff;z-index:5}
@keyframes in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.frame .stage{animation:none}*{transition:none!important}}
.sub{bottom:2.2cqw}
.qz{padding:3.2cqw 4cqw;font-size:2.1cqw;line-height:1.4;color:var(--ink);background:var(--paper);height:100%;overflow:auto}
.qz h2{font-family:'Source Serif 4',Cambria,Georgia,serif;font-size:3.2cqw;margin:0 0 1.6cqw}
.qz .q{margin:0 0 2cqw;padding:1.6cqw;border:1px solid var(--line);border-radius:1cqw;background:#fff}
.qz .o{display:flex;gap:1cqw;align-items:center;margin:.8cqw 0;padding:.8cqw 1.2cqw;border:1px solid var(--line);border-radius:.8cqw;cursor:pointer}
.qz .o.sel{border-color:var(--blue);background:#eef3f9}.qz .o.ok{border-color:var(--good);background:#eaf4ee}.qz .o.no{border-color:var(--bad);background:#fbecee}
.qz .ex{margin-top:.8cqw;color:var(--muted);font-size:1.8cqw}.qz textarea{width:100%;font:inherit;font-size:1.8cqw;border:1px solid var(--line);border-radius:.8cqw;padding:.8cqw}
.qz .res{font-weight:700;margin-top:1cqw}
.ia{position:absolute;inset:0;display:flex;flex-direction:column;background:#fff}.ia iframe{flex:1;border:0;width:100%}.ia .hint{font-size:12px;color:var(--muted);padding:4px 10px;border-top:1px solid var(--line)}
@media (max-width:640px){.note{display:none}.ttl b{font-size:15px}}
`;

// Trình phát: thuần JS, không phụ thuộc. Âm thanh base64 giải mã lười thành Blob URL khi cần.
const PLAYER_JS = String.raw`(function(){
var D=JSON.parse(document.getElementById('data').textContent);var S=D.scenes;var i=0,playing=false,timer=null,audio=null,run=0;
var $=function(id){return document.getElementById(id)};var frame=$('frame');
var cache={};function media(n){if(cache[n])return cache[n];var el=$('m'+n);if(el.dataset.href)return el.dataset.href;var b=atob(el.textContent.trim());var u=new Uint8Array(b.length);for(var k=0;k<b.length;k++)u[k]=b.charCodeAt(k);cache[n]=URL.createObjectURL(new Blob([u],{type:el.dataset.mime}));return cache[n]}
function cq(px){return (px/10)+'cqw'}
$('t').textContent=D.title;$('st').textContent=D.sub||'';document.title=D.title;
var list=$('list');S.forEach(function(s,k){var a=document.createElement('a');a.href='#scene-'+(k+1);a.innerHTML='<small>'+String(k+1).padStart(2,'0')+'</small>';a.appendChild(document.createTextNode(s.title));a.onclick=function(e){e.preventDefault();list.hidden=true;go(k)};list.appendChild(a)});
$('menu').onclick=function(){list.hidden=!list.hidden};
function stop(){run++;playing=false;$('play').textContent='▶ Phát';if(timer){clearTimeout(timer);timer=null}if(audio){audio.pause();audio=null}var v=frame.querySelector('video');if(v)v.pause()}
function stageEl(){return frame.querySelector('.stage')}
function setSub(t){var st=stageEl()||frame;var el=frame.querySelector('.sub');if(!t||!$('subs').checked){if(el)el.remove();return}if(!el){el=document.createElement('div');el.className='sub';st.appendChild(el)}el.textContent=t}
function focus(f){var st=stageEl();if(!st)return;var old=st.querySelectorAll('.spot,.laser');old.forEach(function(x){x.remove()});if(!f)return;var b=(S[i].boxes||{})[f.el];if(!b)return;var d=document.createElement('div');if(f.effect==='laser'){d.className='laser';d.style.left=cq(b[0]+b[2]/2);d.style.top=cq(b[1]+b[3]/2)}else{d.className='spot';d.style.left=cq(b[0]-6);d.style.top=cq(b[1]-6);d.style.width=cq(b[2]+12);d.style.height=cq(b[3]+12)}st.appendChild(d)}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function quiz(s){var h='<div class="stage" style="background:var(--paper)"><div class="qz"><h2>'+esc(s.title)+'</h2>';s.questions.forEach(function(q,k){h+='<div class="q" data-k="'+k+'"><div><b>Câu '+(k+1)+'.</b> '+q.q+'</div>';if(q.options.length){q.options.forEach(function(o){h+='<div class="o" role="button" tabindex="0" data-v="'+esc(o.v)+'"><b>'+esc(o.v)+'.</b> <span>'+o.h+'</span></div>'})}else{h+='<textarea rows="2" placeholder="Nhập câu trả lời…"></textarea>'}h+='<div class="ex" hidden></div></div>'});h+='<button class="play" id="chk">Chấm bài</button><div class="res" id="res"></div></div></div>';frame.innerHTML=h;
frame.querySelectorAll('.q').forEach(function(qe){var q=s.questions[+qe.dataset.k];qe.querySelectorAll('.o').forEach(function(o){var pick=function(){if(q.type==='multiple'){o.classList.toggle('sel')}else{qe.querySelectorAll('.o').forEach(function(x){x.classList.remove('sel')});o.classList.add('sel')}};o.onclick=pick;o.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();pick()}}})});
$('chk').onclick=function(){var ok=0,tot=0;frame.querySelectorAll('.q').forEach(function(qe){var q=s.questions[+qe.dataset.k];var ex=qe.querySelector('.ex');if(q.options.length){tot++;var sel=[].map.call(qe.querySelectorAll('.o.sel'),function(x){return x.dataset.v}).sort().join(',');var right=q.answer.slice().sort().join(',');if(sel===right)ok++;qe.querySelectorAll('.o').forEach(function(o){o.classList.remove('ok','no');if(q.answer.indexOf(o.dataset.v)>=0)o.classList.add('ok');else if(o.classList.contains('sel'))o.classList.add('no')})}ex.hidden=false;ex.innerHTML=(q.options.length?'':'Đáp án: '+esc(q.answer.join(', '))+'<br>')+(q.analysis||'')});$('res').textContent=tot?('Đúng '+ok+'/'+tot+' câu trắc nghiệm'):'Đã hiện đáp án'}}
function show(k){var s=S[k];focus(null);if(s.type==='slide'){frame.innerHTML=s.html;if(s.clip!==undefined){var v=document.createElement('video');v.src=media(s.clip);v.muted=true;v.playsInline=true;stageEl().appendChild(v)}}else if(s.type==='quiz'){quiz(s)}else{frame.innerHTML='<div class="stage"><div class="ia"><iframe sandbox="allow-scripts" title="'+esc(s.title)+'"></iframe><div class="hint">Cảnh tương tác chạy ngay trong tệp này'+(D.online?' · bản trực tuyến: '+esc(D.online):'')+' · cuộn trong khung nếu còn nội dung bên dưới</div></div></div>';frame.querySelector('iframe').srcdoc=s.srcdoc}
$('cnt').textContent=String(k+1).padStart(2,'0')+' / '+String(S.length).padStart(2,'0');list.querySelectorAll('a').forEach(function(a,j){a.classList.toggle('on',j===k)});if(location.hash!=='#scene-'+(k+1))history.replaceState(null,'','#scene-'+(k+1))}
function go(k){if(k<0||k>=S.length)return;var was=playing;stop();i=k;show(k);if(was)play()}
function play(){if(playing){stop();return}playing=true;$('play').textContent='❚❚ Dừng';var my=++run;var s=S[i];var segs=s.segs||[];var v=frame.querySelector('video');if(v){v.currentTime=0;v.play().catch(function(){})}var n=0;
function step(){if(my!==run)return;if(n>=segs.length){setSub('');focus(null);timer=setTimeout(function(){if(my!==run)return;if(i<S.length-1&&s.type==='slide'){i++;show(i);playing=false;play()}else{stop()}},900);return}var g=segs[n++];if(g.kind==='focus'){focus(g);step();return}setSub(g.text);if(g.audio!==undefined&&D.mode==='kem-loi-giang'){audio=new Audio(media(g.audio));audio.onended=function(){if(my===run)step()};audio.onerror=function(){timer=setTimeout(step,g.ms)};audio.play().catch(function(){timer=setTimeout(step,g.ms)})}else{timer=setTimeout(step,g.ms)}}
step()}
$('play').onclick=play;$('prev').onclick=function(){go(i-1)};$('next').onclick=function(){go(i+1)};
$('subs').onchange=function(){if(!$('subs').checked)setSub('')};
$('fs').onclick=function(){var el=document.documentElement;if(document.fullscreenElement)document.exitFullscreen();else if(el.requestFullscreen)el.requestFullscreen()};
document.addEventListener('keydown',function(e){if(e.target&&(e.target.tagName==='TEXTAREA'||e.target.tagName==='INPUT'))return;if(e.key==='ArrowRight'){go(i+1)}else if(e.key==='ArrowLeft'){go(i-1)}else if(e.key===' '){e.preventDefault();play()}});
var m=/^#scene-(\d+)$/.exec(location.hash);i=m?Math.min(S.length-1,Math.max(0,+m[1]-1)):0;show(i);
window.addEventListener('hashchange',function(){var m=/^#scene-(\d+)$/.exec(location.hash);if(m&&+m[1]-1!==i)go(+m[1]-1)});
})();`;
