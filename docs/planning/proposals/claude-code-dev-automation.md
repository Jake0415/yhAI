# Claude Code 기반 자동화 개발 팀 구성 및 파이프라인 방안

- 작성일: 2026-03-14
- 작성자: 서비스 기획팀
- 기반 조사: `docs/planning/research/claude-code-automation.md`, `docs/planning/research/agent-orchestration-deep-dive.md`
- 기반 기획: `docs/planning/proposals/scenario-v2-improvements.md`

---

## 1. 자동화 개발 팀 구성

### 1.1 에이전트 역할 정의

YHAI가 사용자의 요구사항을 받아 자동으로 구성하는 AI 개발 팀의 에이전트 역할을 정의한다.

#### PM Agent (팀장)

| 항목 | 내용 |
|------|------|
| **역할** | 요구사항 분석, 팀 동적 구성, Phase 분해, 태스크 분배, 품질 관리 |
| **Claude Code 구현** | Agent Teams의 Team Lead로 실행 |
| **모델** | Opus 4.6 (복잡한 판단 필요) |
| **도구** | Read, Write, Edit, Bash, Glob, Grep, Agent(frontend, backend, db, qa, devops) |
| **입력** | 사용자 요구사항 문서 (전문가 대화에서 추출) |
| **산출물** | 팀 구성안, Phase 실행 계획, 공유 태스크 리스트, CLAUDE.md (프로젝트별), 통합 완료 보고 |

**PM Agent의 구체적 프로세스**:

```
1. 요구사항 분석
   - 도메인 식별 (이커머스, SaaS, 커뮤니티 등)
   - 기능 복잡도 판단 (단순/중간/복잡)
   - 기술 스택 결정 (Next.js + Supabase 기본)

2. 동적 팀 구성
   - 프로젝트 특성에 따라 필요한 역할만 선택
   - 간단한 랜딩페이지: Frontend 1명
   - 표준 웹앱: Frontend + Backend + DB = 3명
   - 복잡한 SaaS: Frontend + Backend + DB + QA + DevOps = 5명
   - 사용자에게 팀 구성안 제시 -> 승인/수정

3. Phase 분해
   - 태스크 의존성 그래프 생성
   - 순차/병렬 판단
   - Phase별 예상 시간/비용 산출

4. 태스크 분배 및 모니터링
   - 공유 태스크 리스트에 태스크 등록
   - 팀메이트에 태스크 할당 또는 자율 클레임 허용
   - TaskCompleted 훅으로 품질 게이트 실행
   - 충돌 감지 시 해결 또는 사용자 에스컬레이션

5. 통합 및 완료
   - 모든 Phase 완료 후 코드 통합
   - 빌드 검증 (next build)
   - 배포 트리거
```

#### Frontend Agent

| 항목 | 내용 |
|------|------|
| **역할** | UI 컴포넌트, 페이지, 레이아웃, 클라이언트 로직 구현 |
| **Claude Code 구현** | Team Lead가 스폰하는 Teammate |
| **모델** | Sonnet 4.6 (속도/비용 균형) |
| **isolation** | `worktree` (Git Worktree 격리) |
| **도구** | Read, Write, Edit, Bash, Glob, Grep |
| **MCP 서버** | shadcn (UI 컴포넌트 조회), playwright (E2E 테스트) |
| **입력** | 요구사항 문서, DB 스키마 (Phase 1 결과), API 인터페이스 명세 |
| **산출물** | Next.js 페이지, React 컴포넌트, TailwindCSS 스타일, 클라이언트 훅 |

**서브에이전트 정의 파일** (`.claude/agents/frontend.md`):

```markdown
---
name: frontend
description: Next.js 15 프론트엔드 개발 전문가. UI 컴포넌트, 페이지, 레이아웃 구현.
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
isolation: worktree
memory: project
mcpServers:
  - shadcn
skills:
  - nextjs-patterns
  - component-conventions
hooks:
  PostToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: "npx eslint --fix ${TOOL_INPUT_PATH} 2>/dev/null || true"
---

당신은 Next.js 15 + React 19 + TailwindCSS v4 + shadcn/ui 전문 프론트엔드 개발자입니다.

## 핵심 규칙
- App Router 사용 (pages/ 아님)
- Server Components 기본, 'use client'는 필요시에만
- shadcn/ui 컴포넌트 우선 사용
- TypeScript strict 모드
- 파일명: kebab-case, 컴포넌트명: PascalCase

## 작업 완료 조건
- TypeScript 타입 에러 없음
- ESLint 통과
- 반응형 레이아웃 (모바일 우선)
```

