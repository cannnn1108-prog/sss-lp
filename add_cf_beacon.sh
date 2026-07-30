#!/usr/bin/env bash
# SSS LP の全ページに Cloudflare Web Analytics のビーコンを1行入れる（L-20260730-07 A案）
#
# 使い方: bash add_cf_beacon.sh <site_token>
#   site_token は Cloudflare ダッシュボード → Web Analytics → aisalonsss.com の
#   JSスニペットに入っている data-cf-beacon の token 文字列。
#   ※このトークンは公開HTMLに載る前提のもので、秘密ではない。
#
# 冪等：既に入っているページはスキップする。挿入位置は </head> の直前。
set -euo pipefail
cd "$(dirname "$0")"

TOKEN="${1:-}"
if [ -z "$TOKEN" ]; then echo "使い方: bash add_cf_beacon.sh <site_token>"; exit 1; fi

PAGES=(index.html contact.html privacy.html tokushoho.html cancel.html)
SNIPPET="<!-- Cloudflare Web Analytics -->
<script defer src=\"https://static.cloudflareinsights.com/beacon.min.js\" data-cf-beacon='{\"token\": \"${TOKEN}\"}'></script>"

for f in "${PAGES[@]}"; do
  if [ ! -f "$f" ]; then echo "  skip（無い） $f"; continue; fi
  if grep -q "cloudflareinsights" "$f"; then echo "  skip（既にある） $f"; continue; fi
  if ! grep -q "</head>" "$f"; then echo "  ⚠️ </head> が無い $f"; continue; fi
  TOKEN="$TOKEN" SNIPPET="$SNIPPET" python3 - "$f" <<'PY'
import os, sys
path = sys.argv[1]
src = open(path, encoding='utf-8').read()
snippet = os.environ['SNIPPET']
i = src.rindex('</head>')
open(path, 'w', encoding='utf-8').write(src[:i] + snippet + '\n' + src[i:])
print('  入れた', path)
PY
done

echo
echo "確認:"
for f in "${PAGES[@]}"; do [ -f "$f" ] && printf "  %-16s beacon=%s\n" "$f" "$(grep -c cloudflareinsights "$f")"; done
