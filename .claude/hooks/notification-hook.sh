#!/bin/bash
# Claude Code Notification 훅 - node.js로 Slack 알림 전송
node "$CLAUDE_PROJECT_DIR/.claude/hooks/slack-notify.js" "notification" 2>&1
