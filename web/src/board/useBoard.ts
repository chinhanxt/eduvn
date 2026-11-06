// web/src/board/useBoard.ts
import { useEffect, useRef, useState } from "react";
import { api, type BoardDetail, errText } from "../api";
import { type BoardDoc, type BoardObj, type BoardPageDoc, emptyPage } from "./doc";

export function useBoard(id: string) {
  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [doc, setDoc] = useState<BoardDoc | null>(null);
  const [page, setPage] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hist = useRef<BoardDoc[]>([]);
  const docRef = useRef<BoardDoc | null>(null);
  docRef.current = doc;

  useEffect(() => {
    api<BoardDetail>(`/api/boards/${id}`)
      .then((b) => {
        setBoard(b);
        setDoc(b.doc);
      })
      .catch((e: unknown) => setError(errText(e)));
  }, [id]);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    addEventListener("beforeunload", h);
    return () => removeEventListener("beforeunload", h);
  }, [dirty]);

  const snapshot = () => {
    const d = docRef.current;
    if (!d) return;
    hist.current.push(d);
    if (hist.current.length > 60) hist.current.shift();
  };
  const patchPage = (fn: (p: BoardPageDoc) => BoardPageDoc) => {
    setDoc((d) => (d ? { ...d, pages: d.pages.map((p, i) => (i === page ? fn(p) : p)) } : d));
    setDirty(true);
  };
  const change = (fn: (p: BoardPageDoc) => BoardPageDoc, live = false) => {
    if (!live) snapshot();
    patchPage(fn);
  };

  return {
    board,
    doc,
    page,
    setPage,
    current: doc?.pages[page] ?? null,
    dirty,
    saving,
    error,
    setError,
    snapshot,
    updateObj: (oid: string, patch: Partial<BoardObj>, live = false) =>
      change((p) => ({ ...p, objects: p.objects.map((o) => (o.id === oid ? ({ ...o, ...patch } as BoardObj) : o)) }), live),
    addObj: (o: BoardObj) => change((p) => ({ ...p, objects: [...p.objects, o] })),
    removeObjs: (ids: string[], live = false) => change((p) => ({ ...p, objects: p.objects.filter((o) => !ids.includes(o.id)) }), live),
    undo: () => {
      const prev = hist.current.pop();
      if (!prev) return;
      setDoc(prev);
      setDirty(true);
      setPage((pg) => Math.min(pg, prev.pages.length - 1));
    },
    addPage: () => {
      if (!doc || doc.pages.length >= 30) return;
      snapshot();
      setDoc({ ...doc, pages: [...doc.pages.slice(0, page + 1), emptyPage(), ...doc.pages.slice(page + 1)] });
      setPage(page + 1);
      setDirty(true);
    },
    deletePage: () => {
      if (!doc || doc.pages.length <= 1) return;
      snapshot();
      setDoc({ ...doc, pages: doc.pages.filter((_, i) => i !== page) });
      setPage(Math.max(0, page - 1));
      setDirty(true);
    },
    save: async () => {
      if (!board || !doc) return;
      const sent = doc;
      setSaving(true);
      try {
        await api(`/api/boards/${id}`, { method: "PUT", body: { title: board.title, subject: board.subject, grade: board.grade, topic: board.topic, doc } });
        if (docRef.current === sent) setDirty(false);
      } catch (e) {
        setError(errText(e));
      } finally {
        setSaving(false);
      }
    },
  };
}
export type BoardApi = ReturnType<typeof useBoard>;
