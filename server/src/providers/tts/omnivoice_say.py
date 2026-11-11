#!/usr/bin/env python3
"""omnivoice_say.py -f lines.txt -o all.wav --segments seg.json --ref mau.wav [--ref-text "lời mẫu"] [--speed 1.0] [--device cuda]

Đọc mỗi dòng của lines.txt bằng OmniVoice (k2-fsa/OmniVoice, nhân giọng theo file mẫu), ghép thành một wav 24 kHz,
ghi mốc từng câu [{text,start,end}] vào --segments (cùng giao ước với vieneu-say --segments).

Chữ cuối câu: OmniVoice denoise=True cắt cổng → chữ cuối tắt cụp. Mỗi câu được chập với một "phòng nhỏ" tổng hợp
(RT60 0,45 s, ướt −15 dB, tất định) để ngân tắt dần — cùng cách với youtube_AI/bin/voice_room.py của video-studio.
Model nạp từ cache HuggingFace có sẵn (không tải mới). Chạy qua khoá việc nặng (GPU dùng chung).
"""
import argparse
import json
import os
import sys

import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("-f", "--file", required=True)
ap.add_argument("-o", "--output", required=True)
ap.add_argument("--segments", required=True)
ap.add_argument("--ref", required=True)
ap.add_argument("--ref-text", default=None)
ap.add_argument("--speed", type=float, default=1.0)
ap.add_argument("--device", default="cuda")
ap.add_argument("--steps", type=int, default=32)
ap.add_argument("--cfg", type=float, default=2.0)
a = ap.parse_args()

os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

import soundfile as sf  # noqa: E402
import torch  # noqa: E402
from scipy.signal import butter, fftconvolve, sosfilt  # noqa: E402

lines = [l.strip() for l in open(a.file, encoding="utf-8") if l.strip()]
if not lines:
    sys.exit("omnivoice_say: không có câu nào để đọc")
dev = a.device if a.device != "cuda" or torch.cuda.is_available() else "cpu"

from omnivoice import OmniVoice, OmniVoiceGenerationConfig  # noqa: E402

model = OmniVoice.from_pretrained("k2-fsa/OmniVoice", device_map=dev, dtype=torch.float16 if dev == "cuda" else torch.float32, load_asr=False)
prompt = model.create_voice_clone_prompt(ref_audio=a.ref, ref_text=a.ref_text or None)
gen = OmniVoiceGenerationConfig(num_step=a.steps, guidance_scale=a.cfg, denoise=True)
SR = 24000


def room(x, sr=SR, rt60=0.45, wet=-15.0):
    n = int(sr * rt60 * 1.2)
    rng = np.random.default_rng(13)
    t = np.arange(n) / sr
    ir = rng.standard_normal(n).astype(np.float32) * np.exp(-6.91 * t / rt60).astype(np.float32)
    ir = sosfilt(butter(4, 5000, "low", fs=sr, output="sos"), ir)
    ir = sosfilt(butter(2, 180, "high", fs=sr, output="sos"), ir)
    ir = np.concatenate([np.zeros(int(sr * 0.012), np.float32), ir]) / np.sqrt((ir**2).sum())
    full = fftconvolve(x, ir) * (10 ** (wet / 20))
    y = np.concatenate([x, np.zeros(int(sr * rt60), np.float32)])
    y[: len(full[: len(y)])] += full[: len(y)]
    peak = np.abs(y).max()
    return y * (0.99 / peak) if peak > 0.99 else y


GAP = np.zeros(int(SR * 0.25), np.float32)
parts, segs, pos = [], [], 0.0
for text in lines:
    kw = dict(text=text, language="vietnamese", generation_config=gen, voice_clone_prompt=prompt)
    if abs(a.speed - 1.0) > 1e-3:
        kw["speed"] = a.speed
    with torch.inference_mode():
        x = np.asarray(model.generate(**kw)[0], dtype=np.float32).reshape(-1)
    y = room(x)
    segs.append({"text": text, "start": round(pos, 4), "end": round(pos + len(y) / SR, 4)})
    parts += [y, GAP]
    pos += (len(y) + len(GAP)) / SR

sf.write(a.output, np.concatenate(parts), SR, subtype="PCM_16")
json.dump(segs, open(a.segments, "w", encoding="utf-8"), ensure_ascii=False)
