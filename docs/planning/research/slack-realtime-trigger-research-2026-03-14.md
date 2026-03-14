# Slack 실시간 이벤트 → 로컬 Claude Code 트리거 방식 조사 리포트

- 작성일: 2026-03-14
- 조사 목적: 현재 5분 주기 cron 폴링 방식을 대체하여, Slack 스레드 답글 발생 시 즉시 로컬의 Claude Code CLI를 실행하는 최적 아키텍처 탐색
- 조사자: 웹 검색 전문가 (Claude Code)

---

## 핵심 발견사항 (Executive Summary)

1. **Socket Mode (Bolt + Node.js)가 현재 환경에 가장 적합한 방식**이다. 이미 Slack Bot이 존재하고, Windows 로컬 환경에서 외부 서버 없이 WebSocket 기반으로 실시간 이벤트를 수신할 수 있다.
2. **Claude Code는 공식적으로 headless(-p) 모드를 지원**하며, `child_process.spawn()`으로 Node.js에서 직접 트리거 가능하다.
3. **Cloudflare Tunnel(무료, 영구 URL)**을 사용하면 Events API HTTP 방식도 외부 서버 없이 구현할 수 있다. ngrok은 무료 플랜에서 URL이 재시작마다 변경되는 단점이 있다.
4. n8n 자기 호스팅 방식은 로컬 스크립트 실행 기능이 있어 고려할 만하나, 추가 인프라 복잡도가 생긴다.
5. GitHub Actions + Self-hosted Runner, Vercel Serverless 등은 **로컬 Claude Code 실행**이라는 핵심 요구사항과 근본적으로 맞지 않는다.

---

## 상세 조사 결과

### 1. Slack Events API + Webhook (HTTP 방식)

#### 동작 원리
- Slack이 이벤트 발생 시 등록된 공개 HTTPS URL로 POST 요청 전송
- 로컬에 HTTP 서버를 띄우고, ngrok 또는 Cloudflare Tunnel로 외부에 노출

#### 구현 방법 (Cloudflare Tunnel 활용)

```
[Slack 이벤트] → [Cloudflare Tunnel] → [로컬 Express/HTTP 서버] → [child_process.spawn('claude', ['-p', ...])]
```

```bash
# 1. cloudflared 설치 (Windows)
# https://github.com/cloudflare/cloudflared/releases 에서 .exe 다운로드

# 2. Named Tunnel 생성 (영구 URL)
cloudflared tunnel login
cloudflared tunnel create yhai-slack-bot
cloudflared tunnel route dns yhai-slack-bot slack.yourdomain.com

# 3. 로컬 서버 실행 후 터널 연결
cloudflared tunnel run yhai-slack-bot
```

```javascript
// local-server.js (Express)
const express = require('express');
const { spawn } = require('child_process');
const app = express();
app.use(express.json());

app.post('/slack/events', (req, res) => {
  // Slack challenge 검증
  if (req.body.type === 'url_verification') {
    return res.json({ challenge: req.body.challenge });
  }

  const event = req.body.event;
  // 스레드 답글 감지: thread_ts가 있고 ts !== thread_ts 이면 답글
  if (event.type === 'message' && event.thread_ts && event.ts !== event.thread_ts) {
    const prompt = `Slack 스레드 답글 처리: ${event.text}`;
    const claude = spawn('claude', ['-p', prompt, '--allowedTools', 'Read,Edit,Bash'], {
      cwd: 'C:/PJ-Source/yhai',
      stdio: 'inherit'
    });
  }
  res.status(200).send();
});

app.listen(3000);
```

#### 평가
| 항목 | 내용 |
|------|------|
| 구현 난이도 | 중간 (Cloudflare Tunnel 초기 설정 필요) |
| 비용 | Cloudflare 무료 플랜으로 0원 (영구 고정 URL 제공) |
| 안정성 | 높음 (Cloudflare 글로벌 인프라) |
| 장점 | 프로덕션 수준 안정성, 고정 URL, Slack 권장 방식 |
| 단점 | Cloudflare 계정 + 도메인 필요, 터널 프로세스 상시 실행 |

---

### 2. Slack Socket Mode (WebSocket 방식) ★ 권장

#### 동작 원리
- Slack이 앱 레벨 WebSocket 연결 유지
- 앱이 Slack 서버에 **능동적으로 연결**하므로 공개 URL 불필요
- `app_mention`, `message` 이벤트를 WebSocket으로 실시간 수신

