#!/bin/bash
# GitHub Pages 인증서가 나오면 HTTPS 강제 켜고 맥 알림 (최대 24시간)
for i in $(seq 1 288); do
  r=$(/usr/local/bin/gh api -X PUT repos/wjjjj29-spec/nunchi/pages -F https_enforced=true --jq '.https_enforced' 2>/dev/null)
  if [ "$r" = "true" ]; then
    echo "HTTPS enforced at $(date)" >> /Users/wonjoon/원준프로젝트/nunchi/https.log
    osascript -e 'display notification "hellonunchi.com HTTPS가 켜졌습니다. Claude에게 Airalo 인증을 요청하세요" with title "Nunchi" sound name "Glass"'
    exit 0
  fi
  sleep 300
done
echo "still pending after 24h $(date)" >> /Users/wonjoon/원준프로젝트/nunchi/https.log
