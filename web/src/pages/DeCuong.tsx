import { useState } from "react";
import { aiSkill, downloadPost, errText } from "../api";
import { Icon } from "../Icon";

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

export function DeCuong() {
  const [f, setF] = useState({ name: "", credits: 3, major: "", level: "", weeks: 15, plos: "", note: "" });
  const [s, setS] = useState<Syllabus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setS(await aiSkill<Syllabus>("de-cuong", { name: f.name.trim(), credits: f.credits, weeks: f.weeks, major: f.major.trim() || undefined, level: f.level.trim() || undefined, plos: f.plos.trim() || undefined, note: f.note.trim() || undefined }));
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
    }
  };
  const docx = () => downloadPost("/api/ai-skills/de-cuong/docx", s, "de-cuong-hoc-phan.docx").catch((e: unknown) => setError(errText(e)));

  return (
    <>
      <h1>Đề cương học phần</h1>
      <div className="card" style={{ marginBottom: 16 }} data-testid="dc-form">
        <div className="formrow">
          <label className="lbl">Tên học phần<input className="inp w-m" style={{ width: 260 }} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="dc-name" /></label>
          <label className="lbl">Tín chỉ<input className="inp w-s" type="number" min={1} max={15} value={f.credits} onChange={(e) => setF({ ...f, credits: Number(e.target.value) })} /></label>
          <label className="lbl">Ngành<input className="inp w-m" value={f.major} onChange={(e) => setF({ ...f, major: e.target.value })} /></label>
          <label className="lbl">Trình độ / năm<input className="inp w-m" placeholder="Đại học năm 2" value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })} /></label>
          <label className="lbl">Số tuần<input className="inp w-s" type="number" min={4} max={30} value={f.weeks} onChange={(e) => setF({ ...f, weeks: Number(e.target.value) })} /></label>
        </div>
        <div className="formrow">
          <label className="lbl" style={{ flex: 1 }}>PLO của chương trình (nếu có — bỏ trống AI đặt PLO giả định)<input className="inp" style={{ width: "100%" }} value={f.plos} onChange={(e) => setF({ ...f, plos: e.target.value })} /></label>
          <label className="lbl" style={{ flex: 1 }}>Yêu cầu thêm<input className="inp" style={{ width: "100%" }} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></label>
        </div>
        <div className="bar" style={{ marginBottom: 0 }}>
          <span className="sp" />
          {busy && <span className="tag violet">AI đang thiết kế (khung rồi kế hoạch tuần), khoảng 1–3 phút…</span>}
          <button className="btn" disabled={busy || !f.name.trim()} onClick={() => void run()} data-testid="dc-run"><Icon name="spark" size={18} />Soạn đề cương</button>
        </div>
      </div>
      {error && <div className="err">{error}</div>}
      {s && (
        <div className="card" data-testid="dc-view">
          <div className="bar">
            <h2 style={{ margin: 0 }}>{s.name}{s.code ? ` (${s.code})` : ""}</h2>
            <span className="sp" />
            <button className="btn" onClick={() => void docx()} data-testid="dc-docx"><Icon name="down" size={18} />Tải Word</button>
          </div>
          <p>{s.credits} tín chỉ · lí thuyết {s.hours.lecture} · thực hành {s.hours.practice} · tự học {s.hours.selfStudy}{s.level ? ` · ${s.level}` : ""}</p>
          <p>{s.description}</p>
          {s.ghiChu && <div className="warn">{s.ghiChu}</div>}
          <h3>Chuẩn đầu ra (CLO)</h3>
          <table><thead><tr><th>Mã</th><th>Nội dung</th><th>Mức</th><th>PLO</th></tr></thead>
            <tbody>{s.clos.map((c) => <tr key={c.code}><td>{c.code}</td><td>{c.text}</td><td>{c.bloom}</td><td>{s.cloPlo.find((m) => m.clo === c.code)?.plo.map((p) => `${p.code} (${p.level})`).join(", ")}</td></tr>)}</tbody></table>
          <h3>Đánh giá</h3>
          <table><thead><tr><th>Thành phần</th><th>%</th><th>Hình thức</th><th>CLO</th></tr></thead>
            <tbody>{s.assessment.map((a, i) => <tr key={i}><td>{a.component}</td><td>{a.weight}</td><td>{a.method}</td><td>{a.clos.join(", ")}</td></tr>)}</tbody></table>
          <h3>Kế hoạch giảng dạy</h3>
          <table><thead><tr><th>Tuần</th><th>Nội dung</th><th>CLO</th><th>Hoạt động</th></tr></thead>
            <tbody>{s.schedule.map((w) => <tr key={w.week}><td>{w.week}</td><td>{w.topic}</td><td>{w.clos.join(", ")}</td><td>{w.activities}</td></tr>)}</tbody></table>
        </div>
      )}
    </>
  );
}
