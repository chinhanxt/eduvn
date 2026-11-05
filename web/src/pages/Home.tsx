import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api, downloadFirst, type ExamSummary } from "../api";
import { Icon } from "../Icon";
import { useMe } from "../Shell";
import { TOOLS } from "../tools";

const CHANNELS = [
  { icon: "spark", name: "Claude", on: false },
  { icon: "chat", name: "ChatGPT", on: false },
  { icon: "bot", name: "Zalo", on: false },
];

export function Home() {
  const me = useMe();
  const [recent, setRecent] = useState<ExamSummary[] | null>(null);
  useEffect(() => {
    api<ExamSummary[]>("/api/exams").then((l) => setRecent(l.slice(0, 5))).catch(() => setRecent([]));
  }, []);
  return (
    <>
      <h1>Chào {me?.user.name ?? me?.user.email}</h1>
      <div className="tools">
        {TOOLS.map((t) => (
          <Link key={t.to} to={t.to} className="tool">
            <div className={`ic ${t.color}`}><Icon name={t.icon} /></div>
            <div className="name">{t.name}</div>
            {t.pill && <span className="pill">{t.pill}</span>}
          </Link>
        ))}
      </div>
      <div className="row">
        <div className="card">
          <h2>Gần đây</h2>
          {recent?.length === 0 && <div className="empty">—</div>}
          {recent?.map((e) => (
            <div className="item" key={e.id}>
              <div className="ic blue" style={{ margin: 0, width: 38, height: 38 }}><Icon name="exam" /></div>
              <div className="grow">{e.title}<small>{e.subject} {e.grade} · {e.codes.length} mã đề</small></div>
              <button className="dl" style={{ border: 0 }} onClick={() => void downloadFirst(e.id)} aria-label="Tải Word"><Icon name="down" /></button>
            </div>
          ))}
        </div>
        <div className="card">
          <h2>Kênh</h2>
          {CHANNELS.map((c) => (
            <div className="item" key={c.name}><Icon name={c.icon} /><div className="grow">{c.name}</div><span className={c.on ? "dot ok" : "dot"} /></div>
          ))}
        </div>
      </div>
    </>
  );
}
