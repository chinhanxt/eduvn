import { useCallback, useEffect, useState } from "react";
import { errText } from "../api";
import { Icon } from "../Icon";
import { ChatPanel } from "./ChatPanel";
import { type Kb, type SessionRow, tutorApi } from "./client";

export function Tutor() {
  const [kbs, setKbs] = useState<Kb[]>([]);
  const [kbId, setKbId] = useState<string>("");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sid, setSid] = useState<string | null>(null);
  const [starters, setStarters] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = useCallback(() => tutorApi<SessionRow[]>("/sessions").then(setSessions).catch((e: unknown) => setError(errText(e))), []);
  useEffect(() => {
    void loadSessions();
    tutorApi<Kb[]>("/kbs").then((l) => { setKbs(l); if (l[0]) setKbId(l[0].id); }).catch((e: unknown) => setError(errText(e)));
  }, [loadSessions]);
  useEffect(() => {
    tutorApi<{ starters: string[] }>(`/starters${kbId ? `?kbId=${kbId}` : ""}`).then((s) => setStarters(s.starters)).catch(() => setStarters([]));
  }, [kbId]);

  const del = async (id: string) => {
    if (!confirm("Xoá cuộc trò chuyện này?")) return;
    await tutorApi(`/sessions/${id}`, { method: "DELETE" }).catch((e: unknown) => setError(errText(e)));
    if (sid === id) setSid(null);
    void loadSessions();
  };

  return (
    <>
      {error && <div className="err">{error}</div>}
      <div className="chat">
        <div className="chat-side">
          <select className="inp" value={kbId} onChange={(e) => setKbId(e.target.value)} aria-label="Kho tri thức" data-testid="kb-select">
            <option value="">Không dùng tài liệu</option>
            {kbs.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
          <button className="btn" onClick={() => setSid(null)}><Icon name="plus" size={18} />Cuộc trò chuyện mới</button>
          <div className="list">
            {sessions.length === 0 && <div className="empty">Chưa có cuộc trò chuyện</div>}
            {sessions.map((s) => (
              <button key={s.id} className={`sess${s.id === sid ? " on" : ""}`} title={s.title} onClick={() => { setSid(s.id); if (s.kbId) setKbId(s.kbId); }}>
                <span>{s.title}</span>
                <i className="xbtn" role="button" aria-label="Xoá" onClick={(e) => { e.stopPropagation(); void del(s.id); }}><Icon name="trash" size={14} /></i>
              </button>
            ))}
          </div>
        </div>
        <ChatPanel
          ctx={{ kbId: kbId || null }}
          sessionId={sid}
          starters={starters}
          onSession={(id) => { setSid(id); void loadSessions(); }}
          onTitle={(id, title) => setSessions((l) => l.map((s) => (s.id === id ? { ...s, title } : s)))}
        />
      </div>
    </>
  );
}
