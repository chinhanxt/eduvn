import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { AFTER_LOGIN_KEY, useAuth, userManager } from "../auth";
import { Mascot } from "../portal/hoc/Mascot";
import { Button } from "../ui/components/Button";
import { Segmented } from "../ui/components/Chip";
import { useToast } from "../ui/components/Toast";
import { Icon } from "../ui/Icon";
import { useUrlState } from "../ui/data/urlState";
import { usePageMeta } from "../ui/shell/AppShell";
import { isCardQr } from "./oldPaths";
import { HOC_PATH } from "./paths";
import { type StoredSession, errMsg, hsFetch, hsJson, saveSession } from "./studentApi";
import type { StudentSession } from "./types";
import "./hs.css";

type BarcodeDetectorLike = { detect(src: HTMLVideoElement): Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (o: { formats: string[] }) => BarcodeDetectorLike;
  }
}

const EMPTY_PIN = ["", "", "", "", "", ""];

/** Khung chung màn vào lớp: mảng màu chào + thẻ biểu mẫu (≤ 720 px xếp dọc). */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="lgn">
      <section className="lgn-hero" aria-label="Chào mừng">
        <div className="lgn-brand"><span className="mark"><Icon name="cap" /></span>EDUVN <small>Học</small></div>
        <Mascot mood="chao" size={96} className="lgn-mam" />
        <h1>Chào em!<br />Vào lớp thôi nào.</h1>
        <ol className="lgn-steps">
          <li><b>1</b>Mã lớp 6 chữ trên bảng</li>
          <li><b>2</b>Số thứ tự của em</li>
          <li><b>3</b>Mã PIN trên thẻ học sinh</li>
        </ol>
      </section>
      <div className="lgn-side">{children}</div>
    </div>
  );
}

/** Đăng nhập HS: mã lớp + số thứ tự + PIN; quét thẻ QR; hoặc tài khoản (Google/email) + mã tham gia. Cách vào nằm trong URL (?cach=qr). */
export function StudentLogin({ onLogin }: { onLogin: (s: StoredSession) => void }) {
  usePageMeta("Vào lớp");
  const { user, login } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useUrlState<string>("cach", "the");
  const [code, setCode] = useState("");
  const [seat, setSeat] = useState("");
  const [pin, setPin] = useState<string[]>(EMPTY_PIN);
  const [join, setJoin] = useState(() => new URLSearchParams(window.location.search).get("ma") ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pins = useRef<(HTMLInputElement | null)[]>([]);
  const ready = code.length === 6 && !!seat && pin.join("").length === 6;

  const done = (s: StoredSession) => {
    toast({ title: `Đã vào lớp ${s.class.name}`, msg: `Chào ${s.student.fullName}` });
    onLogin(s);
  };

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy || !ready) return;
    setErr(null);
    setBusy(true);
    try {
      const s = await hsJson<StudentSession>("/api/student/session", { method: "POST", body: { classCode: code, seat: Number(seat), pin: pin.join("") }, token: null });
      done(saveSession(s));
    } catch (x) {
      setErr(errMsg(x));
      setPin(EMPTY_PIN);
      pins.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  };

  const setDigit = (i: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    const next = [...pin];
    if (digits.length > 1) {
      // dán cả 6 số
      digits.slice(0, 6 - i).split("").forEach((d, k) => (next[i + k] = d));
      setPin(next);
      pins.current[Math.min(5, i + digits.length)]?.focus();
      return;
    }
    next[i] = digits;
    setPin(next);
    if (digits && i < 5) pins.current[i + 1]?.focus();
  };

  const joinWith = useCallback(
    async (jc: string, idp?: "google") => {
      setErr(null);
      setInfo(null);
      const u = await userManager.getUser();
      if (!u || u.expired) {
        window.sessionStorage.setItem(AFTER_LOGIN_KEY, `${HOC_PATH.baiTap}?ma=${encodeURIComponent(jc)}`);
        login(idp);
        return;
      }
      try {
        const res = await hsFetch("/api/student/session/oidc", { method: "POST", body: { joinCode: jc, fullName: u.profile.name }, token: u.access_token });
        const data = (await res.json()) as StudentSession & { message?: string; error?: string };
        if (res.status === 200) done(saveSession(data));
        else if (res.status === 202) setInfo(data.message ?? "Chờ giáo viên xác nhận");
        else setErr(data.error ?? "Không vào được lớp");
      } catch (x) {
        setErr(errMsg(x));
      }
    },
    [login], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Quay về từ Keycloak với ?ma=…: tự đổi sang phiên HS
  useEffect(() => {
    const ma = new URLSearchParams(window.location.search).get("ma");
    if (ma && user) void joinWith(ma);
  }, [user, joinWith]);

  const google = () => (join.trim().length === 6 ? joinWith(join.trim(), "google") : (setErr("Nhập mã tham gia lớp (6 chữ) ở ô bên dưới trước nhé"), undefined));

  return (
    <Frame>
      <div className="lgn-card">
        <Segmented
          label="Cách vào lớp"
          value={tab === "qr" ? "qr" : "the"}
          onChange={(v) => setTab(v)}
          options={[
            { value: "the", label: <><Icon name="key" size="sm" />Mã lớp + PIN</> },
            { value: "qr", label: <><Icon name="qr" size="sm" />Quét thẻ QR</> },
          ]}
        />
        {err && <div className="lgn-msg err" role="alert" data-testid="hs-err"><Icon name="alert" size="sm" />{err}</div>}
        {info && <div className="lgn-msg info" role="status" data-testid="hs-info"><Icon name="info" size="sm" />{info}</div>}
        {tab !== "qr" ? (
          <form onSubmit={(e) => void submit(e)} className="lgn-form">
            <div className="lgn-row">
              <label className="lgn-f">
                <span className="lgn-l"><b>1</b>Mã lớp</span>
                <input className="lgn-big" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} maxLength={6} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="ABC123" data-testid="hs-in-code" />
              </label>
              <label className="lgn-f seat">
                <span className="lgn-l"><b>2</b>Số TT</span>
                <input className="lgn-big" value={seat} onChange={(e) => setSeat(e.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={3} placeholder="12" data-testid="hs-in-seat" />
              </label>
            </div>
            <div className="lgn-f">
              <span className="lgn-l" id="pin-l"><b>3</b>Mã PIN (6 số)</span>
              <div className="lgn-pins" role="group" aria-labelledby="pin-l">
                {pin.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      pins.current[i] = el;
                    }}
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    aria-label={`PIN số ${i + 1}`}
                    className={d ? "on" : undefined}
                    value={d}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => e.key === "Backspace" && !pin[i] && i > 0 && pins.current[i - 1]?.focus()}
                    data-testid={`hs-in-pin-${i}`}
                  />
                ))}
              </div>
            </div>
            <Button type="submit" variant="primary" size="lg" className="block" iconEnd="arrowr" busy={busy} disabled={!ready} data-testid="hs-go">
              Vào lớp
            </Button>
          </form>
        ) : (
          <QrScan />
        )}
      </div>
      <div className="lgn-card alt">
        <div className="lgn-alt-t"><Icon name="user" size="sm" />Sinh viên / học sinh có tài khoản</div>
        <Button className="block" icon="key" onClick={google}>Đăng nhập bằng Google</Button>
        <div className="lgn-or"><span>hoặc mã tham gia</span></div>
        <div className="lgn-join">
          <input className="input" placeholder="MÃ THAM GIA" maxLength={6} aria-label="Mã tham gia lớp" value={join} onChange={(e) => setJoin(e.target.value.toUpperCase())} data-testid="hs-in-join" />
          <Button variant="primary" disabled={join.trim().length !== 6} onClick={() => joinWith(join.trim())} data-testid="hs-join">Tham gia</Button>
        </div>
      </div>
    </Frame>
  );
}

