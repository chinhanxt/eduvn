// Cảnh tương tác (HTML do AI viết) chạy trong iframe sandbox="allow-scripts" (gốc mờ): truy cập localStorage/
// sessionStorage/document.cookie ném SecurityError và làm hỏng cả mô phỏng. Chèn một đoạn shim bộ nhớ tạm
// TRƯỚC mọi mã của AI. File thuần, dùng chung cho trình phát web và trình dựng video.

/** Đoạn script shim: bộ nhớ trong RAM cho localStorage/sessionStorage, cookie rỗng ghi được. */
export const STORAGE_SHIM = `<script data-eduvn-shim>(function(){function mk(){var m=new Map();return{getItem:function(k){k=String(k);return m.has(k)?m.get(k):null},setItem:function(k,v){m.set(String(k),String(v))},removeItem:function(k){m.delete(String(k))},clear:function(){m.clear()},key:function(i){return Array.from(m.keys())[i]||null},get length(){return m.size}}}["localStorage","sessionStorage"].forEach(function(n){var ok=false;try{ok=!!window[n]&&(window[n].getItem("__t"),true)}catch(e){ok=false}if(!ok){try{Object.defineProperty(window,n,{value:mk(),configurable:true})}catch(e){}}});try{void document.cookie}catch(e){var c={};try{Object.defineProperty(document,"cookie",{configurable:true,get:function(){return Object.keys(c).map(function(k){return k+"="+c[k]}).join("; ")},set:function(v){var p=String(v).split(";")[0].split("=");if(p[0])c[p[0].trim()]=(p[1]||"").trim()}})}catch(e2){}}})();</script>`;

/** HTML cảnh tương tác → tài liệu chạy được trong sandbox: shim đứng đầu <head> (hoặc đầu tài liệu nếu không có head). */
export function interactiveDoc(html: string): string {
  if (html.includes("data-eduvn-shim")) return html;
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (h) => `${h}${STORAGE_SHIM}`);
  if (/<html[^>]*>/i.test(html)) return html.replace(/<html[^>]*>/i, (h) => `${h}<head>${STORAGE_SHIM}</head>`);
  return `${STORAGE_SHIM}${html}`;
}

/** Hướng dẫn thêm cho AI viết cảnh tương tác: vừa khung 16:9, chữ đủ lớn, không dùng bộ nhớ trình duyệt. */
export const INTERACTIVE_LAYOUT_RULES =
  "Cảnh tương tác hiển thị trong khung 16:9 cố định (khoảng 1100×619 px, cũng được chụp vào video): toàn bộ giao diện phải nằm gọn trong khung, KHÔNG cần cuộn (dùng flex/grid và đơn vị vw/vh/%, không đặt chiều cao cố định lớn hơn khung); cỡ chữ tối thiểu 16px cho chữ thường và 14px cho nhãn biểu đồ; nhãn không chồng lên nhau (giãn cách, rút gọn nhãn); ít nút điều khiển, cột điều khiển không tràn đáy. Không dùng localStorage, sessionStorage, cookie hay indexedDB (khung chạy trong sandbox). Công thức viết trong \\( … \\) hoặc $…$ để KaTeX dựng.";