#### Backend Agent

| 항목 | 내용 |
|------|------|
| **역할** | API 라우트, Server Actions, 비즈니스 로직, 외부 API 연동 |
| **Claude Code 구현** | Teammate |
| **모델** | Sonnet 4.6 |
| **isolation** | `worktree` |
| **도구** | Read, Write, Edit, Bash, Glob, Grep |
| **입력** | 요구사항 문서, DB 스키마, API 명세 |
| **산출물** | API Routes, Server Actions, 미들웨어, 유틸리티, Supabase 클라이언트 설정 |

**서브에이전트 정의 파일** (`.claude/agents/backend.md`):

```markdown
---
name: backend
description: Next.js API Routes + Supabase 백엔드 개발 전문가. Server Actions, API 라우트, 비즈니스 로직.
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
isolation: worktree
memory: project
---

당신은 Next.js 15 Server Actions + Supabase 백엔드 전문 개발자입니다.

## 핵심 규칙
- Server Actions 우선 (단순 CRUD)
- API Routes는 외부 웹훅, 복잡한 로직에 사용
- Supabase 클라이언트: createServerClient (서버), createBrowserClient (클라이언트)
- 모든 함수에 에러 핸들링 (try-catch + 사용자 친화적 메시지)
- Zod로 입력 검증

## 작업 완료 조건
- TypeScript 타입 에러 없음
- 모든 API 엔드포인트에 입력 검증
- 에러 핸들링 완료
```

#### DB Agent

| 항목 | 내용 |
|------|------|
| **역할** | DB 스키마 설계, Supabase 마이그레이션, RLS 정책, 시드 데이터 |
| **Claude Code 구현** | Teammate (Phase 1에서 우선 실행) |
| **모델** | Sonnet 4.6 |
| **isolation** | `worktree` |
| **도구** | Read, Write, Edit, Bash, Glob, Grep |
| **입력** | 요구사항 문서 |
| **산출물** | SQL 마이그레이션 파일, RLS 정책, 타입 정의, 시드 데이터, Prisma 스키마 |

**서브에이전트 정의 파일** (`.claude/agents/db.md`):

```markdown
---
name: db
description: Supabase PostgreSQL 데이터베이스 설계 전문가. 스키마, 마이그레이션, RLS 정책 설계.
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
isolation: worktree
memory: project
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-db-command.sh"
---

당신은 Supabase PostgreSQL 데이터베이스 아키텍트입니다.

## 핵심 규칙
- 모든 테이블에 id (uuid), created_at, updated_at 포함
- tenant_id 기반 RLS 정책 필수 (멀티테넌트)
- 가격/금액은 numeric 타입 (float 금지)
- 외래키에 적절한 인덱스
- Prisma 스키마와 SQL 마이그레이션 동기화

## 작업 완료 조건
- ERD 다이어그램 (Mermaid)
- SQL 마이그레이션 파일
- RLS 정책 정의
- TypeScript 타입 자동 생성
```

#### QA Agent

| 항목 | 내용 |
|------|------|
| **역할** | 테스트 작성, 실행, 버그 리포트, 코드 리뷰 |
| **Claude Code 구현** | Teammate (Phase 4에서 실행) |
| **모델** | Sonnet 4.6 |
| **isolation** | `worktree` |
| **도구** | Read, Write, Edit, Bash, Glob, Grep |
| **MCP 서버** | playwright (E2E 테스트) |
| **입력** | 완성된 코드, 요구사항 문서, API 명세 |
| **산출물** | 단위 테스트, 통합 테스트, E2E 테스트, 테스트 리포트, 버그 리포트 |

**서브에이전트 정의 파일** (`.claude/agents/qa.md`):

