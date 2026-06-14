#!/bin/bash
# cron設定スクリプト
# 毎朝7時に収益化監査と記事生成を実行する
set -e

SCRIPT_PATH="/Users/nanbakeiichi/formulation-lab/scripts/generate-articles.mjs"
AUDIT_PATH="/Users/nanbakeiichi/formulation-lab/scripts/daily-affiliate-audit.mjs"
LOG_PATH="/Users/nanbakeiichi/formulation-lab/scripts/generate.log"
AUDIT_LOG_PATH="/Users/nanbakeiichi/formulation-lab/scripts/affiliate-audit.log"
NODE_PATH=$(which node)
GITHUB_TOKEN_FILE="/Users/nanbakeiichi/.formulation-lab-token"

CRON_JOB="0 7 * * * ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY GITHUB_TOKEN=\$(cat $GITHUB_TOKEN_FILE 2>/dev/null) $NODE_PATH $SCRIPT_PATH >> $LOG_PATH 2>&1"
AUDIT_CRON_JOB="50 6 * * * $NODE_PATH $AUDIT_PATH >> $AUDIT_LOG_PATH 2>&1"

# 既存のcronに追加（重複チェック）
(crontab -l 2>/dev/null | grep -v "generate-articles" | grep -v "daily-affiliate-audit"; echo "$AUDIT_CRON_JOB"; echo "$CRON_JOB") | crontab -

echo "✅ cronジョブを設定しました"
echo "   毎朝6:50に収益化監査、7:00に記事生成を実行します"
echo ""
echo "確認コマンド: crontab -l"
echo "ログ確認: tail -f $LOG_PATH"
echo "監査ログ確認: tail -f $AUDIT_LOG_PATH"
