#!/usr/bin/env node
/**
 * YHAI Slack 리스너 - 이벤트 기반 자동 실행
 *
 * Slack 채널의 봇 메시지 스레드에 사용자가 답글을 달면
 * Claude Code를 headless 모드로 실행하여 해당 작업을 자동 처리합니다.
 *
 * 특징:
 * - Claude 토큰 소비 0 (Node.js가 직접 Slack API 폴링)
 * - 사용자 답글 감지 시에만 Claude Code spawn
 * - 처리 완료된 답글 중복 실행 방지
 *
 * Usage: node scripts/slack-listener.js
 *        pm2 start scripts/slack-listener.js --name slack-listener
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
  channelId: process.env.SLACK_CHANNEL || "C0AHUT40AE5",
  botUserId: process.env.SLACK_BOT_USER_ID || "U0AKQN38QBH",
  targetUserId: process.env.SLACK_TARGET_USER_ID || "U0A9RNVL1FV",
  pollInterval: 30_000, // 30초 (Slack API 호출만, Claude 토큰 0)
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
  // 최근 200개만 유지
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

  // 승인 계열
  if (/승인|확인|진행|ㅇㅋ|ok|approve|lgtm|go/i.test(lower)) {
    return "approve";
  }

  // 이메일 전송 요청
  if (/이메일|email|메일로\s*보내|mail/i.test(lower)) {
    return "email";
  }

  // 기타 구체적 지시
  return "instruction";
}

// ── Claude Code 실행 ───────────────────────────────────────
function runClaudeCode(prompt) {
  console.log(`[${new Date().toISOString()}] Claude Code 실행: ${prompt.slice(0, 80)}...`);

  // 프롬프트를 임시 파일에 저장 (shell 인자 전달 시 한글/특수문자 손상 방지)
  const promptFile = path.join(CONFIG.projectDir, `.claude-prompt-${Date.now()}.txt`);
  fs.writeFileSync(promptFile, prompt, "utf-8");

  const child = spawn(
    "claude",
    [
      "-p",
      "--allowedTools",
      "Read,Edit,Write,Bash,Glob,Grep,Agent,Skill,mcp__slack__slack_post_message,mcp__slack__slack_reply_to_thread",
      "--output-format",
      "text",
    ],
    {
      cwd: CONFIG.projectDir,
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, CLAUDECODE: "" },
      windowsHide: true, // Windows에서 콘솔창 숨김
    }
  );

  // stdin으로 프롬프트 전달 후 닫기
  child.stdin.write(fs.readFileSync(promptFile, "utf-8"));
  child.stdin.end();

  // 임시 파일 정리
  setTimeout(() => {
    try { fs.unlinkSync(promptFile); } catch {}
  }, 5000);

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (data) => {
    stdout += data.toString();
  });

  child.stderr.on("data", (data) => {
    stderr += data.toString();
  });

  child.on("close", (code) => {
    console.log(`[${new Date().toISOString()}] Claude Code 완료 (exit: ${code})`);
    if (stdout) console.log("stdout:", stdout.slice(0, 500));
    if (stderr && code !== 0) console.error("stderr:", stderr.slice(0, 500));
  });

  child.on("error", (err) => {
    console.error(`[${new Date().toISOString()}] Claude Code 실행 오류:`, err.message);
  });
}

// ── 답글에 대한 프롬프트 생성 ──────────────────────────────
function buildPrompt(type, replyText, parentText) {
  const parentSummary = parentText.slice(0, 300);

  switch (type) {
    case "approve":
      return `Slack 스레드에서 사용자가 "${replyText}"라고 승인했습니다.

원본 봇 메시지 요약: ${parentSummary}

team-leader 에이전트를 호출하여 다음 단계를 즉시 진행해주세요.
승인된 내용을 기반으로 다음 Plan 또는 작업을 실행하고,
결과를 Slack 채널 ${CONFIG.channelId}에 보고해주세요.`;

    case "email":
      return `Slack 스레드에서 사용자가 "${replyText}"라고 요청했습니다.

원본 봇 메시지 요약: ${parentSummary}

team-leader 에이전트를 호출하여 해당 보고 내용을 HTML 이메일로 yhk71261@gmail.com에 전송해주세요.
이메일에는 승인 요청을 포함하지 마세요 (보고서만).
scripts/send-email.js를 사용하세요.`;

    case "instruction":
    default:
      return `Slack 스레드에서 사용자가 다음과 같이 지시했습니다: "${replyText}"

원본 봇 메시지 요약: ${parentSummary}

team-leader 에이전트를 호출하여 사용자의 지시를 즉시 실행해주세요.
결과를 Slack 채널 ${CONFIG.channelId}에 보고해주세요.`;
  }
}

// ── Gate Review 메시지 감지 ────────────────────────────────
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

// ── @멘션 감지 ─────────────────────────────────────────────
function isBotMentioned(text) {
  // <@U0AKQN38QBH> 형태로 멘션됨
  return text.includes(`<@${CONFIG.botUserId}>`);
}

function stripMention(text) {
  // @멘션 태그 제거 후 실제 명령만 추출
  return text.replace(new RegExp(`<@${CONFIG.botUserId}>`, "g"), "").trim();
}

// ── @멘션 프롬프트 생성 ────────────────────────────────────
function buildMentionPrompt(commandText, threadTs) {
  const replyInstruction = threadTs
    ? `결과를 Slack 채널 ${CONFIG.channelId}의 스레드 ${threadTs}에 답글로 보고해주세요. mcp__slack__slack_reply_to_thread 도구를 사용하세요.`
    : `결과를 Slack 채널 ${CONFIG.channelId}에 메시지로 보고해주세요. mcp__slack__slack_post_message 도구를 사용하세요.`;

  return `사용자가 Slack에서 @멘션으로 다음과 같이 지시했습니다: "${commandText}"

프로젝트 디렉토리: ${CONFIG.projectDir}
이 프로젝트의 CLAUDE.md와 docs/planning/ 디렉토리를 참고하여 작업하세요.

${replyInstruction}`;
}

// ── 메인 폴링 루프 ────────────────────────────────────────
async function poll() {
  const state = loadState();

  try {
    // 1. 채널 최근 메시지 가져오기
    const history = await slack.conversations.history({
      channel: CONFIG.channelId,
      limit: 15,
    });

    if (!history.ok || !history.messages) return;

    // ── Mode A: @멘션 메시지 감지 ──────────────────────────
    const mentionMessages = history.messages.filter(
      (m) =>
        m.user === CONFIG.targetUserId &&
        isBotMentioned(m.text || "") &&
        !isProcessed(state, m.ts)
    );

    for (const msg of mentionMessages) {
      const command = stripMention(msg.text || "");
      if (!command) continue;

      console.log(
        `[${new Date().toISOString()}] @멘션 감지!`,
        `text="${command.slice(0, 50)}"`
      );

      const prompt = buildMentionPrompt(command, msg.thread_ts || msg.ts);
      runClaudeCode(prompt);
      markProcessed(state, msg.ts);
    }

    // ── Mode B: 봇 메시지 스레드 답글 감지 ─────────────────
    const botMessages = history.messages.filter(
      (m) =>
        m.user === CONFIG.botUserId &&
        isGateReviewOrReport(m.text || "") &&
        m.reply_count > 0
    );

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
            `[${new Date().toISOString()}] 스레드 답글 감지!`,
            `type=${type}`,
            `text="${(reply.text || "").slice(0, 50)}"`
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
║  YHAI Slack Listener Started                  ║
║  Channel: ${CONFIG.channelId}                    ║
║  Poll interval: ${CONFIG.pollInterval / 1000}s (Claude 토큰 소비 0)   ║
║  Target user: ${CONFIG.targetUserId}                ║
║  Bot user: ${CONFIG.botUserId}                   ║
╚═══════════════════════════════════════════════╝
`);

// 즉시 첫 폴링 실행
poll();

// 이후 주기적 폴링
setInterval(poll, CONFIG.pollInterval);

// 종료 시그널 처리
process.on("SIGINT", () => {
  console.log("\nSlack Listener 종료.");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nSlack Listener 종료.");
  process.exit(0);
});