```markdown
---
name: qa
description: QA 엔지니어. 테스트 작성, 실행, 버그 감지 및 수정 요청.
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
isolation: worktree
memory: project
mcpServers:
  - playwright:
      type: stdio
      command: npx
      args: ["-y", "@playwright/mcp@latest"]
---

당신은 품질 보증(QA) 엔지니어입니다.

## 테스트 전략
1. 단위 테스트: Vitest로 유틸리티, 훅, Server Actions 테스트
2. 통합 테스트: Supabase 연동 테스트
3. E2E 테스트: Playwright로 핵심 사용자 플로우 테스트

## 핵심 규칙
- 테스트 파일은 __tests__/ 또는 .test.ts 패턴
- 각 테스트에 명확한 설명 (describe/it)
- 엣지 케이스 포함 (빈 입력, 최대값, 에러 케이스)
- 테스트 실패 시 해당 에이전트에게 구체적 수정 요청

## 작업 완료 조건
- 모든 테스트 통과
- 핵심 플로우 E2E 테스트 포함
- 테스트 리포트 생성
```

#### DevOps Agent

| 항목 | 내용 |
|------|------|
| **역할** | 빌드 설정, 배포 파이프라인, 환경 변수, Docker 설정 |
| **Claude Code 구현** | Teammate 또는 PM Agent가 직접 처리 (간단한 경우) |
| **모델** | Haiku (단순 설정 작업) 또는 Sonnet (복잡한 파이프라인) |
| **isolation** | `worktree` |
| **도구** | Read, Write, Edit, Bash, Glob, Grep |
| **입력** | 프로젝트 코드, 배포 전략 |
| **산출물** | Vercel 배포 설정, GitHub Actions, 환경 변수 템플릿, Docker 설정 |

---

### 1.2 동적 팀 구성 매트릭스

PM Agent가 프로젝트 복잡도에 따라 팀을 동적으로 구성하는 기준:

| 프로젝트 유형 | 팀 구성 | 예상 시간 | 예상 비용 |
|-------------|---------|---------|---------|
| **정적 랜딩 페이지** | Frontend 1명 | 2-3분 | ~$0.50 |
| **블로그/CMS** | Frontend + DB = 2명 | 3-5분 | ~$1.00 |
| **표준 웹앱 (CRUD)** | Frontend + Backend + DB = 3명 | 5-8분 | ~$2.00 |
| **이커머스/SaaS** | Frontend + Backend + DB + QA = 4명 | 8-12분 | ~$3.50 |
| **복잡한 풀스택** | Frontend + Backend + DB + QA + DevOps = 5명 | 12-20분 | ~$5.00 |

---

## 2. 자동화 파이프라인 설계

### 2.1 전체 자동화 흐름

