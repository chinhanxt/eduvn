import type { GameBody } from "../domain/games";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** JSON an toàn khi nhúng trong <script type="application/json">: không thể thoát khỏi thẻ script. */
const safeJson = (v: unknown) =>
  JSON.stringify(v).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

const CSS = `
:root{--navy:#1e2340;--blue:#4f6bed;--bg:#f3f5fb;--ink:#232842;--muted:#6b7190;--line:#e3e6f0;--ok:#15803d;--okbg:#e8f7ee;--bad:#b91c1c;--badbg:#fdecec}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;min-height:100%;background:var(--bg);color:var(--ink);font-family:"Be Vietnam Pro",system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;font-size:17px;line-height:1.45}
header{background:var(--navy);color:#fff;padding:14px 18px;display:flex;align-items:center;gap:10px;position:sticky;top:0;z-index:2}
header .mark{width:30px;height:30px;border-radius:9px;background:var(--blue);display:grid;place-items:center;font-weight:700;font-size:15px;flex:none}
header h1{font-size:16px;margin:0;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
main{max-width:560px;margin:0 auto;padding:16px 16px 40px}
.stats{display:flex;justify-content:space-between;align-items:center;color:var(--muted);font-size:14px;margin-bottom:8px;gap:8px}
.chip{background:#fff;border:1px solid var(--line);border-radius:999px;padding:4px 12px;font-weight:600;color:var(--ink)}
.bar{height:8px;background:#e1e5f4;border-radius:99px;overflow:hidden;margin-bottom:14px}
.bar>i{display:block;height:100%;background:var(--blue);border-radius:99px;transition:width .25s}
.bar.time>i{background:#f59e0b;transition:width .25s linear}
.card{background:#fff;border-radius:20px;box-shadow:0 6px 24px rgba(30,35,64,.10);padding:20px;margin-bottom:14px}
.q{font-size:19px;font-weight:600;white-space:pre-wrap;overflow-wrap:anywhere}
.opts{display:grid;gap:10px;margin-bottom:14px}
.opt{display:flex;align-items:center;gap:12px;width:100%;min-height:58px;text-align:left;background:#fff;border:2px solid var(--line);border-radius:16px;padding:10px 14px;font:inherit;color:var(--ink);box-shadow:0 2px 8px rgba(30,35,64,.06);cursor:pointer;overflow-wrap:anywhere}
.opt:active{transform:scale(.99)}
.opt .l{flex:none;width:34px;height:34px;border-radius:50%;background:var(--bg);color:var(--blue);display:grid;place-items:center;font-weight:700}
.opt.ok{border-color:var(--ok);background:var(--okbg)}.opt.ok .l{background:var(--ok);color:#fff}
.opt.bad{border-color:var(--bad);background:var(--badbg)}.opt.bad .l{background:var(--bad);color:#fff}
.opt[disabled]{cursor:default}
.btn{display:block;width:100%;min-height:56px;border:0;border-radius:16px;background:var(--blue);color:#fff;font:inherit;font-weight:700;font-size:18px;box-shadow:0 6px 16px rgba(79,107,237,.35);cursor:pointer;margin-bottom:10px}
.btn.alt{background:#fff;color:var(--blue);border:2px solid var(--blue);box-shadow:none}
.btn.good{background:var(--ok);box-shadow:0 6px 16px rgba(21,128,61,.3)}
.btn.warn{background:#fff;color:var(--bad);border:2px solid var(--bad);box-shadow:none}
.row{display:flex;gap:10px}.row .btn{flex:1}
input.txt{width:100%;min-height:56px;border:2px solid var(--line);border-radius:16px;padding:10px 14px;font:inherit;font-size:18px;margin-bottom:12px}
input.txt:focus{outline:none;border-color:var(--blue)}
.fb{border-radius:16px;padding:14px 16px;margin-bottom:14px;overflow-wrap:anywhere;white-space:pre-wrap}
.fb.ok{background:var(--okbg);color:var(--ok)}.fb.bad{background:var(--badbg);color:var(--bad)}
.fb b{display:block;font-size:18px}
.fb .ex{color:var(--ink);margin-top:6px;font-size:16px}
.final{text-align:center}
.final .big{font-size:56px;font-weight:800;color:var(--blue);line-height:1.1}
.final .sub{color:var(--muted);margin:6px 0 16px}
.final .msg{font-size:20px;font-weight:700;margin-bottom:6px}
.flip{perspective:1000px;margin-bottom:14px;cursor:pointer}
.flip .in{display:grid;transition:transform .45s;transform-style:preserve-3d;min-height:260px}
.flip.on .in{transform:rotateY(180deg)}
.face{grid-area:1/1;backface-visibility:hidden;-webkit-backface-visibility:hidden;background:#fff;border-radius:22px;box-shadow:0 8px 28px rgba(30,35,64,.14);padding:24px 20px;display:flex;flex-direction:column;justify-content:center;gap:10px;min-height:260px;overflow-wrap:anywhere;white-space:pre-wrap}
.face.back{transform:rotateY(180deg);background:var(--navy);color:#fff}
.face small{color:var(--muted);font-size:13px;letter-spacing:.04em;text-transform:uppercase}
.face.back small{color:#aeb4d6}
.face .a{font-size:22px;font-weight:700}
.face .o{font-size:16px;color:var(--muted)}
.face .ex{font-size:15px;color:#d5d9f0}
.hint{text-align:center;color:var(--muted);font-size:14px;margin:-4px 0 12px}
`;