#### 요구사항
- Slack App에서 Socket Mode 활성화
- App-Level Token 발급 (scope: `connections:write`)
- 기존 Bot Token 그대로 활용 가능

#### 핵심 코드 구조 (Bolt for JavaScript)

```javascript
// slack-bot.js
const { App } = require('@slack/bolt');
const { spawn } = require('child_process');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,  // App-Level Token
  socketMode: true,  // Socket Mode 활성화
});

// 스레드 답글 이벤트 감지
app.event('message', async ({ event, client }) => {
  // thread_ts 존재 = 스레드 메시지
  // ts !== thread_ts = 원본 메시지가 아닌 답글
  if (event.thread_ts && event.ts !== event.thread_ts && !event.bot_id) {
    console.log(`스레드 답글 감지: ${event.text}`);

    // Claude Code headless 모드 실행
    triggerClaudeCode(event.text, event.thread_ts, event.channel);
  }
});

function triggerClaudeCode(userMessage, threadTs, channel) {
  const prompt = `
    Slack 채널: ${channel}
    스레드 ID: ${threadTs}
    사용자 메시지: ${userMessage}

    위 내용을 처리하고 결과를 반환하세요.
  `;

  const claude = spawn('claude', [
    '-p', prompt,
    '--allowedTools', 'Read,Edit,Bash,Write',
    '--output-format', 'json'
  ], {
    cwd: 'C:/PJ-Source/yhai',
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let output = '';
  claude.stdout.on('data', (data) => { output += data.toString(); });

  claude.on('close', async (code) => {
    if (code === 0) {
      const result = JSON.parse(output);
      // 결과를 Slack 스레드에 답글로 전송
      await app.client.chat.postMessage({
        channel: channel,
        thread_ts: threadTs,
        text: result.result
      });
    }
  });
}

(async () => {
  await app.start();
  console.log('YHAI Slack Bot (Socket Mode) 실행 중...');
})();
```

#### PM2로 Windows 백그라운드 서비스 등록

```bash
# PM2 설치
npm install -g pm2

# 봇 시작
pm2 start slack-bot.js --name "yhai-slack-bot"

# Windows 시작 시 자동 실행 (PowerShell 관리자 권한)
pm2 startup
pm2 save
```

#### 평가
| 항목 | 내용 |
|------|------|
| 구현 난이도 | 낮음 (Bolt SDK가 추상화, 공개 URL 불필요) |
| 비용 | 0원 (완전 무료) |
| 안정성 | 중간 (WebSocket 재연결 자동 처리, 최대 10개 연결) |
| 장점 | 외부 서버/도메인 불필요, 방화벽 뒤에서도 동작, 빠른 개발 |
| 단점 | Slack Marketplace 배포 불가, 프로세스 상시 실행 필요 |
| Windows 적합성 | 높음 (PM2로 서비스 등록 가능) |

---

### 3. Slack Bolt Framework (Socket Mode 통합)

Socket Mode 방식 2번의 구현체로, Bolt for JavaScript가 사실상 표준이다.

- `@slack/bolt` 패키지가 Socket Mode WebSocket 연결, 자동 재연결, 이벤트 라우팅을 모두 처리
- 별도 서버 프레임워크(Express 등) 없이도 동작
- Python 버전(`slack-bolt`)도 있어 언어 선택 가능

#### Bolt vs 순수 @slack/socket-mode 비교
| 항목 | Bolt | @slack/socket-mode |
|------|------|--------------------|
| 추상화 수준 | 높음 (권장) | 낮음 (세밀한 제어) |
| 설정 복잡도 | 낮음 | 중간 |
| 이벤트 필터링 | 내장 | 직접 구현 |
| 미들웨어 | 지원 | 미지원 |

---

### 4. GitHub Actions + Vercel Serverless

#### GitHub Actions Self-hosted Runner
- Self-hosted runner를 Windows 로컬에 설치하면 GitHub Actions 워크플로우가 **로컬 머신에서 실행** 가능
- Slack → GitHub Webhook → Actions 트리거 → Runner에서 `claude -p` 실행

```yaml
# .github/workflows/slack-trigger.yml
on:
  repository_dispatch:
    types: [slack-thread-reply]

jobs:
  claude-task:
    runs-on: self-hosted  # 로컬 머신에서 실행
    steps:
      - uses: actions/checkout@v4
      - name: Run Claude Code
        run: claude -p "${{ github.event.client_payload.message }}" --allowedTools "Read,Edit,Bash"
```