```
[사용자 요구사항 확정]
       |
       v
===== Phase 0: 프로젝트 초기화 (PM Agent 단독) =====
       |
       |  PM Agent 작업:
       |  1. Next.js 프로젝트 스캐폴딩 (create-next-app)
       |  2. 프로젝트별 CLAUDE.md 생성 (코딩 규칙, 아키텍처 가이드)
       |  3. package.json 의존성 설정
       |  4. 디렉토리 구조 생성
       |  5. 공유 타입 정의 파일 초기화
       |
       v
===== Phase 1: 데이터 레이어 (순차) =====
       |
       |  [DB Agent] --> Git Worktree 격리
       |    - Supabase 스키마 설계
       |    - SQL 마이그레이션 파일 생성
       |    - RLS 정책 정의
       |    - TypeScript 타입 자동 생성
       |    - Prisma 스키마 (ORM 사용 시)
       |
       |  완료 시: worktree --> merge to main
       |  PM Agent: DB 스키마를 Phase 2 에이전트 스폰 프롬프트에 포함
       |
       v
===== Phase 2: 핵심 기능 (병렬) =====
       |
       |  [Frontend Agent]        [Backend Agent]
       |  worktree-fe/            worktree-be/
       |    - 레이아웃/네비게이션     - Supabase 클라이언트 설정
       |    - 페이지 라우팅          - Server Actions
       |    - UI 컴포넌트            - API Routes
       |    - 폼 + 검증             - 비즈니스 로직
       |    - 상태 관리              - 에러 핸들링
       |    |                       |
       |    |<-- 메시지박스 통신 -->  |
       |    |  "GET /api/products    |
       |    |   응답 스키마 합의"      |
       |
       |  완료 시: 각 worktree --> merge to main
       |  충돌 발생 시: PM Agent 자동 해결 or 사용자 선택
       |
       v
===== Phase 3: 연동 + 고급 기능 (순차/병렬) =====
       |
       |  필요한 경우에만 실행:
       |  - 결제 연동 (Backend --> Frontend 순차)
       |  - 외부 API 연동
       |  - 인증 커스텀 설정
       |  - 실시간 기능 (Supabase Realtime)
       |
       v
===== Phase 4: 테스트 + 통합 (순차) =====
       |
       |  [QA Agent] --> Git Worktree 격리
       |    - TypeScript 타입 체크 (tsc --noEmit)
       |    - ESLint 실행
       |    - 단위 테스트 작성 + 실행
       |    - E2E 테스트 작성 + 실행 (Playwright)
       |    - 실패 시 --> 해당 에이전트에게 수정 요청
       |    - 수정 후 재테스트 (최대 3회)
       |
       |  완료 시: worktree --> merge to main
       |
       v
===== Phase 5: 빌드 + 배포 (PM Agent 또는 DevOps Agent) =====
       |
       |  1. next build (프로덕션 빌드 검증)
       |  2. Vercel REST API로 배포
       |     - 파일 인라인 업로드 (Git 불필요)
       |     - 환경변수 자동 설정 (Supabase URL, Keys)
       |  3. Supabase 마이그레이션 적용
       |     - SQL API로 스키마 적용
       |     - RLS 정책 적용
       |     - 시드 데이터 삽입
       |  4. 헬스체크
       |     - HTTP 200 확인
       |     - DB 연결 테스트
       |
       v
[빌드 완료] --> 프리뷰 URL 전달 --> 사용자 미리보기
```

### 2.2 Human-in-the-Loop (사람 개입 지점)

자동화 파이프라인에서 사용자 개입이 필요한 지점을 명확히 정의한다.

| 지점 | 타이밍 | 사용자 행동 | 자동 진행 조건 |
|------|--------|-----------|-------------|
| **팀 구성 승인** | Phase 0 전 | PM Agent의 팀 구성안 승인/수정 | 사용자가 "승인" 클릭 |
| **Phase 계획 승인** | Phase 0 전 | Phase별 태스크/예상 비용 확인 | 사용자가 "실행 시작" 클릭 |
| **코파일럿 개입** | Phase 2-3 중 | 빌드 중 채팅으로 방향 수정 | 선택적 (개입 없어도 진행) |
| **파일 충돌 해결** | 머지 시 | 자동 해결 실패 시 선택지 선택 | 자동 3-way 머지 성공 시 |
| **예산 초과 승인** | 90% 소진 시 | 예산 추가 또는 현재 상태로 완료 | 예산 내에서 완료 시 |
| **빌드 완료 확인** | Phase 5 후 | 미리보기 확인 후 수정 요청 또는 배포 승인 | - |

### 2.3 Git Worktree 격리 + 자동 머지 전략

```
프로젝트 저장소 구조:
.
├── .git/                  # 공유 Git 객체
├── .claude/
│   ├── agents/            # 에이전트 정의 파일
│   │   ├── frontend.md
│   │   ├── backend.md
│   │   ├── db.md
│   │   ├── qa.md
│   │   └── devops.md
│   └── worktrees/         # 에이전트별 격리 워크트리
│       ├── db/            # DB Agent 전용 (.gitignore에 포함)
│       ├── fe/            # Frontend Agent 전용
│       ├── be/            # Backend Agent 전용
│       └── qa/            # QA Agent 전용
├── src/                   # 메인 소스코드
├── CLAUDE.md              # 프로젝트 규칙 (모든 에이전트가 로드)
└── ...
```

**머지 전략**:

