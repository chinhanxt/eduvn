import { useState } from "react";
import { aiSkill, downloadPost } from "../api";
import { FormPane, useRun } from "../portal/gv/kit";
import { Button } from "../ui/components/Button";
import { Badge } from "../ui/components/Chip";
import { Field, Input, Textarea } from "../ui/components/Field";
import { Skeleton } from "../ui/components/Skeleton";
import { EmptyState } from "../ui/components/States";
import { usePageMeta } from "../ui/shell/AppShell";

type Syllabus = {
  name: string; code: string; credits: number; level: string;
  hours: { lecture: number; practice: number; selfStudy: number };
  prerequisites: string[]; description: string;
  plos: { code: string; text: string }[];
  clos: { code: string; text: string; bloom: string }[];
  cloPlo: { clo: string; plo: { code: string; level: string }[] }[];
  assessment: { component: string; weight: number; method: string; clos: string[]; criteria: string }[];
  schedule: { week: number; topic: string; clos: string[]; activities: string; selfStudy: string }[];
  materials: { main: string[]; reference: string[] };
  ghiChu: string;
};
// Bản đề cương vừa soạn giữ trong phiên (đổi trang rồi quay lại không mất)
const SS_KEY = "eduvn.gv.de-cuong";

/** /de-cuong — AI thiết kế đề cương học phần (CLO–PLO, đánh giá, kế hoạch tuần): khung thông tin bên trái, giấy bên phải. */
export function DeCuong() {
  usePageMeta("Đề cương học phần");
  const run = useRun();
  const [f, setF] = useState({ name: "", credits: 3, major: "", level: "", weeks: 15, plos: "", note: "" });
  const [s, setS] = useState<Syllabus | null>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(SS_KEY) ?? "null") as Syllabus | null;
    } catch {
      return null;
    }
  });
  const [busy, setBusy] = useState(false);
  const go = () => {
    setBusy(true);
    return run(async () => {
      const r = await aiSkill<Syllabus>("de-cuong", { name: f.name.trim(), credits: f.credits, weeks: f.weeks, major: f.major.trim() || undefined, level: f.level.trim() || undefined, plos: f.plos.trim() || undefined, note: f.note.trim() || undefined });
      setS(r);
      sessionStorage.setItem(SS_KEY, JSON.stringify(r));
      return r;
    }, (r) => ({ title: `Đã soạn đề cương “${r.name}”`, msg: `${r.clos.length} CLO · ${r.schedule.length} tuần — đọc lại rồi tải Word` })).finally(() => setBusy(false));
  };
  const docx = () => run(() => downloadPost("/api/ai-skills/de-cuong/docx", s, "de-cuong-hoc-phan.docx"), "Đã tải đề cương .docx");
  return (
    <>
      <div className="page-head bar">
        <h1>Đề cương học phần</h1>
        <span className="caption hide-sm">Đại học · CLO–PLO · Bloom</span>
        <div className="acts">
          {s && <Button size="sm" variant="primary" icon="down" onClick={docx} data-testid="dc-docx">Tải Word</Button>}
        </div>
      </div>
      <div className="work">
        <aside>
          <FormPane
            title="Thông tin học phần"
            testId="dc-form"
            footer={<Button variant="primary" icon="spark" disabled={!f.name.trim()} busy={busy} onClick={go} data-testid="dc-run">{s ? "Soạn lại" : "Soạn đề cương"}</Button>}
          >
            <Field label="Tên học phần"><Input value={f.name} placeholder="Cấu trúc dữ liệu và giải thuật" onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="dc-name" /></Field>
            <div className="fgrid two">
              <Field label="Tín chỉ"><Input type="number" min={1} max={15} value={f.credits} onChange={(e) => setF({ ...f, credits: Number(e.target.value) || 3 })} /></Field>
              <Field label="Số tuần"><Input type="number" min={4} max={30} value={f.weeks} onChange={(e) => setF({ ...f, weeks: Number(e.target.value) || 15 })} /></Field>
              <Field label="Ngành"><Input value={f.major} onChange={(e) => setF({ ...f, major: e.target.value })} /></Field>
              <Field label="Trình độ"><Input placeholder="Đại học năm 2" value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })} /></Field>
            </div>
            <Field label="PLO của chương trình" hint="Bỏ trống: AI đặt PLO giả định, ghi rõ để thay"><Textarea rows={3} value={f.plos} onChange={(e) => setF({ ...f, plos: e.target.value })} /></Field>
            <Field label="Yêu cầu thêm"><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
          </FormPane>
        </aside>
        <article className="pane" aria-busy={busy || undefined} aria-live="polite" data-testid="dc-view">
          {busy ? (
            <div className="paper">
              <div className="row" style={{ fontFamily: "var(--font-ui)", marginBottom: 12 }}><Badge tone="accent" icon="spark">AI đang thiết kế</Badge><span className="caption">khung → CLO → kế hoạch tuần · 1–3 phút</span></div>
              <div className="stream-bar" style={{ marginBottom: 20 }} />
              {[60, 92, 84, 70, 40, 88, 76, 64, 90, 52].map((w, i) => <Skeleton key={i} w={`${w}%`} h={i % 5 === 4 ? 10 : 14} style={{ margin: i % 5 === 4 ? "26px 0 10px" : "10px 0" }} />)}
            </div>
          ) : s ? (
            <div className="paper">
              <div className="hdr">
                <div><b>{s.code || "Mã HP"}</b>{s.level || "Đại học"}</div>
                <div className="c"><b>ĐỀ CƯƠNG HỌC PHẦN</b>{s.name}</div>
                <div className="rt"><b>{s.credits} tín chỉ</b>LT {s.hours.lecture} · TH {s.hours.practice} · tự học {s.hours.selfStudy}</div>
              </div>
              {s.ghiChu && <p className="note warn" style={{ fontFamily: "var(--font-ui)" }}>{s.ghiChu}</p>}
              <h2>1. Mô tả học phần</h2>
              <p>{s.description}</p>
              {s.prerequisites.length > 0 && <p><i>Học phần tiên quyết:</i> {s.prerequisites.join(", ")}</p>}
              <h2>2. Chuẩn đầu ra học phần (CLO)</h2>
              <table><thead><tr><th>Mã</th><th>Nội dung</th><th>Bloom</th><th>PLO</th></tr></thead>
                <tbody>{s.clos.map((c) => <tr key={c.code}><td>{c.code}</td><td>{c.text}</td><td>{c.bloom}</td><td>{s.cloPlo.find((m) => m.clo === c.code)?.plo.map((p) => `${p.code} (${p.level})`).join(", ")}</td></tr>)}</tbody></table>
              <h2>3. Đánh giá</h2>
              <table><thead><tr><th>Thành phần</th><th>%</th><th>Hình thức</th><th>CLO</th></tr></thead>
                <tbody>{s.assessment.map((a, i) => <tr key={i}><td>{a.component}</td><td>{a.weight}</td><td>{a.method}</td><td>{a.clos.join(", ")}</td></tr>)}</tbody></table>
              <h2>4. Kế hoạch giảng dạy</h2>
              <table><thead><tr><th>Tuần</th><th>Nội dung</th><th>CLO</th><th>Hoạt động</th></tr></thead>
                <tbody>{s.schedule.map((w) => <tr key={w.week}><td>{w.week}</td><td>{w.topic}</td><td>{w.clos.join(", ")}</td><td>{w.activities}</td></tr>)}</tbody></table>
              {(s.materials.main.length > 0 || s.materials.reference.length > 0) && (
                <>
                  <h2>5. Tài liệu</h2>
                  {s.materials.main.length > 0 && <><h3>Tài liệu chính</h3><ol>{s.materials.main.map((m, i) => <li key={i}>{m}</li>)}</ol></>}
                  {s.materials.reference.length > 0 && <><h3>Tham khảo</h3><ol>{s.materials.reference.map((m, i) => <li key={i}>{m}</li>)}</ol></>}
                </>
              )}
            </div>
          ) : (
            <EmptyState icon="list" title="Chưa có đề cương" text="Điền tên học phần và số tín chỉ bên trái — AI viết mô tả, CLO gắn PLO, đánh giá và kế hoạch từng tuần." />
          )}
        </article>
      </div>
    </>
  );
}