- **문제점**: Slack → GitHub로 이벤트를 전달하는 중간 서버가 별도로 필요. 완전한 솔루션이 아님.

#### Vercel Serverless
- Vercel Function이 Slack 이벤트를 수신하고 로컬 Claude Code를 트리거
- **근본적 문제**: Vercel은 클라우드 환경이므로 **로컬 Claude Code를 직접 실행할 수 없음**
- 로컬에 별도 수신 서버가 필요하여 결국 Socket Mode보다 복잡해짐

#### 평가
| 항목 | 내용 |
|------|------|
| 구현 난이도 | 높음 (여러 시스템 연동 필요) |
| 비용 | GitHub Actions 무료 티어 있으나 분기당 제한 |
| 로컬 Claude 트리거 | GitHub의 경우 가능, Vercel은 불가 |
| 현재 환경 적합성 | 낮음 (요구사항 대비 과도하게 복잡) |

---

### 5. n8n / Zapier 등 노코드 자동화

#### n8n (자기 호스팅)
- Slack Trigger 노드: Events API 기반, 스레드 답글(`message` + `thread_ts`) 감지 가능
- **Execute Command 노드**: 로컬 CLI 명령어 실행 지원 → `claude -p "..."` 직접 호출 가능
- Windows에서 n8n을 로컬 실행하면 로컬 Claude Code 트리거 가능

```
[Slack Trigger] → [Function 노드 (조건 필터링)] → [Execute Command: claude -p "..."]
```

- 단점: n8n 자체가 상시 실행되어야 하고, Slack Event 수신을 위해 결국 공개 URL(Cloudflare Tunnel 등)이 필요

#### Zapier / Make (구 Integromat)
- 클라우드 기반이므로 **로컬 Claude Code 직접 실행 불가**
- 로컬 서버에 Webhook을 보내는 방식으로 우회 가능하나 결국 Socket Mode와 동일한 로컬 수신 서버 필요
- 무료 플랜 제한, 월 과금 구조

#### 평가
| 항목 | 내용 |
|------|------|
| 구현 난이도 | n8n 중간, Zapier 낮음 |
| 비용 | n8n 자기 호스팅 무료, Zapier 월 $19.99~  |
| 로컬 Claude 트리거 | n8n은 가능, Zapier/Make는 불가 |
| 현재 환경 적합성 | n8n은 대안이 될 수 있으나 Socket Mode보다 복잡 |

---

## Claude Code Headless 트리거 방법 (공식 문서 확인)

Claude Code는 공식적으로 **Agent SDK headless 모드(-p 플래그)**를 지원한다. (이전에 "headless mode"라 불리던 기능)

```bash
# 기본 실행
claude -p "작업 내용" --allowedTools "Read,Edit,Bash"

# JSON 출력 (파싱 용이)
claude -p "작업 내용" --output-format json

# 특정 디렉토리에서 실행
claude -p "작업 내용" --allowedTools "Read,Edit,Bash"
# (Node.js에서 spawn 시 cwd 옵션으로 작업 디렉토리 지정)

# 세션 유지 (멀티턴)
SESSION_ID=$(claude -p "초기 작업" --output-format json | jq -r '.session_id')
claude -p "후속 작업" --resume "$SESSION_ID"
```

#### Node.js에서 Claude Code 트리거

```javascript
const { spawn } = require('child_process');

function runClaude(prompt, workingDir) {
  return new Promise((resolve, reject) => {
    const claude = spawn('claude', [
      '-p', prompt,
      '--allowedTools', 'Read,Edit,Bash,Write',
      '--output-format', 'json'
    ], {
      cwd: workingDir || 'C:/PJ-Source/yhai',
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true  // Windows에서 필요할 수 있음
    });

    let stdout = '';
    let stderr = '';

    claude.stdout.on('data', (data) => { stdout += data.toString(); });
    claude.stderr.on('data', (data) => { stderr += data.toString(); });

    claude.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(stdout));
        } catch {
          resolve({ result: stdout });
        }
      } else {
        reject(new Error(stderr));
      }
    });
  });
}
```

---

## 경쟁 방식 종합 비교표