```
Phase 1 완료 (DB Agent):
  worktree-db --> git commit --> merge to main (충돌 가능성 낮음)

Phase 2 완료 (Frontend + Backend):
  1. worktree-fe --> git commit
  2. worktree-be --> git commit
  3. PM Agent: 두 워크트리의 변경 파일 목록 비교
     - 겹치는 파일 없음 --> 순차 머지 (fe 먼저, be 다음)
     - 겹치는 파일 있음 --> 3-way 머지 시도
       - 성공 --> 자동 커밋
       - 실패 --> 사용자에게 선택지 제시

Phase 4 완료 (QA Agent):
  worktree-qa --> 테스트 파일만 추가 (충돌 가능성 낮음) --> merge to main
```

---

## 3. Claude Code 기능 활용 매핑

### 3.1 YHAI 서비스 기능과 Claude Code 기능의 매핑

| YHAI 서비스 기능 | Claude Code 기능 | 구현 방식 |
|----------------|----------------|---------|
| AI 팀 자동 생성 | Agent Teams | Team Lead(PM Agent)가 자연어로 Teammate 스폰 |
| 에이전트 역할 정의 | Custom Subagents | `.claude/agents/` 폴더에 Markdown 파일로 정의 |
| 에이전트별 파일 격리 | Git Worktree | `isolation: worktree` frontmatter 또는 `--worktree` 플래그 |
| 에이전트 간 통신 | Mailbox (메시지박스) | 팀메이트 간 직접 메시지 (API 인터페이스 합의 등) |
| 태스크 관리 | Shared Task List | pending/in_progress/completed 상태 + 의존성 관리 |
| 품질 게이트 | Hooks | TaskCompleted, PreToolUse, PostToolUse 훅 |
| 자동 빌드 검증 | Headless Mode | `claude -p "next build" --allowedTools Bash` |
| 코딩 규칙 통일 | CLAUDE.md | 프로젝트별 CLAUDE.md에 규칙 정의, 모든 에이전트 자동 로드 |
| 에이전트 학습 | Persistent Memory | `memory: project`로 패턴/인사이트 누적 |
| 사고 과정 공개 | Extended Thinking | Claude의 thinking 출력을 UI에 스트리밍 |
| 비용 제어 | 모델 라우팅 | 탐색은 Haiku, 구현은 Sonnet, 복잡한 판단은 Opus |
| 자동 배포 | Headless + Bash | `claude -p "vercel deploy" --allowedTools Bash` |

### 3.2 에이전트 모델 라우팅 전략

토큰 비용을 최적화하기 위해 작업 유형에 따라 모델을 라우팅한다.

| 작업 유형 | 모델 | 이유 | 예상 비용/태스크 |
|---------|------|------|---------------|
| 코드베이스 탐색 | Haiku | 빠르고 저렴, 읽기 전용 | ~$0.02 |
| UI 컴포넌트 구현 | Sonnet 4.6 | 속도/품질 균형 | ~$0.15 |
| API/로직 구현 | Sonnet 4.6 | 속도/품질 균형 | ~$0.15 |
| DB 스키마 설계 | Sonnet 4.6 | 충분한 추론 능력 | ~$0.10 |
| 테스트 작성/실행 | Sonnet 4.6 | 코드 이해 + 생성 | ~$0.15 |
| PM 판단/계획 | Opus 4.6 | 복잡한 분석과 의사결정 | ~$0.30 |
| 충돌 해결 | Opus 4.6 | 두 코드 변경을 이해하고 병합 | ~$0.20 |
| 코드 리뷰 | Sonnet 4.6 | 패턴 인식 + 제안 | ~$0.10 |

### 3.3 가드레일 구현 방안

Claude Code의 훅 시스템을 활용한 가드레일 구현:

#### 무한 루프 방지

```json
// settings.json
{
  "hooks": {
    "TaskCompleted": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "./scripts/validate-task-completion.sh"
          }
        ]
      }
    ]
  }
}
```

```bash
#!/bin/bash
# validate-task-completion.sh
# 태스크 완료 검증: 파일 변경 존재 여부 + 빌드 성공 여부

INPUT=$(cat)
TASK_ID=$(echo "$INPUT" | jq -r '.task_id // empty')

# 변경된 파일이 없으면 완료 거부
CHANGED_FILES=$(git diff --name-only HEAD~1 2>/dev/null | wc -l)
if [ "$CHANGED_FILES" -eq 0 ]; then
  echo "태스크 완료 거부: 변경된 파일이 없습니다." >&2
  exit 2
fi

exit 0
```

