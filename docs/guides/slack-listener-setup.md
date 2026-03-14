# Slack 리스너 설정 가이드

Slack 채널의 봇 메시지 스레드에 사용자가 답글을 달면 Claude Code를 자동 실행하는 이벤트 기반 시스템.

## 개요

| 항목 | 설명 |
|------|------|
| **방식** | Node.js가 Slack Web API를 30초 간격으로 직접 폴링 |
| **Claude 토큰 소비** | 0 (사용자 답글 감지 시에만 `claude -p` spawn) |
| **상주 방식** | PM2 데몬 (PC 재시작 전까지 영구 실행) |
| **답글 분류** | 승인 / 이메일 전송 / 기타 지시 → 자동 분류 후 실행 |

## 사전 요구사항

- Node.js 18+
- Slack Bot Token (`xoxb-...`) — Slack App에서 발급
- Slack 채널 ID, 봇 User ID, 대상 사용자 User ID
- Claude Code CLI가 PATH에 등록되어 있을 것

## 1. 패키지 설치

```bash
npm install @slack/web-api
```

## 2. 환경변수 설정 (.env)

프로젝트 루트에 `.env` 파일을 생성/수정:

```env
## Slack API 설정
SLACK_BOT_TOKEN=xoxb-YOUR-BOT-TOKEN
SLACK_CHANNEL=C0AHUT40AE5
SLACK_BOT_USER_ID=U0AKQN38QBH
SLACK_TARGET_USER_ID=U0A9RNVL1FV
```

| 변수 | 설명 | 확인 방법 |
|------|------|----------|
| `SLACK_BOT_TOKEN` | Bot User OAuth Token | Slack App > OAuth & Permissions |
| `SLACK_CHANNEL` | 감시할 채널 ID | Slack 채널 우클릭 > 채널 세부정보 > 하단 ID |
| `SLACK_BOT_USER_ID` | 봇의 User ID | Slack에서 봇 프로필 클릭 > Member ID |
| `SLACK_TARGET_USER_ID` | 답글을 감지할 사용자 ID | Slack에서 사용자 프로필 클릭 > Member ID |

## 3. 리스너 스크립트 생성

`scripts/slack-listener.js` 파일 생성:

