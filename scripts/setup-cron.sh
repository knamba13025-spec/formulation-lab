#!/bin/bash
# cron設定スクリプト
# 毎朝7時に記事を自動生成してデプロイする

SCRIPT_PATH="/Users/nanbakeiichi/formulation-lab/scripts/generate-articles.mjs"
LOG_PATH="/Users/nanbakeiichi/formulation-lab/scripts/generate.log"
NODE_PATH=$(which node)

CRON_JOB="0 7 * * * ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY GITHUB_TOKEN=$GITHUB_TOKEN $NODE_PATH $SCRIPT_PATH >> $LOG_PATH 2>&1"

# 既存のcronに追加（重複チェック）
(crontab -l 2>/dev/null | grep -v "generate-articles"; echo "$CRON_JOB") | crontab -

echo "✅ cronジョブを設定しました"
echo "   毎朝7時に自動実行されます"
echo ""
echo "確認コマンド: crontab -l"
echo "ログ確認: tail -f $LOG_PATH"