#### 위험 명령 차단

```bash
#!/bin/bash
# validate-safe-commands.sh
# 위험한 명령 차단 (rm -rf, DROP TABLE 등)

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# 위험한 패턴 차단
if echo "$COMMAND" | grep -iE '(rm -rf /|DROP (TABLE|DATABASE)|TRUNCATE|format |mkfs)' > /dev/null; then
  echo "차단: 위험한 명령이 감지되었습니다: $COMMAND" >&2
  exit 2
fi

exit 0
```

#### 토큰 예산 모니터링

```bash
#!/bin/bash
# monitor-token-budget.sh
# 토큰 사용량이 예산의 90%를 초과하면 경고

BUDGET_FILE="/tmp/yhai-token-budget.json"
CURRENT_TOKENS=$(echo "$INPUT" | jq -r '.token_count // 0')
MAX_TOKENS=$(cat "$BUDGET_FILE" | jq -r '.max_tokens // 100000')

USAGE_PCT=$(( CURRENT_TOKENS * 100 / MAX_TOKENS ))

if [ "$USAGE_PCT" -ge 90 ]; then
  echo "경고: 토큰 예산의 ${USAGE_PCT}%를 사용했습니다. 일시정지합니다." >&2
  exit 2
fi

exit 0
```

---

## 4. YHAI 서비스 사용자 경험 설계

### 4.1 사용자에게 제공하는 자동화 경험

YHAI 사용자 입장에서의 자동화 개발 경험:

```
[1단계: 전문가 대화] -- 기존 시나리오 1-2
  사용자가 전문가와 대화하며 요구사항을 구체화

[2단계: 요구사항 확정 + 빌드 시작]
  사용자가 "빌드 시작" 클릭

[3단계: AI 팀 구성 제안] -- 사용자에게 투명하게 공개
  +--------------------------------------------------+
  | PM Agent의 분석 결과                                |
  |                                                    |
  | "분석 중..."                                       |
  |  - 도메인: 이커머스 (구독형)                         |
  |  - 복잡도: 중간 (결제 연동 포함)                     |
  |  - 기술 스택: Next.js 15 + Supabase                |
  |                                                    |
  | 팀 구성 제안:                                       |
  | [v] Frontend 개발자 - UI/페이지 구현                 |
  | [v] Backend 개발자 - API/결제 로직                   |
  | [v] DB 설계자 - 스키마/마이그레이션                   |
  | [v] QA 엔지니어 - 테스트 검증                        |
  |                                                    |
  | 예상 시간: ~10분 | 예상 비용: ~$3.50                 |
  |                                                    |
  | [팀 구성 승인] [수정하기]                             |
  +--------------------------------------------------+

[4단계: Mission Control] -- 실시간 빌드 모니터링
  +--------------------------------------------------+
  | Phase 2/4: 핵심 기능 구현            [코파일럿 입력] |
  | 진행률: ================--------- 65%              |
  | 비용: $1.80 / $3.50                                |
  |                                                    |
  | [Frontend] ================ 80%                    |
  |   작업중: SubscriptionPlan 페이지                    |
  |                                                    |
  | [Backend] ============== 70%                       |
  |   작업중: 결제 API 연동                              |
  |                                                    |
  | [DB] ==================== 완료                      |
  | [QA] -------- 대기 (Phase 4)                       |
  |                                                    |
  | --- 활동 로그 ---                                   |
  | 14:32:20 [메시지] FE-->BE: "상품 응답에              |
  |          thumbnailUrl 추가해주세요"                  |
  | 14:32:22 [BE] "확인. ProductDto에 추가"             |
  +--------------------------------------------------+

[5단계: 빌드 완료 + 미리보기]
  프리뷰 URL 제공 + 수정 요청 가능
```

### 4.2 코파일럿 빌드 (빌드 중 사용자 개입)

빌드가 진행되는 동안 사용자가 실시간으로 방향을 수정할 수 있다.

**구현 방식**:
1. Mission Control 하단에 채팅 입력창 제공
2. 사용자 메시지 -> PM Agent의 태스크 큐에 실시간 추가
3. PM Agent가 해당 팀메이트에게 태스크 업데이트 전달

