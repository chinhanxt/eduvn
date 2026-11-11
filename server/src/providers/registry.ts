// Sổ đăng ký nhà cung cấp phụ: mỗi loại nhiều adapter, một mặc định. Không tự chạy gì khi tạo (adapter nạp lười).
import { NotFoundError, ValidationError } from "../errors";
import { type AnyProvider, type Capabilities, KIND_LABELS, PROVIDER_KINDS, type ProviderInfo, type ProviderKind, type ProviderOf } from "./types";

export class ProviderRegistry {
  private readonly items = new Map<ProviderKind, Map<string, AnyProvider>>();
  private readonly defaults = new Map<ProviderKind, string>();

  /** Đăng ký; adapter đầu tiên chạy phía máy chủ của một loại thành mặc định (trừ khi đã đặt). */
  register<K extends ProviderKind>(p: ProviderOf[K]): this {
    const { kind, id } = p.info;
    let m = this.items.get(kind);
    if (!m) this.items.set(kind, (m = new Map()));
    if (m.has(id)) throw new Error(`Nhà cung cấp ${kind}/${id} đã đăng ký`);
    m.set(id, p);
    if (!this.defaults.has(kind) && !p.info.clientOnly) this.defaults.set(kind, id);
    return this;
  }

  setDefault(kind: ProviderKind, id: string): this {
    if (!this.items.get(kind)?.has(id)) throw new ValidationError([`Không có nhà cung cấp ${KIND_LABELS[kind].toLowerCase()} "${id}"`]);
    this.defaults.set(kind, id);
    return this;
  }

  has(kind: ProviderKind, id?: string): boolean {
    const m = this.items.get(kind);
    return id === undefined ? !!m?.size : !!m?.has(id);
  }

  /** Adapter theo mã, hoặc mặc định. Không có → 404 với câu tiếng Việt. */
  get<K extends ProviderKind>(kind: K, id?: string): ProviderOf[K] {
    const key = id ?? this.defaults.get(kind);
    const p = key ? this.items.get(kind)?.get(key) : undefined;
    if (!p) throw new NotFoundError(id ? `Không có nhà cung cấp ${KIND_LABELS[kind].toLowerCase()} "${id}"` : `Máy chủ chưa có nhà cung cấp ${KIND_LABELS[kind].toLowerCase()}`);
    return p as ProviderOf[K];
  }

  /** Như get nhưng không ném: undefined khi chưa có. */
  find<K extends ProviderKind>(kind: K, id?: string): ProviderOf[K] | undefined {
    const key = id ?? this.defaults.get(kind);
    return (key ? this.items.get(kind)?.get(key) : undefined) as ProviderOf[K] | undefined;
  }

  list(kind?: ProviderKind): ProviderInfo[] {
    const kinds = kind ? [kind] : PROVIDER_KINDS;
    return kinds.flatMap((k) => [...(this.items.get(k)?.values() ?? [])].map((p) => p.info));
  }

  defaultOf(kind: ProviderKind): string | null {
    return this.defaults.get(kind) ?? null;
  }

  /** Bộ parse đọc được file này (theo phần mở rộng), ưu tiên mặc định rồi theo thứ tự đăng ký. */
  parserFor(name: string): ProviderOf["parse"] | undefined {
    const ext = extOf(name);
    const all = [...(this.items.get("parse")?.values() ?? [])] as ProviderOf["parse"][];
    const def = this.find("parse");
    return [def, ...all].find((p) => p?.info.formats?.includes(ext));
  }

  capabilities(): Capabilities {
    const kinds = {} as Capabilities["kinds"];
    for (const k of PROVIDER_KINDS) {
      const providers = this.list(k);
      kinds[k] = { kind: k, label: KIND_LABELS[k], available: providers.length > 0, server: providers.some((p) => !p.clientOnly), default: this.defaultOf(k), providers };
    }
    const parseFormats = [...new Set(this.list("parse").flatMap((p) => p.formats ?? []))].sort();
    return { kinds, parseFormats };
  }
}

export const extOf = (name: string): string => {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim());
  return m ? m[1]!.toLowerCase() : "";
};
