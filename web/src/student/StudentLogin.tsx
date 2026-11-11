import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { AFTER_LOGIN_KEY, useAuth, userManager } from "../auth";
import { Icon } from "../Icon";
import { type StoredSession, errMsg, hsFetch, hsJson, saveSession } from "./studentApi";
import type { StudentSession } from "./types";

type BarcodeDetectorLike = { detect(src: HTMLVideoElement): Promise<{ rawValue: string }[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (o: { formats: string[] }) => BarcodeDetectorLike;
  }
}

/** Đăng nhập HS: mã lớp + số thứ tự + PIN; quét thẻ QR; hoặc tài khoản (Google/email) + mã tham gia. */
export function StudentLogin({ onLogin }: { onLogin: (s: StoredSession) => void }) {
  const { user, login } = useAuth();
  const [tab, setTab] = useState<"card" | "qr">("card");
  const [code, setCode] = useState("");
  const [seat, setSeat] = useState("");
  const [pin, setPin] = useState<string[]>(["", "", "", "", "", ""]);
  const [join, setJoin] = useState(() => new URLSearchParams(window.location.search).get("ma") ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pins = useRef<(HTMLInputElement | null)[]>([]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const s = await hsJson<StudentSession>("/api/student/session", { method: "POST", body: { classCode: code, seat: Number(seat), pin: pin.join("") }, token: null });
      onLogin(saveSession(s));
    } catch (x) {
      setErr(errMsg(x));
      setPin(["", "", "", "", "", ""]);
      pins.current[0]?.focus();
    } finally {
      setBusy(false);
    }
  };

  const setDigit = (i: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length > 1) {
      // dán cả 6 số
      const next = [...pin];
      digits.slice(0, 6 - i).split("").forEach((d, k) => (next[i + k] = d));
      setPin(next);
      pins.current[Math.min(5, i + digits.length)]?.focus();
      return;
    }
    const next = [...pin];
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
        window.sessionStorage.setItem(AFTER_LOGIN_KEY, `/hs?ma=${encodeURIComponent(jc)}`);
        login(idp);
        return;
      }
      try {
        const res = await hsFetch("/api/student/session/oidc", { method: "POST", body: { joinCode: jc, fullName: u.profile.name }, token: u.access_token });
        const data = (await res.json()) as StudentSession & { message?: string; error?: string };
        if (res.status === 200) onLogin(saveSession(data));
        else if (res.status === 202) setInfo(data.message ?? "Chờ giáo viên xác nhận");
        else setErr(data.error ?? "Không vào được lớp");
      } catch (x) {
        setErr(errMsg(x));
      }
    },
    [login, onLogin],
  );

  // Quay về từ Keycloak với ?ma=…: tự đổi sang phiên HS
  useEffect(() => {
    const ma = new URLSearchParams(window.location.search).get("ma");
    if (ma && user) void joinWith(ma);
  }, [user, joinWith]);

  const google = () => (join.trim() ? void joinWith(join.trim(), "google") : setErr("Nhập mã tham gia lớp ở ô bên dưới trước nhé"));

  return (
    <div className="hs-login">
      <div className="hs-col">
        <div className="hs-box">
          <div className="hs-lhead">
            <div className="brand"><span className="mark"><Icon name="cap" /></span>EDUVN</div>
            <p>Chào em! Vào lớp thôi nào</p>
          </div>
          <div className="hs-seg hs-seg-full">
            <button className={tab === "card" ? "on" : ""} onClick={() => setTab("card")}><Icon name="key" />Mã lớp + PIN</button>
            <button className={tab === "qr" ? "on" : ""} onClick={() => setTab("qr")}><Icon name="qr" />Quét thẻ QR</button>
          </div>
          {err && <div className="hs-err" data-testid="hs-err">{err}</div>}
          {info && <div className="hs-info" data-testid="hs-info">{info}</div>}
          {tab === "card" ? (
            <form onSubmit={(e) => void submit(e)}>
              <div className="hs-lrow">
                <label><div className="hs-bigl"><span className="n">1</span>Mã lớp</div><input className="hs-bigin" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} autoComplete="off" data-testid="hs-in-code" /></label>
                <label><div className="hs-bigl"><span className="n">2</span>Số TT</div><input className="hs-bigin" value={seat} onChange={(e) => setSeat(e.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={3} data-testid="hs-in-seat" /></label>
              </div>
              <div className="hs-bigl"><span className="n">3</span>Mã PIN (6 số)</div>
              <div className="hs-pins">
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
                    value={d}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => e.key === "Backspace" && !pin[i] && i > 0 && pins.current[i - 1]?.focus()}
                    data-testid={`hs-in-pin-${i}`}
                  />
                ))}
              </div>
              <button className="hs-btn primary lg block" disabled={busy || code.length !== 6 || !seat || pin.join("").length !== 6} data-testid="hs-go"><Icon name="arrowr" />Vào lớp</button>
            </form>
          ) : (
            <QrScan />
          )}
        </div>
        <div className="hs-box hs-alt">
          <div className="hs-ttl"><Icon name="user" />Sinh viên / học sinh lớn</div>
          <button className="hs-gbtn" onClick={google}><Icon name="key" />Đăng nhập bằng Google</button>
          <div className="hs-or">hoặc</div>
          <div className="hs-join">
            <input className="hs-inp" placeholder="MÃ THAM GIA" maxLength={6} aria-label="Mã tham gia lớp" value={join} onChange={(e) => setJoin(e.target.value.toUpperCase())} data-testid="hs-in-join" />
            <button className="hs-btn primary" disabled={join.trim().length !== 6} onClick={() => void joinWith(join.trim())} data-testid="hs-join">Tham gia</button>
          </div>
        </div>
      </div>
    </div>
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
          const hit = (await det.detect(video.current)).find((c) => c.rawValue.startsWith(`${window.location.origin}/hs/qr#`));
          if (hit) window.location.assign(hit.rawValue);
        }, 300);
      })
      .catch(() => setErr("Không mở được camera. Em dùng camera điện thoại quét mã nhé."));
    return () => {
      window.clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [on]);
  return (
    <div>
      <div className="hs-qrcam">
        {on ? <video ref={video} muted playsInline /> : <Icon name="camera" />}
        <span className="cr a" /><span className="cr b" /><span className="cr c" /><span className="cr d" />
      </div>
      {err && <div className="hs-err">{err}</div>}
      <p className="hs-muted hs-center">{supported ? "Đưa mã QR trên thẻ vào khung" : "Mở camera điện thoại, quét mã QR trên thẻ — trang sẽ tự vào lớp."}</p>
      {supported && !on && <button className="hs-btn lg block" onClick={() => setOn(true)}><Icon name="camera" />Bật camera</button>}
    </div>
  );
}

/** /hs/qr#<token>: đổi thẻ QR lấy phiên HS. */
export function QrLogin() {
  const nav = useNavigate();
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const token = window.location.hash.slice(1);
    window.history.replaceState(null, "", "/hs/qr");
    if (!token) {
      setErr("Thẻ QR không hợp lệ hoặc đã được cấp lại");
      return;
    }
    hsJson<StudentSession>("/api/student/session/qr", { method: "POST", body: { token }, token: null })
      .then((s) => {
        saveSession(s);
        nav("/hs", { replace: true });
      })
      .catch((e: unknown) => setErr(errMsg(e)));
  }, [nav]);
  return (
    <div className="hs-login">
      <div className="hs-box hs-center">
        {err ? <><div className="hs-err">{err}</div><a className="hs-btn" href="/hs">Đăng nhập bằng mã lớp</a></> : "Đang vào lớp…"}
      </div>
    </div>
  );
}