**예시**:
```
사용자: "구독 플랜 페이지에 연간 할인 옵션도 추가해주세요"
PM Agent: "Frontend Agent에 태스크를 추가합니다."
Frontend Agent: [현재 작업에 연간 할인 옵션 반영]
```

### 4.3 사고 과정 스트리밍

Claude의 Extended Thinking 출력을 사용자에게 실시간으로 보여준다.

**구현 방식**:
1. Claude API의 `extended_thinking` 응답을 파싱
2. WebSocket/SSE로 사용자 UI에 스트리밍
3. 접기/펼치기 UI로 선택적 열람

```
[Backend Agent 사고 과정] ▼

  결제 연동 방식을 결정합니다...

  고려한 옵션:
  1. Stripe -- 글로벌 표준이지만 한국 원화 제약
  2. 토스페이먼츠 -- 국내 1위, 정기결제 복잡
  3. Bootpay -- 구독 전용 API, 카카오페이+카드 통합 ← 선택

  결정 근거: 요구사항의 "카카오페이 + 카드 결제 동시 지원"에 최적
```

---

## 5. 실제 구현 아키텍처

### 5.1 YHAI 백엔드에서의 에이전트 오케스트레이션

```
YHAI 백엔드 (NestJS)
├── modules/
│   ├── agent-orchestrator/         # 에이전트 오케스트레이션 모듈
│   │   ├── orchestrator.service.ts  # PM Agent 실행 관리
│   │   ├── team.service.ts          # 팀 생성/관리
│   │   ├── task.service.ts          # 태스크 큐 관리
│   │   ├── worktree.service.ts      # Git Worktree 생성/삭제/머지
│   │   ├── merge.service.ts         # 자동 머지 + 충돌 해결
│   │   └── budget.service.ts        # 토큰 예산 관리
│   │
│   ├── build-monitor/              # 빌드 모니터링 모듈
│   │   ├── monitor.gateway.ts       # WebSocket 게이트웨이
│   │   ├── progress.service.ts      # 진행률 추적
│   │   └── cost.service.ts          # 비용 실시간 계산
│   │
│   └── deploy/                     # 배포 모듈
│       ├── vercel.service.ts        # Vercel REST API 클라이언트
│       ├── supabase.service.ts      # Supabase Management API 클라이언트
│       └── deploy.service.ts        # 배포 파이프라인 오케스트레이션
```

### 5.2 에이전트 실행 흐름 (기술 상세)

```typescript
// 간략화된 오케스트레이션 흐름
async function executeBuild(projectId: string, requirements: RequirementDoc) {
  // 1. PM Agent 실행 (Opus 4.6)
  const pmResult = await claudeCode({
    prompt: buildPMPrompt(requirements),
    model: 'opus',
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep', 'Agent'],
    agents: {
      frontend: frontendAgentConfig,
      backend: backendAgentConfig,
      db: dbAgentConfig,
      qa: qaAgentConfig,
    },
    outputFormat: 'stream-json',  // 실시간 스트리밍
  });

  // 2. 스트리밍 결과를 WebSocket으로 사용자에게 전달
  for await (const event of pmResult.stream) {
    websocket.emit('build-progress', {
      projectId,
      event: parseAgentEvent(event),
    });
  }

  // 3. 빌드 완료 후 배포
  await deployToVercel(projectId);
  await applySupabaseMigrations(projectId);
}
```

### 5.3 Headless Mode 활용 CI/CD 파이프라인

YHAI가 내부적으로 사용하는 자동화 파이프라인:

```bash
#!/bin/bash
# build-and-verify.sh -- YHAI 내부 빌드 검증 파이프라인

PROJECT_DIR=$1

# 1. TypeScript 타입 체크
claude -p "Run 'npx tsc --noEmit' in ${PROJECT_DIR} and report any errors" \
  --allowedTools Bash,Read \
  --output-format json > /tmp/typecheck-result.json

# 2. ESLint 검사
claude -p "Run ESLint on ${PROJECT_DIR}/src and fix auto-fixable issues" \
  --allowedTools Bash,Read,Edit \
  --output-format json > /tmp/lint-result.json

# 3. 빌드 테스트
claude -p "Run 'npm run build' in ${PROJECT_DIR}. If it fails, analyze the error and fix it." \
  --allowedTools Bash,Read,Write,Edit \
  --output-format json > /tmp/build-result.json

# 4. 테스트 실행
claude -p "Run 'npm test' in ${PROJECT_DIR}. Fix any failing tests." \
  --allowedTools Bash,Read,Write,Edit \
  --output-format json > /tmp/test-result.json
```