```javascript
#!/usr/bin/env node
/**
 * Slack 리스너 - 이벤트 기반 자동 실행
 *
 * 봇 메시지 스레드에 사용자 답글 감지 시 Claude Code headless 실행.
 * Claude 토큰 소비 0 (Node.js가 직접 Slack API 폴링).
 */

const { WebClient } = require("@slack/web-api");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// ── .env 파싱 ──────────────────────────────────────────────
function loadEnv() {
  const envPath = path.resolve(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) {
    console.error("Error: .env file not found at", envPath);
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnv();

// ── 설정 ───────────────────────────────────────────────────
const CONFIG = {
  botToken: process.env.SLACK_BOT_TOKEN,
  channelId: process.env.SLACK_CHANNEL,
  botUserId: process.env.SLACK_BOT_USER_ID,
  targetUserId: process.env.SLACK_TARGET_USER_ID,
  pollInterval: 30_000, // 30초
  projectDir: path.resolve(__dirname, ".."),
  stateFile: path.resolve(__dirname, "..", ".slack-listener-state.json"),
};

if (!CONFIG.botToken) {
  console.error("Error: SLACK_BOT_TOKEN is required in .env");
  process.exit(1);
}

const slack = new WebClient(CONFIG.botToken);

// ── 처리 상태 관리 (중복 실행 방지) ────────────────────────
function loadState() {
  try {
    if (fs.existsSync(CONFIG.stateFile)) {
      return JSON.parse(fs.readFileSync(CONFIG.stateFile, "utf-8"));
    }
  } catch {
    // ignore
  }
  return { processedReplies: [], lastCheck: null };
}

function saveState(state) {
  if (state.processedReplies.length > 200) {
    state.processedReplies = state.processedReplies.slice(-200);
  }
  fs.writeFileSync(CONFIG.stateFile, JSON.stringify(state, null, 2));
}

function isProcessed(state, ts) {
  return state.processedReplies.includes(ts);
}

function markProcessed(state, ts) {
  state.processedReplies.push(ts);
  saveState(state);
}

// ── 답글 분류 ──────────────────────────────────────────────
function classifyReply(text) {
  const lower = text.toLowerCase();
  if (/승인|확인|진행|ㅇㅋ|ok|approve|lgtm|go/i.test(lower)) return "approve";
  if (/이메일|email|메일로\s*보내|mail/i.test(lower)) return "email";
  return "instruction";
}

// ── Claude Code 실행 ───────────────────────────────────────
function runClaudeCode(prompt) {
  console.log(`[${new Date().toISOString()}] Claude Code 실행: ${prompt.slice(0, 80)}...`);

  const child = spawn(
    "claude",
    [
      "-p",
      prompt,
      "--allowedTools",
      "Read,Edit,Write,Bash,Glob,Grep,Agent,Skill,mcp__slack__slack_post_message,mcp__slack__slack_reply_to_thread",
    ],
    {
      cwd: CONFIG.projectDir,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, CLAUDECODE: "" }, // 중첩 실행 방지 해제
    }
  );

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (data) => { stdout += data.toString(); });
  child.stderr.on("data", (data) => { stderr += data.toString(); });

  child.on("close", (code) => {
    console.log(`[${new Date().toISOString()}] Claude Code 완료 (exit: ${code})`);
    if (stdout) console.log("stdout:", stdout.slice(0, 500));
    if (stderr && code !== 0) console.error("stderr:", stderr.slice(0, 500));
  });

  child.on("error", (err) => {
    console.error(`[${new Date().toISOString()}] Claude Code 실행 오류:`, err.message);
  });
}

// ── 프롬프트 생성 ──────────────────────────────────────────
function buildPrompt(type, replyText, parentText) {
  const parentSummary = parentText.slice(0, 300);
  const channelId = CONFIG.channelId;

  switch (type) {
    case "approve":
      return `Slack 스레드에서 사용자가 "${replyText}"라고 승인했습니다.\n\n원본 봇 메시지 요약: ${parentSummary}\n\nteam-leader 에이전트를 호출하여 다음 단계를 즉시 진행해주세요.\n결과를 Slack 채널 ${channelId}에 보고해주세요.`;
    case "email":
      return `Slack 스레드에서 사용자가 "${replyText}"라고 요청했습니다.\n\n원본 봇 메시지 요약: ${parentSummary}\n\nteam-leader 에이전트를 호출하여 해당 보고 내용을 HTML 이메일로 yhk71261@gmail.com에 전송해주세요.\n이메일에는 승인 요청을 포함하지 마세요 (보고서만).\nscripts/send-email.js를 사용하세요.`;
    case "instruction":
    default:
      return `Slack 스레드에서 사용자가 다음과 같이 지시했습니다: "${replyText}"\n\n원본 봇 메시지 요약: ${parentSummary}\n\nteam-leader 에이전트를 호출하여 사용자의 지시를 즉시 실행해주세요.\n결과를 Slack 채널 ${channelId}에 보고해주세요.`;
  }
}

// ── 봇 메시지 필터 ─────────────────────────────────────────
function isGateReviewOrReport(text) {
  return (
    text.includes("[Gate Review]") ||
    text.includes("기획 완료") ||
    text.includes("Plan ") ||
    text.includes("완료 보고") ||
    text.includes("리뷰 요청") ||
    text.includes("산출물")
  );
}

// ── 메인 폴링 루프 ────────────────────────────────────────
async function poll() {
  const state = loadState();

  try {
    const history = await slack.conversations.history({
      channel: CONFIG.channelId,
      limit: 15,
    });
    if (!history.ok || !history.messages) return;

    const botMessages = history.messages.filter(
      (m) =>
        m.user === CONFIG.botUserId &&
        isGateReviewOrReport(m.text || "") &&
        m.reply_count > 0
    );
    if (botMessages.length === 0) return;

    for (const botMsg of botMessages) {
      try {
        const replies = await slack.conversations.replies({
          channel: CONFIG.channelId,
          ts: botMsg.ts,
        });
        if (!replies.ok || !replies.messages) continue;

        const userReplies = replies.messages.filter(
          (r) =>
            r.user === CONFIG.targetUserId &&
            r.ts !== botMsg.ts &&
            !isProcessed(state, r.ts)
        );

        for (const reply of userReplies) {
          const type = classifyReply(reply.text || "");
          const prompt = buildPrompt(type, reply.text, botMsg.text || "");
          console.log(
            `[${new Date().toISOString()}] 사용자 답글 감지! type=${type} text="${(reply.text || "").slice(0, 50)}"`
          );
          runClaudeCode(prompt);
          markProcessed(state, reply.ts);
        }
      } catch (threadErr) {
        console.error(`Thread error (${botMsg.ts}):`, threadErr.message);
      }
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Poll error:`, err.message);
    if (err.data?.error === "ratelimited") {
      const retryAfter = (err.headers?.["retry-after"] || 60) * 1000;
      console.log(`Rate limited. Waiting ${retryAfter / 1000}s...`);
      await new Promise((r) => setTimeout(r, retryAfter));
    }
  }

  state.lastCheck = new Date().toISOString();
  saveState(state);
}

// ── 시작 ───────────────────────────────────────────────────
console.log(`
╔═══════════════════════════════════════════════╗
║  Slack Listener Started                       ║
║  Channel: ${CONFIG.channelId}                    ║
║  Poll interval: ${CONFIG.pollInterval / 1000}s (Claude 토큰 소비 0)   ║
║  Target user: ${CONFIG.targetUserId}                ║
║  Bot user: ${CONFIG.botUserId}                   ║
╚═══════════════════════════════════════════════╝
`);

poll();
setInterval(poll, CONFIG.pollInterval);