/** Quét QR bằng camera nếu trình duyệt có BarcodeDetector; không thì hướng dẫn dùng camera điện thoại. */
function QrScan() {
  const video = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const supported = typeof window !== "undefined" && !!window.BarcodeDetector;
  useEffect(() => {
    if (!on || !window.BarcodeDetector) return;
    let stream: MediaStream | null = null;
    let timer = 0;
    const det = new window.BarcodeDetector({ formats: ["qr_code"] });
    void navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play();
        }
        timer = window.setInterval(async () => {
          if (!video.current) return;
          const hit = (await det.detect(video.current)).find((c) => isCardQr(c.rawValue, window.location.origin));
          if (hit) window.location.assign(hit.rawValue);
        }, 300);
      })
      .catch(() => {
        setErr("Không mở được camera. Em dùng camera điện thoại quét mã nhé.");
        setOn(false);
      });
    return () => {
      window.clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [on]);
  return (
    <div className="lgn-qr">
      <div className={on ? "lgn-cam live" : "lgn-cam"}>
        {on ? <video ref={video} muted playsInline /> : <Icon name="camera" size="lg" />}
        <span className="cr a" /><span className="cr b" /><span className="cr c" /><span className="cr d" />
      </div>
      {err && <div className="lgn-msg err" role="alert"><Icon name="alert" size="sm" />{err}</div>}
      <p className="caption" style={{ textAlign: "center" }}>{supported ? "Đưa mã QR trên thẻ vào khung" : "Mở camera điện thoại, quét mã QR trên thẻ — trang sẽ tự vào lớp."}</p>
      {supported && !on && <Button size="lg" className="block" icon="camera" onClick={() => setOn(true)}>Bật camera</Button>}
    </div>
  );
}

/** /hoc/bai-tap/qr#<token>: đổi thẻ QR lấy phiên HS. */
export function QrLogin() {
  usePageMeta("Vào lớp bằng thẻ");
  const nav = useNavigate();
  const toast = useToast();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const token = window.location.hash.slice(1);
    window.history.replaceState(null, "", HOC_PATH.qr);
    if (!token) {
      setErr("Thẻ QR không hợp lệ hoặc đã được cấp lại");
      return;
    }
    hsJson<StudentSession>("/api/student/session/qr", { method: "POST", body: { token }, token: null })
      .then((s) => {
        const st = saveSession(s);
        toast({ title: `Đã vào lớp ${st.class.name}`, msg: `Chào ${st.student.fullName}` });
        nav(HOC_PATH.baiTap, { replace: true });
      })
      .catch((e: unknown) => setErr(errMsg(e)));
  }, [nav]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Frame>
      <div className="lgn-card" aria-busy={!err || undefined}>
        {err ? (
          <>
            <div className="lgn-msg err" role="alert"><Icon name="alert" size="sm" />{err}</div>
            <a className="btn lg primary block" href={HOC_PATH.baiTap}><span>Vào bằng mã lớp</span></a>
          </>
        ) : (
          <div className="lgn-wait" role="status"><span className="spin" />Đang vào lớp…</div>
        )}
      </div>
    </Frame>
  );
}