---

## 6. 실행 로드맵

### Phase 1: 기본 자동화 (MVP, 1-2개월)

- [ ] PM Agent 구현 (단일 에이전트, 순차 실행)
- [ ] CLAUDE.md 템플릿 시스템 (프로젝트 유형별)
- [ ] Headless Mode 기반 빌드/테스트 자동화
- [ ] Vercel 자동 배포 파이프라인
- [ ] Mission Control 기본 UI (진행률, 로그)

**이 단계에서는**: 서브에이전트를 활용하여 PM Agent가 순차적으로 태스크를 위임하고 결과를 수집. Agent Teams는 사용하지 않음.

### Phase 2: 병렬 에이전트 (2-4개월)

- [ ] Git Worktree 격리 모듈
- [ ] 에이전트별 서브에이전트 정의 (`isolation: worktree`)
- [ ] 병렬 실행 (Frontend + Backend 동시)
- [ ] 자동 3-way 머지 + 충돌 해결
- [ ] 토큰 예산 관리 + 비용 대시보드
- [ ] 가드레일 훅 시스템 (무한 루프 방지, 위험 명령 차단)
- [ ] Mission Control v2 (에이전트별 상태, 실시간 로그)

### Phase 3: Agent Teams 통합 (4-6개월)

- [ ] Agent Teams 기반 팀 오케스트레이션
- [ ] 메시지박스 기반 에이전트 간 직접 통신
- [ ] 공유 태스크 리스트 + 자율 클레임
- [ ] Plan Approval 모드 (팀메이트 계획 승인)
- [ ] TaskCompleted/TeammateIdle 훅 품질 게이트
- [ ] 코파일럿 빌드 (빌드 중 사용자 개입)
- [ ] 사고 과정 스트리밍

### Phase 4: 고급 자동화 (6개월+)

- [ ] 에이전트 영속 메모리 (`memory: project`)
- [ ] Self-Healing CI (빌드 실패 자동 수정)
- [ ] A/B 빌드 (동일 요구사항 2개 버전 병렬 생성)
- [ ] 브랜치 빌드 (기술 결정 분기 선택)
- [ ] LLM-as-a-Judge 테스트 패턴
- [ ] 빌드 리플레이 (타임랩스 재생)

---

## 7. 핵심 기술 결정 요약

| 결정 | 선택 | 근거 |
|------|------|------|
| 오케스트레이션 | Claude Code Agent Teams | 공식 기능, 메시지박스+태스크 리스트 내장, 추가 인프라 불필요 |
| 에이전트 정의 | Custom Subagents (Markdown) | `.claude/agents/` 파일 기반, 버전 관리 가능, 팀 공유 |
| 파일 격리 | Git Worktree | 공식 지원 (`isolation: worktree`), 구조적 충돌 차단 |
| 비용 최적화 | 모델 라우팅 | Haiku(탐색)/Sonnet(구현)/Opus(판단) 3단계 |
| 품질 게이트 | Hooks 시스템 | TaskCompleted, PreToolUse, PostToolUse 훅 |
| CI/CD 통합 | Headless Mode | `claude -p` + `--allowedTools`로 파이프라인 통합 |
| 컨텍스트 관리 | CLAUDE.md + 스폰 프롬프트 | 모든 에이전트에 일관된 규칙 주입, Phase 결과를 다음 Phase에 전달 |
| 배포 | Vercel REST API + Supabase Management API | Git 없이 직접 배포, API 기반 자동화 |
| 에이전트 학습 | Persistent Memory | `memory: project`로 프로젝트별 패턴 누적 |
| 사용자 개입 | Human-in-the-Loop 체크포인트 | 팀 구성, Phase 계획, 예산 초과, 충돌 해결 시 |