process.on("SIGINT", () => { console.log("\nSlack Listener 종료."); process.exit(0); });
process.on("SIGTERM", () => { console.log("\nSlack Listener 종료."); process.exit(0); });
```

## 4. PM2 설정

`ecosystem.config.js` 파일을 프로젝트 루트에 생성:

```javascript
module.exports = {
  apps: [
    {
      name: "slack-listener",
      script: "scripts/slack-listener.js",
      cwd: __dirname,
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: "production",
      },
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "logs/slack-listener-error.log",
      out_file: "logs/slack-listener-out.log",
      merge_logs: true,
    },
  ],
};
```

## 5. .gitignore 추가

```gitignore
# Slack listener state
.slack-listener-state.json

# PM2 logs
/logs
```

## 6. 실행

```bash
# logs 디렉토리 생성
mkdir -p logs

# PM2로 백그라운드 실행
npx pm2 start ecosystem.config.js

# 상태 확인
npx pm2 status

# 실시간 로그 확인
npx pm2 logs

# 재시작
npx pm2 restart slack-listener

# 중지
npx pm2 stop slack-listener

# 삭제
npx pm2 delete slack-listener
```

## 동작 흐름

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [30초마다]                                                  │
│  Node.js → Slack API (conversations.history)                │
│         → 봇 메시지 중 reply_count > 0 필터                  │
│         → Slack API (conversations.replies)                  │
│         → 사용자(TARGET_USER_ID) 답글만 필터                  │
│         → 미처리 답글 발견 시:                                │
│                                                             │
│  ┌─────────────┐                                            │
│  │ 답글 분류    │                                            │
│  ├─────────────┤                                            │
│  │ "승인" 계열  │──▶ claude -p "승인 처리 + 다음 단계 진행"   │
│  │ "이메일" 계열│──▶ claude -p "이메일 전송 (보고서만)"       │
│  │ 기타 지시    │──▶ claude -p "해당 지시 즉시 실행"          │
│  └─────────────┘                                            │
│                                                             │
│  처리 완료 → .slack-listener-state.json에 기록 (중복 방지)   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 답글 분류 규칙

| 분류 | 매칭 키워드 | Claude Code 동작 |
|------|------------|-----------------|
| **승인** | 승인, 확인, 진행, ok, approve, lgtm, go | team-leader 에이전트 → 다음 단계 진행 |
| **이메일** | 이메일, email, 메일로 보내, mail | team-leader 에이전트 → HTML 이메일 전송 |
| **기타** | 위에 해당하지 않는 모든 텍스트 | team-leader 에이전트 → 지시 내용 그대로 실행 |

## 봇 메시지 감지 조건

봇 메시지 중 아래 키워드가 포함된 메시지의 스레드만 감시:

- `[Gate Review]`
- `기획 완료`
- `Plan `
- `완료 보고`
- `리뷰 요청`
- `산출물`

## 커스터마이징

### 폴링 간격 변경

`scripts/slack-listener.js`의 `CONFIG.pollInterval` 수정:

```javascript
pollInterval: 30_000,  // 30초 (기본값)
pollInterval: 10_000,  // 10초 (더 빠른 응답)
pollInterval: 60_000,  // 60초 (API 호출 절약)
```

### 봇 메시지 감지 조건 추가

`isGateReviewOrReport()` 함수에 키워드 추가:

```javascript
function isGateReviewOrReport(text) {
  return (
    text.includes("[Gate Review]") ||
    text.includes("YOUR_KEYWORD") ||  // 추가
    // ...
  );
}
```

### 답글 분류 규칙 추가

`classifyReply()` 함수에 패턴 추가:

```javascript
function classifyReply(text) {
  if (/YOUR_PATTERN/i.test(text)) return "your_type";
  // ...
}
```

### Claude Code 허용 도구 변경

`runClaudeCode()` 함수의 `--allowedTools` 수정:

```javascript
spawn("claude", [
  "-p", prompt,
  "--allowedTools", "Read,Edit,Write,Bash,Glob,Grep,Agent,Skill,YOUR_TOOLS",
], ...);
```

## 트러블슈팅

| 증상 | 원인 | 해결 |
|------|------|------|
| `Error: SLACK_BOT_TOKEN is required` | .env 파일 없거나 토큰 미설정 | .env 파일 확인 |
| `not_in_channel` 에러 | 봇이 채널에 참여하지 않음 | Slack에서 봇을 채널에 초대 |
| `ratelimited` 에러 | Slack API 호출 한도 초과 | 자동 대기 후 재시도 (스크립트 내장) |
| Claude Code 실행 안 됨 | claude CLI가 PATH에 없음 | `which claude`로 확인, PATH 등록 |
| PM2 재시작 반복 | 스크립트 에러 | `npx pm2 logs`로 에러 확인 |

## Socket Mode 업그레이드 (향후)

현재는 HTTP 폴링 방식이지만, 더 즉각적인 응답이 필요하면 Slack Socket Mode로 업그레이드 가능:

1. Slack App 콘솔 > Settings > Socket Mode 활성화
2. App-Level Token 발급 (scope: `connections:write`)
3. `npm install @slack/bolt`
4. Bolt 기반 WebSocket 리스너로 교체

Socket Mode는 서버/도메인/ngrok 없이 WebSocket으로 이벤트를 즉시 수신하므로 폴링 자체가 불필요해집니다.
