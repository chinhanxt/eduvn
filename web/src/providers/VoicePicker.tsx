// Ô chọn giọng (thư viện của trường + giọng có sẵn của engine + giọng trình duyệt) · tốc độ · nghe thử. Dùng lại ở mọi nơi cần giọng (G2/G3…).
import { useId, useMemo } from "react";
import { Button } from "../ui/components/Button";
import { Field, Select } from "../ui/components/Field";
import { useQuery } from "../ui/data/query";
import { CAPS_KEY, VOICES_KEY, fetchCaps, fetchVoices } from "./api";
import { genderVi, groupVoices, speedVi } from "./logic";
import { useTts } from "./useTts";
import "./providers.css";

export const SAMPLE_LINE = "Xin chào các em. Hôm nay chúng ta cùng tìm hiểu định luật Ôm: cường độ dòng điện bằng hiệu điện thế chia cho điện trở.";

export function VoicePicker({ value, onChange, speed, onSpeed, label = "Giọng đọc", sample = SAMPLE_LINE, disabled, emptyLabel = "Mặc định của trường" }: {
  value: string;
  onChange: (id: string) => void;
  speed: number;
  onSpeed: (s: number) => void;
  label?: string;
  sample?: string;
  disabled?: boolean;
  /** Nhãn lựa chọn rỗng (giá trị ""). null = không có lựa chọn rỗng. */
  emptyLabel?: string | null;
}) {
  const voices = useQuery(VOICES_KEY, fetchVoices);
  const caps = useQuery(CAPS_KEY, fetchCaps);
  const tts = useTts();
  const speedId = useId();
  const label_ = (id: string) => caps.data?.kinds.tts.providers.find((p) => p.id === id)?.label ?? id;
  const groups = useMemo(() => groupVoices(voices.data ?? [], label_), [voices.data, caps.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const playing = tts.state === "loading" || tts.state === "playing";
  return (
    <div className="vp" data-testid="voice-picker">
      <Field label={label} hint={tts.error ?? undefined}>
        <Select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled || !voices.data} data-testid="voice-select">
          {!voices.data && <option value={value}>Đang tải giọng…</option>}
          {voices.data && emptyLabel !== null && <option value="">{emptyLabel}</option>}
          {groups.map((g) => (
            <optgroup key={g.key} label={g.label}>
              {g.voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {[v.name, genderVi(v.gender), v.tags[0]].filter(Boolean).join(" · ")}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </Field>
      <div className="vp-row">
        <label className="vp-speed" htmlFor={speedId}>
          <span className="vp-lbl">Tốc độ <b className="num">{speedVi(speed)}</b></span>
          <input id={speedId} type="range" min={0.5} max={2} step={0.05} value={speed} disabled={disabled} onChange={(e) => onSpeed(Number(e.target.value))} aria-valuetext={speedVi(speed)} data-testid="voice-speed" />
        </label>
        <Button size="sm" icon={tts.state === "loading" ? "loader" : playing ? "stop" : "play"} aria-busy={tts.state === "loading" || undefined} title={playing ? "Bấm để dừng" : undefined} onClick={() => void (playing ? tts.stop() : tts.speak(sample, { voiceId: value || undefined, speed }))} data-testid="voice-try">
          {tts.state === "loading" ? "Đang đọc…" : playing ? "Dừng" : "Nghe thử"}
        </Button>
      </div>
    </div>
  );
}
