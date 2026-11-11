#!/usr/bin/env python3
"""whisper_transcribe.py <audio> [--model small] [--language vi] [--device auto|cuda|cpu] [--prompt "…"]

faster-whisper (MIT, SYSTRAN) chạy local: model CTranslate2 lấy từ cache HuggingFace có sẵn (không tải mới).
In ra stdout một dòng JSON {text, language, duration, segments:[{start,end,text}]}.
GPU: int8_float16; không có GPU / thiếu VRAM → CPU int8. Lọc lặng (VAD) để bỏ đoạn im.
"""
import argparse
import json
import os
import sys

ap = argparse.ArgumentParser()
ap.add_argument("audio")
ap.add_argument("--model", default="small")
ap.add_argument("--language", default="vi")
ap.add_argument("--device", default="auto")
ap.add_argument("--prompt", default=None)
a = ap.parse_args()

os.environ.setdefault("HF_HUB_OFFLINE", "1")
from faster_whisper import WhisperModel  # noqa: E402


def load(device):
    if device == "cpu":
        return WhisperModel(a.model, device="cpu", compute_type="int8", local_files_only=True)
    return WhisperModel(a.model, device="cuda", compute_type="int8_float16", local_files_only=True)


def transcribe(model):
    segs, info = model.transcribe(a.audio, language=a.language or None, initial_prompt=a.prompt, vad_filter=True, beam_size=5)
    out = [{"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip()} for s in segs]
    return out, info


try:
    if a.device == "cpu":
        raise RuntimeError("cpu")
    segs, info = transcribe(load("cuda"))
except Exception as e:  # noqa: BLE001 — không có CUDA / hết VRAM → CPU
    if a.device == "cuda":
        sys.exit(f"whisper: GPU lỗi: {e}")
    segs, info = transcribe(load("cpu"))

print(json.dumps({"text": " ".join(s["text"] for s in segs if s["text"]).strip(), "language": info.language, "duration": info.duration, "segments": segs}, ensure_ascii=False))
