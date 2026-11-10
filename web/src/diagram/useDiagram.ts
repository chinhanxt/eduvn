// web/src/diagram/useDiagram.ts — tải/lưu sơ đồ, hoàn tác/làm lại, tự lưu.
import { useCallback, useEffect, useRef, useState } from "react";
import { api, type DiagramDetail, errText } from "../api";
import type { DiagramDoc } from "./types";

const AUTOSAVE_MS = 1500;

export function useDiagram(id: string) {
  const [meta, setMeta] = useState<DiagramDetail | null>(null);
  const [doc, setDoc] = useState<DiagramDoc | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const undoS = useRef<DiagramDoc[]>([]);
  const redoS = useRef<DiagramDoc[]>([]);
  const docRef = useRef<DiagramDoc | null>(null);
  docRef.current = doc;

  useEffect(() => {
    api<DiagramDetail>(`/api/diagrams/${id}`)
      .then((d) => {
        setMeta(d);
        setDoc(d.doc);
      })
      .catch((e: unknown) => setError(errText(e)));
  }, [id]);

  const save = useCallback(async () => {
    const d = docRef.current;
    if (!meta || !d) return;
    setSaving(true);
    try {
      await api(`/api/diagrams/${id}`, { method: "PUT", body: { title: meta.title, subject: meta.subject, grade: meta.grade, topic: meta.topic, doc: d } });
      if (docRef.current === d) setDirty(false);
    } catch (e) {
      setError(errText(e));
    } finally {
      setSaving(false);
    }
  }, [id, meta]);

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => void save(), AUTOSAVE_MS);
    return () => clearTimeout(t);
  }, [dirty, doc, save]);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    addEventListener("beforeunload", h);
    return () => removeEventListener("beforeunload", h);
  }, [dirty]);

  /** Đổi tài liệu: `live` = đang kéo (không ghi lịch sử; gọi snapshot() một lần lúc bắt đầu). */
  const change = useCallback((fn: (d: DiagramDoc) => DiagramDoc, live = false) => {
    const cur = docRef.current;
    if (!cur) return;
    if (!live) {
      undoS.current.push(cur);
      if (undoS.current.length > 80) undoS.current.shift();
      redoS.current = [];
    }
    const next = fn(cur);
    docRef.current = next;
    setDoc(next);
    setDirty(true);
  }, []);
  const snapshot = useCallback(() => {
    const cur = docRef.current;
    if (!cur) return;
    undoS.current.push(cur);
    if (undoS.current.length > 80) undoS.current.shift();
    redoS.current = [];
  }, []);
  const undo = useCallback(() => {
    const prev = undoS.current.pop();
    const cur = docRef.current;
    if (!prev || !cur) return;
    redoS.current.push(cur);
    docRef.current = prev;
    setDoc(prev);
    setDirty(true);
  }, []);
  const redo = useCallback(() => {
    const next = redoS.current.pop();
    const cur = docRef.current;
    if (!next || !cur) return;
    undoS.current.push(cur);
    docRef.current = next;
    setDoc(next);
    setDirty(true);
  }, []);
  return { meta, doc, dirty, saving, error, setError, change, snapshot, undo, redo, save, canUndo: () => undoS.current.length > 0, canRedo: () => redoS.current.length > 0 };
}
export type DiagramApi = ReturnType<typeof useDiagram>;
