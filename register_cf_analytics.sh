#!/usr/bin/env bash
# aisalonsss.com を Cloudflare Web Analytics に「手動設置サイト」として登録し、
# HTMLに入れる site_token を表示する（L-20260730-07 A-1案）。
#
# なぜAPIか: aisalonsss.com は Cloudflare のゾーンではない（DNS=dnsv.jp / 配信=GitHub Pages）ため、
# ダッシュボードの「サイトを追加」には出てこない。APIなら auto_install:false で登録できる。
#
# 必要な権限: アカウント > Web Analytics（または Account Analytics）: 編集
# トークンの場所: ~/.secrets/cloudflare_analytics_token.txt（無ければ cloudflare.env にフォールバック）
#
# 使い方: bash register_cf_analytics.sh
set -euo pipefail

A=4039d1530c364e4234be57a004584932
HOST=aisalonsss.com
API="https://api.cloudflare.com/client/v4/accounts/$A/rum/site_info"

TOKEN_FILE="$HOME/.secrets/cloudflare_analytics_token.txt"
[ -f "$TOKEN_FILE" ] || TOKEN_FILE="$HOME/.secrets/cloudflare.env"
T="$(grep -E '^CLOUDFLARE_API_TOKEN=' "$TOKEN_FILE" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r\n ')"
[ -n "$T" ] || T="$(tr -d '\r\n ' < "$TOKEN_FILE")"
[ -n "$T" ] || { echo "トークンが読めない: $TOKEN_FILE"; exit 1; }
echo "使うトークン: $TOKEN_FILE"

# 既に登録済みなら作らずトークンだけ出す
FOUND="$(curl -s "$API/list" -H "Authorization: Bearer $T" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if not d.get('success'):
    print('ERR:' + json.dumps(d.get('errors'), ensure_ascii=False)); raise SystemExit
for s in d.get('result') or []:
    rs = s.get('ruleset') or {}
    if 'aisalonsss' in (rs.get('zone_name') or '') or 'aisalonsss' in (s.get('host') or ''):
        print(s.get('site_tag', '')); break
")"

case "$FOUND" in
  ERR:*) echo "一覧が読めない: ${FOUND#ERR:}"; exit 1 ;;
esac

if [ -n "$FOUND" ]; then
  echo "既に登録済み（site_tag=$FOUND）。site_token を取り直す。"
  RES="$(curl -sS "$API/$FOUND" -H "Authorization: Bearer $T")"
else
  echo "手動設置サイトとして新規登録する（host=${HOST}）"
  RES="$(curl -sS -X POST "$API" -H "Authorization: Bearer $T" -H "Content-Type: application/json" \
    -d "{\"host\":\"$HOST\",\"auto_install\":false}")"
fi

echo "$RES" | python3 -c "
import sys, json
d = json.load(sys.stdin)
if not d.get('success'):
    print('NG:', json.dumps(d.get('errors'), ensure_ascii=False)); sys.exit(1)
r = d['result']
print()
print('site_tag  =', r.get('site_tag'))
print('site_token=', r.get('site_token'))
print()
print('次: bash add_cf_beacon.sh', r.get('site_token'))
"
