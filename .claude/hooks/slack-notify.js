const fs = require("fs");
const path = require("path");
const https = require("https");

const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const hookType = process.argv[2] || "notification";

// .env 파일 로드
const envPath = path.join(projectDir, ".env");
if (!fs.existsSync(envPath)) {
  process.stderr.write("오류: .env 파일을 찾을 수 없습니다\n");
  process.exit(1);
}
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split(/\r?\n/).forEach((line) => {
  const trimmed = line.trim();
  const match = trimmed.match(/^([A-Z_][A-Z_0-9]*)=(.*)$/);
  if (match) env[match[1]] = match[2].trim();
});

const token = env.SLACK_BOT_TOKEN;
const channel = env.SLACK_CHANNEL;
if (!token || !channel) {
  process.stderr.write("오류: SLACK_BOT_TOKEN 또는 SLACK_CHANNEL이 설정되지 않았습니다\n");
  process.exit(1);
}

// stdin에서 JSON 읽기
let input = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  let parsed = {};
  try {
    parsed = JSON.parse(input);
  } catch (e) {}

  const projectName = path.basename(projectDir);
  const now = new Date();
  const timestamp = now.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

  let text;
  if (hookType === "stop") {
    const reason = parsed.hook_event_name || "stop";
    text = [
      "\u2705 *\uc791\uc5c5 \uc644\ub8cc \uc54c\ub9bc*",
      "",
      `\u2022 \ud504\ub85c\uc81d\ud2b8: ${projectName}`,
      `\u2022 \uc0c1\ud0dc: ${reason}`,
      `\u2022 \uc2dc\uac04: ${timestamp}`,
      "",
      "Claude Code \uc791\uc5c5\uc774 \uc644\ub8cc\ub418\uc5c8\uc2b5\ub2c8\ub2e4.",
    ].join("\n");
  } else {
    const message = parsed.message || "\uc54c\ub9bc";
    text = [
      "\ud83d\udd14 *\uad8c\ud55c \uc694\uccad \uc54c\ub9bc*",
      "",
      `\u2022 \ud504\ub85c\uc81d\ud2b8: ${projectName}`,
      `\u2022 \uc0c1\ud0dc: ${message}`,
      `\u2022 \uc2dc\uac04: ${timestamp}`,
      "",
      "Claude Code\uc5d0\uc11c \uc54c\ub9bc\uc774 \ub3c4\ucc29\ud588\uc2b5\ub2c8\ub2e4.",
    ].join("\n");
  }

  const payload = JSON.stringify({ channel, text });

  const req = https.request(
    {
      hostname: "slack.com",
      path: "/api/chat.postMessage",
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(payload),
      },
    },
    (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          const result = JSON.parse(body);
          if (result.ok) {
            process.stderr.write("Slack 알림이 성공적으로 전송되었습니다.\n");
          } else {
            process.stderr.write(`Slack 알림 전송 실패: ${result.error}\n`);
            process.exit(1);
          }
        } catch (e) {
          process.stderr.write(`응답 파싱 실패: ${body}\n`);
          process.exit(1);
        }
      });
    }
  );
  req.on("error", (e) => {
    process.stderr.write(`요청 실패: ${e.message}\n`);
    process.exit(1);
  });
  req.write(payload);
  req.end();
});
