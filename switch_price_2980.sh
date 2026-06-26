#!/bin/bash
# SSS LP 月額 1,980円 → 2,980円 切替（6/1 0:00 launchd発火・1回限り）
# 旧決済 univa.cc/gZksKf → 新決済 univa.cc/SlJd_Q、期間限定BOX撤去
set -uo pipefail
REPO="/Users/test/projects/sss-lp"
PERL=/usr/bin/perl
cd "$REPO" || exit 1
TS=$(date +%Y%m%d_%H%M%S)
LOG="$REPO/price_switch_${TS}.log"
exec > "$LOG" 2>&1
echo "=== SSS price switch start $(date) ==="

MODE="${1:-deploy}"   # deploy | test
TARGET_DIR="$REPO"
if [ "$MODE" = "test" ]; then
  TARGET_DIR="$REPO/_pricetest"
  rm -rf "$TARGET_DIR"; mkdir -p "$TARGET_DIR"
  cp index.html tokushoho.html "$TARGET_DIR"/
fi

# 6/1 より前は実デプロイしない安全弁（テストは除外）
if [ "$MODE" = "deploy" ]; then
  TODAY=$(date +%Y%m%d)
  if [ "$TODAY" -lt 20260601 ]; then echo "before 2026-06-01, abort"; exit 0; fi
  git fetch origin -q && git reset --hard origin/main
fi

transform() {
  local F="$1"
  # 期間限定BOX① (ヒーロー・赤グラデ)
  $PERL -0777 -i -pe 's{\s*<div style="margin-top:20px;display:inline-block;background:linear-gradient\(135deg,#c62828,#ad1457\);[^>]*>.*?</div>\s*</div>}{}s' "$F"
  # 期間限定BOX② (料金欄・白背景赤枠)
  $PERL -0777 -i -pe 's{\s*<div style="margin:8px auto 20px;max-width:560px;background:#fff5f5;border:2px solid #c62828;[^>]*>.*?</div>\s*</div>}{}s' "$F"
  # 価格表記
  $PERL -i -pe 's/月額1,980円/月額2,980円/g; s/月1,980円/月2,980円/g; s/¥1,980/¥2,980/g; s/1,980円/2,980円/g;' "$F"
  # 決済リンク差替
  $PERL -i -pe 's{univa\.cc/gZksKf}{univa.cc/SlJd_Q}g;' "$F"
}

transform "$TARGET_DIR/index.html"
transform "$TARGET_DIR/tokushoho.html"

echo "--- 残存1,980チェック(0であるべき) ---"
grep -c "1,980" "$TARGET_DIR/index.html" "$TARGET_DIR/tokushoho.html"
echo "--- 2,980件数 ---"
grep -c "2,980" "$TARGET_DIR/index.html" "$TARGET_DIR/tokushoho.html"
echo "--- 旧リンク残存(0であるべき) / 新リンク件数 ---"
grep -c "gZksKf" "$TARGET_DIR/index.html"; grep -c "SlJd_Q" "$TARGET_DIR/index.html"

if [ "$MODE" = "test" ]; then echo "=== TEST done (no commit) ==="; exit 0; fi

git add index.html tokushoho.html
git commit -m "LP: 6/1 月額2,980円へ切替（決済リンクSlJd_Qへ差替・期間限定BOX撤去）

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
git push origin main
echo "=== push done $(date) ==="

# 1回限り：自分自身を停止・削除
launchctl unload "$HOME/Library/LaunchAgents/com.sss.price-switch.plist" 2>/dev/null || true
rm -f "$HOME/Library/LaunchAgents/com.sss.price-switch.plist"
echo "=== launchd job removed (one-shot) ==="
