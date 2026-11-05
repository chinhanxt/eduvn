# server/ — EDU-CORE

**Mục tiêu:** lõi duy nhất giữ danh tính, tổ chức, quyền và nghiệp vụ; phục vụ REST (web, Zalo) và MCP (AI chat).

| Đầu vào | Đầu ra |
|---|---|
| HTTP + Bearer token Keycloak; JSON câu hỏi, ma trận, bài làm | JSON; `.docx` đề/đáp án qua `/dl/:token`; MCP tools tại `/mcp` |

```
src/
├── domain/   question, matrix, variants, scoring, rng, authz (thuần)
├── db/       schema Drizzle, client, repo
├── auth/     verify JWT, resolve Actor, download signer
├── export/   docx
├── mcp/      MCP server + tools
├── http/     Fastify app (REST, MCP route, /dl)
├── service.ts · config.ts · main.ts
tests/        đối xứng src/, helpers/ (PGlite, token giả)
drizzle/      migration sinh bởi drizzle-kit
```
Plan: `docs/superpowers/plans/2026-11-05-p1-core-question-bank-mcp.md`.
