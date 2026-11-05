import { describe, expect, it } from "vitest";
import { createVerifier } from "../../src/auth/verify";
import { AUDIENCE, ISSUER, makeIssuer } from "../helpers/tokens";

describe("createVerifier", () => {
  it("trả Identity từ token hợp lệ", async () => {
    const kc = await makeIssuer();
    const verify = createVerifier({ issuer: ISSUER, audience: AUDIENCE, keys: kc.keys });
    expect(await verify(await kc.sign({ sub: "u1", email: "a@x.test", name: "Cô Lan" }))).toEqual({ sub: "u1", email: "a@x.test", name: "Cô Lan" });
  });

  it("từ chối sai audience, sai issuer, hết hạn, sai khoá, thiếu sub", async () => {
    const kc = await makeIssuer();
    const other = await makeIssuer();
    const verify = createVerifier({ issuer: ISSUER, audience: AUDIENCE, keys: kc.keys });
    await expect(verify(await kc.sign({ sub: "u1" }, { aud: "account" }))).rejects.toThrow();
    await expect(verify(await kc.sign({ sub: "u1" }, { iss: "http://evil.test" }))).rejects.toThrow();
    await expect(verify(await kc.sign({ sub: "u1" }, { exp: Math.floor(Date.now() / 1000) - 60 }))).rejects.toThrow();
    await expect(verify(await other.sign({ sub: "u1" }))).rejects.toThrow();
    await expect(verify(await kc.sign({}))).rejects.toThrow();
  });

  it("bắt buộc có jwksUrl hoặc keys", () => {
    expect(() => createVerifier({ issuer: ISSUER, audience: AUDIENCE })).toThrow();
  });
});
