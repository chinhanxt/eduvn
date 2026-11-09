/** Bầu một tab duy nhất được ghi cho mỗi bài làm. Tab không giữ khoá chuyển sang chỉ-đọc. */
export type WriterHandle = { held: boolean; release(): void };
export type WriterEnv = {
  locks?: { request(name: string, opts: { ifAvailable: boolean }, cb: (lock: unknown) => Promise<void> | void): Promise<unknown> } | null;
  channel?: ((name: string) => BroadcastChannelLike) | null;
  tabId?: string;
  now?: () => number;
};
export type BroadcastChannelLike = { postMessage(m: unknown): void; close(): void; onmessage: ((e: { data: unknown }) => void) | null };

const hasLocks = () => typeof navigator !== "undefined" && !!(navigator as Navigator & { locks?: unknown }).locks;

export async function acquireWriter(submissionId: string, onLost: () => void, env: WriterEnv = {}): Promise<WriterHandle> {
  const locks = env.locks === undefined ? (hasLocks() ? (navigator as Navigator & { locks: WriterEnv["locks"] }).locks : null) : env.locks;
  if (locks) {
    return new Promise<WriterHandle>((resolve) => {
      let release = () => {};
      void locks.request("eduvn-sub-" + submissionId, { ifAvailable: true }, (lock) => {
        if (!lock) {
          resolve({ held: false, release: () => {} });
          return;
        }
        return new Promise<void>((done) => {
          release = () => done();
          resolve({ held: true, release: () => release() });
        });
      });
    });
  }
  // Dự phòng: BroadcastChannel, tab MỚI NHẤT thắng, tab cũ chuyển chỉ-đọc.
  const mk = env.channel === undefined ? (typeof BroadcastChannel !== "undefined" ? (n: string) => new BroadcastChannel(n) as unknown as BroadcastChannelLike : null) : env.channel;
  if (!mk) return { held: true, release: () => {} };
  const me = env.tabId ?? Math.random().toString(36).slice(2);
  const born = (env.now ?? (() => Date.now()))();
  const ch = mk("eduvn-sub-" + submissionId);
  let held = true;
  ch.onmessage = (e) => {
    const m = e.data as { tab?: string; born?: number } | null;
    if (!m || m.tab === me || typeof m.born !== "number") return;
    if (held && (m.born > born || (m.born === born && (m.tab ?? "") > me))) {
      held = false;
      onLost();
    }
  };
  ch.postMessage({ tab: me, born });
  return {
    get held() {
      return held;
    },
    release: () => ch.close(),
  };
}