const JS = `
(function(){
var D=JSON.parse(document.getElementById('data').textContent);
var app=document.getElementById('app');
function h(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e;}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
function norm(s){return String(s).normalize('NFC').toLowerCase().replace(/\\s+/g,' ').trim().replace(/,/g,'.');}
function clear(){while(app.firstChild)app.removeChild(app.firstChild);}
function letter(i){return String.fromCharCode(65+i);}
function correctText(it){return it.kind==='choice'?(it.options.length>2?letter(it.answer)+'. ':'')+it.options[it.answer]:String(it.answer);}
function bar(p,cls){var b=h('div','bar'+(cls?' '+cls:''));var i=h('i');i.style.width=Math.round(p*100)+'%';b.appendChild(i);return b;}
function btn(txt,cls,fn){var b=h('button','btn'+(cls?' '+cls:''),txt);b.type='button';b.onclick=fn;return b;}

function quiz(){
 var order=shuffle(D.items),i=0,score=0,right=0,locked=false,tick=null;
 function stop(){if(tick){clearInterval(tick);tick=null;}}
 function show(){
  stop();locked=false;clear();var it=order[i];
  var st=h('div','stats');st.appendChild(h('span','chip','Câu '+(i+1)+'/'+order.length));
  var sc=h('span','chip','Điểm: '+score);st.appendChild(sc);app.appendChild(st);
  app.appendChild(bar(i/order.length));
  var tb=null,left=D.timerSeconds,tl=null;
  if(D.timerSeconds>0){tb=bar(1,'time');tl=h('span','chip',left+' giây');st.insertBefore(tl,sc);app.appendChild(tb);}
  var card=h('div','card');card.appendChild(h('div','q',it.q));app.appendChild(card);
  var holder=h('div');app.appendChild(holder);
  var fb=h('div');app.appendChild(fb);
  function finish(given){
   if(locked)return;locked=true;stop();
   var ok=false;
   if(it.kind==='choice')ok=given===it.answer;else ok=given!==null&&norm(given)===norm(it.answer);
   var bonus=0;if(ok){right++;if(D.timerSeconds>0)bonus=Math.round(50*left/D.timerSeconds);score+=100+bonus;sc.textContent='Điểm: '+score;}
   if(it.kind==='choice'){var bs=holder.querySelectorAll('button');for(var k=0;k<bs.length;k++){bs[k].disabled=true;if(k===it.answer)bs[k].classList.add('ok');else if(k===given)bs[k].classList.add('bad');}}
   else{var inp=holder.querySelector('input');if(inp)inp.disabled=true;var sb=holder.querySelector('button');if(sb)sb.style.display='none';}
   var box=h('div','fb '+(ok?'ok':'bad'));
   box.appendChild(h('b',null,given===null?'Hết giờ! Đáp án: '+correctText(it):ok?'Chính xác!'+(bonus?' +'+bonus+' điểm nhanh':''):'Chưa đúng. Đáp án: '+correctText(it)));
   if(it.explain)box.appendChild(h('div','ex',it.explain));
   fb.appendChild(box);
   var last=i+1>=order.length;
   var nb=btn(last?'Xem kết quả':'Câu tiếp','',function(){i++;if(i>=order.length)end();else show();});
   fb.appendChild(nb);nb.scrollIntoView({block:'nearest',behavior:'smooth'});
  }
  if(it.kind==='choice'){
   var wrap=h('div','opts');
   it.options.forEach(function(o,k){var b=h('button','opt');b.type='button';b.appendChild(h('span','l',it.options.length>2?letter(k):(k===0?'Đ':'S')));b.appendChild(h('span',null,o));b.onclick=function(){finish(k);};wrap.appendChild(b);});
   holder.appendChild(wrap);
  }else{
   var inp=h('input','txt');inp.type='text';inp.placeholder='Nhập đáp án…';inp.autocomplete='off';inp.setAttribute('autocapitalize','off');
   inp.onkeydown=function(e){if(e.key==='Enter')finish(inp.value);};
   holder.appendChild(inp);holder.appendChild(btn('Trả lời','',function(){finish(inp.value);}));
  }
  if(tb){var t0=Date.now();tick=setInterval(function(){var el=(Date.now()-t0)/1000;left=Math.max(0,Math.ceil(D.timerSeconds-el));tl.textContent=left+' giây';tb.firstChild.style.width=Math.max(0,100*(1-el/D.timerSeconds))+'%';if(el>=D.timerSeconds){tb.firstChild.style.width='0%';tl.textContent='0 giây';finish(null);}},200);}
 }
 function end(){
  stop();clear();var pct=right/order.length;
  var c=h('div','card final');
  c.appendChild(h('div','msg',pct>=0.9?'Xuất sắc!':pct>=0.7?'Làm tốt lắm!':pct>=0.5?'Khá ổn, cố thêm nhé!':'Cần ôn lại thêm nhé!'));
  c.appendChild(h('div','big',String(score)));c.appendChild(h('div','sub','điểm'));
  c.appendChild(h('div','q','Đúng '+right+'/'+order.length+' câu'));
  app.appendChild(c);
  app.appendChild(btn('Chơi lại','',function(){order=shuffle(D.items);i=0;score=0;right=0;show();}));
 }
 show();
}

function cards(){
 var order=shuffle(D.items),i=0,known=0,missed=[],flipped=false;
 function show(){
  clear();var it=order[i];flipped=false;
  var st=h('div','stats');st.appendChild(h('span','chip','Thẻ '+(i+1)+'/'+order.length));st.appendChild(h('span','chip','Đã nhớ: '+known));app.appendChild(st);
  app.appendChild(bar(i/order.length));
  var f=h('div','flip');f.tabIndex=0;f.setAttribute('role','button');f.setAttribute('aria-label','Lật thẻ');
  var inn=h('div','in');
  var fr=h('div','face');fr.appendChild(h('small',null,'Câu hỏi'));fr.appendChild(h('div','a',it.q));
  if(it.kind==='choice'&&it.options.length>2)it.options.forEach(function(o,k){fr.appendChild(h('div','o',letter(k)+'. '+o));});
  var bk=h('div','face back');bk.appendChild(h('small',null,'Đáp án'));bk.appendChild(h('div','a',correctText(it)));if(it.explain)bk.appendChild(h('div','ex',it.explain));
  inn.appendChild(fr);inn.appendChild(bk);f.appendChild(inn);
  function flip(){flipped=!flipped;f.classList.toggle('on',flipped);}
  f.onclick=flip;f.onkeydown=function(e){if(e.key===' '||e.key==='Enter'){e.preventDefault();flip();}};
  app.appendChild(f);app.appendChild(h('div','hint','Chạm vào thẻ để lật'));
  var r=h('div','row');
  r.appendChild(btn('Chưa nhớ','warn',function(){missed.push(it);next();}));
  r.appendChild(btn('Đã nhớ','good',function(){known++;next();}));
  app.appendChild(r);
 }
 function next(){i++;if(i>=order.length)end();else show();}
 function end(){
  clear();var c=h('div','card final');
  c.appendChild(h('div','msg',missed.length===0?'Bạn nhớ hết rồi!':'Hoàn thành bộ thẻ!'));
  c.appendChild(h('div','big',known+'/'+order.length));c.appendChild(h('div','sub','thẻ đã nhớ'));app.appendChild(c);
  if(missed.length>0)app.appendChild(btn('Ôn '+missed.length+' thẻ chưa nhớ','alt',function(){order=shuffle(missed);missed=[];i=0;known=0;show();}));
  app.appendChild(btn('Chơi lại','',function(){order=shuffle(D.items);missed=[];i=0;known=0;show();}));
 }
 show();
}
if(D.kind==='flashcards')cards();else quiz();
})();
`;

/** Một file .html tự chứa: CSS/JS nhúng sẵn, không gọi mạng; nội dung câu hỏi chỉ đi vào DOM qua textContent. */
export function renderGameHtml(title: string, body: GameBody): string {
  const kindLabel = body.kind === "quiz" ? "Đố vui" : "Thẻ lật";
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${esc(title)}</title><style>${CSS}</style></head>
<body><header><span class="mark">E</span><h1>${esc(title)} · ${kindLabel}</h1></header><main id="app"></main>
<script id="data" type="application/json">${safeJson(body)}</script>
<script>${JS}</script></body></html>`;
}
