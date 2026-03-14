---
description: '팀장이 정리한 기획 내용을 HTML 이메일로 전송합니다 (보고서만, 승인 요청 미포함)'
---

# 기획 보고서 이메일 전송

팀장이 정리한 기획 내용을 HTML 이메일로 yhk71261@gmail.com에 전송합니다. 이메일은 순수 보고서/정리 내용만 포함하며, 작업 진행 승인 요청은 포함하지 않습니다.

## 사용법

```
/email-send-report [제목 또는 주제 설명]
```

## 프로세스

### 1단계: 보고서 내용 확인
- `docs/planning/` 폴더에서 현재 진행 중인 기획 산출물을 읽는다
- `docs/planning/progress.md`에서 현재 단계를 확인한다
- 사용자가 인자로 전달한 주제가 있으면 해당 내용에 집중한다

### 2단계: HTML 이메일 본문 작성
- 기획 내용을 **전문적인 HTML 이메일**로 작성한다
- `.claude/skills/email-send-report/template.html` 파일의 구조를 기반으로 작성한다
- 템플릿의 플레이스홀더를 실제 내용으로 교체한다:
  - `{{날짜}}` → 현재 날짜
  - `{{현재 단계}}` → progress.md 기준 현재 단계
  - `{{다음 단계 설명}}` → 다음 단계 내용
  - `{{예상 산출물}}` → 다음 단계의 예상 결과물
  - `<!-- 본문 내용을 여기에 삽입 -->` → 기획 보고서 본문
- `.section`, `.highlight`, `.action-required` 등 템플릿의 CSS 클래스를 활용하여 구조화한다

### 3단계: 이메일 전송
- 완성된 HTML 본문을 임시 파일 `docs/planning/.temp-email.html`에 저장
- 아래 명령어로 전송:

```bash
node scripts/send-email.js --subject "[YHAI 기획] {{제목}}" --body-file docs/planning/.temp-email.html
```

- 전송 성공 확인 후 임시 파일 삭제

### 4단계: Slack 전송 완료 알림
- Slack `#claude-status` 채널(ID: `C0AHUT40AE5`)에 이메일 전송 완료 알림을 보낸다
- 알림 메시지 형식:
  ```
  ✉️ 기획 보고서 이메일 전송 완료
  - 제목: [YHAI 기획] {{제목}}
  - 수신자: yhk71261@gmail.com
  ```
- **이메일에는 승인 요청을 포함하지 않는다** — 승인은 Slack 또는 Claude Code에서만 처리

## 규칙

- 이메일 본문은 반드시 **한국어**로 작성
- HTML 서식을 사용하여 가독성 높은 보고서 형태로 작성
- 표, 목록, 강조 등을 적극 활용
- 전송 전 사용자에게 제목과 핵심 내용을 미리 보여주고 확인받는다
- 전송 후 반드시 Slack 알림을 보낸다
- `docs/planning/progress.md`에 이메일 전송 이력을 기록한다
