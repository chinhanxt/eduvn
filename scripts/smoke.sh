#!/usr/bin/env bash
# Chạy thật: Keycloak cấp token → REST + MCP của server đang chạy.
set -euo pipefail
KC="${KC:-http://localhost:8180}"
API="${API:-http://localhost:4310}"
json() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const o=JSON.parse(s);console.log(eval("o"+process.argv[1]))})' "$1"; }

echo "== chờ Keycloak realm eduvn"
for _ in $(seq 1 60); do curl -fsS "$KC/realms/eduvn/.well-known/openid-configuration" >/dev/null 2>&1 && break; sleep 2; done

echo "== lấy token gv1"
TOKEN=$(curl -fsS -X POST "$KC/realms/eduvn/protocol/openid-connect/token" \
  -d grant_type=password -d client_id=eduvn-dev -d username=gv1 -d password=gv1-dev-pass -d scope=openid | json ".access_token")
H=(-H "authorization: Bearer $TOKEN" -H "content-type: application/json")

echo "== health"; curl -fsS "$API/health"; echo
echo "== thêm câu hỏi"
curl -fsS "${H[@]}" -X POST "$API/api/questions" -d '{"type":"mcq","subject":"Toán","grade":10,"topic":"Mệnh đề","level":"NB","stem":"Câu nào là mệnh đề?","options":["2 + 2 = 4","Bạn khỏe không?","Hãy đóng cửa!","x > 1"],"answer":0}' | json ".id"
echo "== tạo đề"
EXAM=$(curl -fsS "${H[@]}" -X POST "$API/api/exams" -d '{"title":"Smoke","variants":1,"matrix":{"subject":"Toán","grade":10,"cells":[{"topic":"Mệnh đề","level":"NB","type":"mcq","count":1}]}}' | json ".examId")
echo "$EXAM"
echo "== MCP tools/list"
curl -fsS "${H[@]}" -H "accept: application/json, text/event-stream" -X POST "$API/mcp" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | json ".result.tools.map(t=>t.name).join(', ')"
echo "== link Word"
curl -fsS "${H[@]}" -X POST "$API/api/exams/$EXAM/links" -d "{}" | json ".answerKey"
echo "SMOKE OK"
