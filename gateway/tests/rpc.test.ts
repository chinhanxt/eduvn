import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import { JsonRpcPeer, RpcError } from "../src/acp/rpc";

function pair() {
  const aIn = new PassThrough();
  const bIn = new PassThrough();
  return { a: new JsonRpcPeer(aIn, bIn), b: new JsonRpcPeer(bIn, aIn), aIn };
}
const tick = () => new Promise((r) => setTimeout(r, 10));

describe("JsonRpcPeer", () => {
  it("gửi yêu cầu và nhận kết quả", async () => {
    const { a, b } = pair();
    b.onRequest((method, params: { x: number; y: number }) => (method === "add" ? params.x + params.y : null));
    await expect(a.request("add", { x: 2, y: 3 })).resolves.toBe(5);
    expect(a.pendingCount).toBe(0);
  });
  it("lỗi từ phía kia thành RpcError giữ mã", async () => {
    const { a, b } = pair();
    b.onRequest(() => {
      throw new RpcError(-32602, "sai tham số");
    });
    await expect(a.request("x", {})).rejects.toMatchObject({ code: -32602, message: "sai tham số" });
  });
  it("phương thức chưa đăng ký trả -32601", async () => {
    const { a } = pair();
    await expect(a.request("khong_co", {})).rejects.toMatchObject({ code: -32601 });
  });
  it("thông báo không cần trả lời", async () => {
    const { a, b } = pair();
    const got: unknown[] = [];
    b.onNotification((method, params) => got.push([method, params]));
    a.notify("ping", { n: 1 });
    await tick();
    expect(got).toEqual([["ping", { n: 1 }]]);
  });
  it("bỏ qua dòng không phải JSON", async () => {
    const { a, b, aIn } = pair();
    b.onRequest(() => "ok");
    aIn.write("Khởi động proxy...\n");
    await expect(a.request("x", {})).resolves.toBe("ok");
  });
  it("hết thời gian chờ thì từ chối và dọn yêu cầu", async () => {
    const { a, b } = pair();
    b.onRequest(() => new Promise(() => {}));
    await expect(a.request("cham", {}, 50)).rejects.toThrow(/Hết thời gian chờ cham/);
    expect(a.pendingCount).toBe(0);
  });
  it("close từ chối mọi yêu cầu đang chờ và yêu cầu sau đó", async () => {
    const { a, b } = pair();
    b.onRequest(() => new Promise(() => {}));
    const p = a.request("x", {});
    a.close(new Error("đã đóng"));
    await expect(p).rejects.toThrow("đã đóng");
    await expect(a.request("y", {})).rejects.toThrow("đã đóng");
  });
});