| 방식 | 구현 난이도 | 비용 | 외부 서버 필요 | 로컬 Claude 트리거 | Windows 적합성 | 실시간성 | 권장도 |
|------|-----------|------|--------------|------------------|--------------|---------|--------|
| **Socket Mode + Bolt** | 낮음 | 무료 | 불필요 | 직접 가능 | 높음 | 즉시 | ★★★★★ |
| Events API + Cloudflare Tunnel | 중간 | 무료 | Tunnel로 대체 | 직접 가능 | 높음 | 즉시 | ★★★★ |
| Events API + ngrok | 중간 | 무료(URL 변동) / $10/월(고정) | Tunnel로 대체 | 직접 가능 | 높음 | 즉시 | ★★★ |
| n8n 자기 호스팅 | 중간 | 무료 | Tunnel 필요 | 가능 | 중간 | 즉시 | ★★★ |
| GitHub Actions + Self-hosted Runner | 높음 | 무료(제한) | 중간 서버 필요 | 가능 | 중간 | 수 초 지연 | ★★ |
| Vercel Serverless | 높음 | 무료(제한) | 필요 | 불가 | N/A | 즉시 | ★ |
| Zapier/Make | 낮음 | $19.99+/월 | 클라우드 | 불가 | N/A | 즉시 | ★ |
| 현재 방식 (5분 cron) | - | 무료 | 불필요 | 가능 | 높음 | 최대 5분 지연 | - |

---

## YHAI에 대한 시사점 및 권장 구현 방안

### 1순위 권장: Socket Mode + Bolt for JavaScript + PM2

현재 환경(Windows 11, 기존 Slack Bot 보유)에 가장 빠르고 저비용으로 구현 가능한 방식이다.

**구현 단계:**
1. Slack App 설정에서 Socket Mode 활성화
2. App-Level Token 발급 (scope: `connections:write`)
3. `npm install @slack/bolt` 설치
4. `slack-bot.js` 작성 (스레드 답글 감지 + `child_process.spawn('claude', ...)`)
5. PM2로 Windows 백그라운드 서비스 등록

**예상 구현 시간:** 2~4시간

### 2순위 대안: Events API + Cloudflare Named Tunnel

안정성이 더 중요하거나, 향후 Slack Marketplace 배포를 고려한다면 선택.

**구현 단계:**
1. Cloudflare 계정 생성 + 도메인 연결
2. `cloudflared` 설치 및 Named Tunnel 생성
3. 로컬 Express 서버 작성
4. Slack App Event Subscriptions에 Cloudflare URL 등록
5. PM2로 Express 서버 및 cloudflared 서비스 등록

**예상 구현 시간:** 4~8시간

### 공통 주의사항

- `claude` CLI 명령어가 PATH에 등록되어 있는지 확인 (`where claude` 로 확인)
- Windows에서 `spawn()` 시 `shell: true` 옵션 또는 `claude.cmd` 사용 필요할 수 있음
- Claude Code 실행 중 대화형 입력을 요구하지 않도록 `--allowedTools` 명시적 지정 필수
- 동시에 여러 Slack 이벤트가 오면 여러 Claude 프로세스가 동시 실행될 수 있으므로 큐(Queue) 처리 고려
- `thread_ts` 존재 여부로 스레드 메시지 판별, `ts !== thread_ts` 조건으로 답글(리플) 판별

---

## 참고 자료

- [Slack Socket Mode 공식 문서](https://api.slack.com/apis/socket-mode)
- [Slack HTTP vs Socket Mode 비교](https://docs.slack.dev/apis/events-api/comparing-http-socket-mode/)
- [Bolt for JavaScript - Socket Mode 가이드](https://tools.slack.dev/bolt-js/concepts/socket-mode/)
- [@slack/socket-mode npm 패키지](https://www.npmjs.com/package/@slack/socket-mode)
- [Claude Code Headless Mode 공식 문서](https://code.claude.com/docs/en/headless)
- [Cloudflare Tunnel 로컬 웹훅 설정 (Persistent)](https://tareq.co/2025/11/local-webhook-cloudflare-tunnel/)
- [PM2 Windows 서비스 등록 가이드](https://medium.com/@gzthomasliang/run-pm2-as-service-on-windows-server-in-modern-way-286b9f4b8228)
- [n8n Slack Trigger 문서](https://docs.n8n.io/integrations/builtin/trigger-nodes/n8n-nodes-base.slacktrigger/)
- [Slack Events API 공식 문서](https://docs.slack.dev/apis/events-api/)
- [ngrok Slack Webhook 통합](https://ngrok.com/docs/integrations/webhooks/slack-webhooks)
