import { describe, expect, it } from "vitest";
import { createVerifier } from "../../src/auth/verify";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
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

  it("từ chối token không có exp", async () => {
    const kc = await makeIssuer();
    const verify = createVerifier({ issuer: ISSUER, audience: AUDIENCE, keys: kc.keys });
    await expect(verify(await kc.sign({ sub: "u1" }, { exp: null }))).rejects.toThrow();
  });

  it("chỉ chấp nhận đúng thuật toán được cho phép", async () => {
    const { publicKey, privateKey } = await generateKeyPair("ES256");
    const jwk = { ...(await exportJWK(publicKey)), kid: "k2", alg: "ES256" };
    const es = createLocalJWKSet({ keys: [jwk] });
    const token = await new SignJWT({ sub: "u1" })
      .setProtectedHeader({ alg: "ES256", kid: "k2" })
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(privateKey);
    const defaultVerify = createVerifier({ issuer: ISSUER, audience: AUDIENCE, keys: es });
    await expect(defaultVerify(token)).rejects.toThrow();
    const es256Verify = createVerifier({ issuer: ISSUER, audience: AUDIENCE, keys: es, algorithms: ["ES256"] });
    expect(await es256Verify(token)).toEqual({ sub: "u1", email: undefined, name: undefined });
  });

  it("bắt buộc có jwksUrl hoặc keys", () => {
    expect(() => createVerifier({ issuer: ISSUER, audience: AUDIENCE })).toThrow();
  });
});
