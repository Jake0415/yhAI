# AI 에이전트 팀 구성 및 역할 배치 개선안

- 작성일: 2026-03-14
- 작성자: 서비스 기획팀 (팀장 + 웹검색전문가 + 서비스기획자)
- 기반 조사: 최신 AI 에이전트 팀 구성 사례, 역할 분담 패턴, 성공/실패 사례
- 기반 기획: `docs/planning/proposals/claude-code-dev-automation.md`

---

## 1. 현재 팀 구성안 분석

### 1.1 기존 6인 팀 구성

| 에이전트 | 모델 | 역할 |
|---------|------|------|
| PM Agent (팀장) | Opus 4.6 | 요구사항 분석, 팀 구성, Phase 분해, 태스크 분배, 품질 관리 |
| Frontend Agent | Sonnet 4.6 | UI 컴포넌트, 페이지, 레이아웃, 클라이언트 로직 |
| Backend Agent | Sonnet 4.6 | API 라우트, Server Actions, 비즈니스 로직 |
| DB Agent | Sonnet 4.6 | DB 스키마 설계, 마이그레이션, RLS 정책 |
| QA Agent | Sonnet 4.6 | 테스트 작성/실행, 버그 리포트 |
| DevOps Agent | Haiku/Sonnet | 빌드 설정, 배포, CI/CD |

### 1.2 기존 구성의 강점

- 역할이 명확하게 분리되어 있음
- 소프트웨어 개발 조직의 전통적 구조를 반영
- 프로젝트 복잡도에 따른 동적 팀 규모 조절 전략 존재
- Git Worktree 기반 파일 격리로 충돌 방지

### 1.3 기존 구성의 약점 및 고민 포인트

1. **역할 경계 모호성**: Backend Agent와 DB Agent의 업무가 겹칠 수 있음 (Server Actions에서 DB 쿼리)
2. **QA의 후행적 위치**: Phase 4에서만 동작하여 초기 버그를 놓칠 수 있음
3. **DevOps의 활용도 부족**: 대부분 프로젝트에서 Vercel 자동 배포면 충분하여 별도 에이전트 불필요
4. **에이전트 간 통신 비용**: 6인 팀의 통신 채널 = 15개 (n*(n-1)/2)로 복잡도 증가
5. **비용 효율성**: 6인 모두 독립 인스턴스로 토큰 비용 높음

---

## 2. 조사 결과 핵심 인사이트

### 2.1 최적 팀 규모: 3-5명

여러 사례에서 공통적으로 **3-5명 팀메이트**가 최적이라는 결론:

- **Claude Code 공식 가이드**: 3-5명 팀메이트, 팀메이트당 5-6개 태스크 권장
- **Anthropic 멀티에이전트 연구**: 3-5 서브에이전트 동시 실행이 효율적
- **C 컴파일러 프로젝트**: 16명 사용했으나, 동일 파일 충돌 문제로 실질적 병렬성은 파일 단위로 제한됨
- **실전 교훈**: "2명의 좁은 범위 에이전트가 큰 팀보다 일관적으로 우수한 성과"

### 2.2 성공 패턴

| 패턴 | 설명 | 출처 |
|------|------|------|
| **명확한 파일 경계** | 각 에이전트에 디렉토리/파일 소유권 명시 | Claude Code 공식 |
| **Delegate Mode** | 리드는 조율만, 구현은 팀메이트에게 위임 | Claude Code Best Practices |
| **Plan-First** | 구현 전 계획 수립 + 리드 승인 필수 | 다수 사례 |
| **Self-Reporting** | CLAUDE.md 규칙으로 작업 결과 자동 보고 | claudefa.st |
| **Model Pairing** | Opus(리드) + Sonnet(실행) 조합이 단일 Opus 대비 90.2% 성능 향상 | Anthropic 연구 |
| **토큰 효율 = 성능** | 토큰 사용량이 성능 분산의 80% 설명 | Anthropic 연구 |

### 2.3 실패 패턴

| 패턴 | 설명 | 해결책 |
|------|------|--------|
| **리드의 직접 구현** | 팀장이 코딩에 개입하면 팀메이트가 무용화 | Delegate Mode 강제 |
| **모호한 태스크** | "앱 만들어줘" 같은 지시는 토큰만 소모 | 구체적 파일, 기준, 산출물 명시 |
| **동일 파일 편집** | 여러 에이전트가 같은 파일 수정 시 충돌 | 파일 소유권 + Git Worktree |
| **과도한 에이전트** | 간단한 쿼리에 50개 서브에이전트 생성 | 복잡도 기반 스케일링 규칙 |
| **순차적 대기** | 리드가 모든 서브에이전트 완료를 대기 | 비동기 + 중간 결과 활용 |

### 2.4 오케스트레이션 패턴 비교

| 패턴 | 설명 | YHAI 적합성 |
|------|------|------------|
| **중앙집중형 (Centralized)** | 단일 컨트롤러가 모든 에이전트 관리 | 높음 -- PM Agent가 컨트롤러 |
| **계층형 (Hierarchical)** | 상위 에이전트 > 하위 팀 > 작업자 | 중간 -- 복잡한 프로젝트에서 고려 |
| **분산형 (Decentralized)** | 각 에이전트가 자율적으로 판단 | 낮음 -- 예측 불가능성 높음 |
| **하이브리드** | 중앙 조율 + 팀메이트 간 직접 통신 | 최적 -- Agent Teams의 메시지박스 활용 |

---

## 3. 팀 구성 개선안

### 3.1 안 A: 핵심 3인 팀 (Lean Team) -- 권장

**컨셉**: 최소 구성으로 최대 효율. 대부분의 프로젝트에 적합.

```
PM Agent (Opus 4.6) -- 팀장/조율자
  |
  +-- Fullstack Agent (Sonnet 4.6) -- 프론트엔드 + 백엔드 통합
  |
  +-- Foundation Agent (Sonnet 4.6) -- DB + 인프라 + 테스트
```

| 에이전트 | 모델 | 역할 상세 | 파일 소유권 |
|---------|------|---------|-----------|
| **PM Agent** | Opus 4.6 | 요구사항 분석, 프로젝트 스캐폴딩, Phase 분해, 태스크 분배, 코드 리뷰, 머지 관리, 배포 | `CLAUDE.md`, `package.json`, 루트 설정 파일 |
| **Fullstack Agent** | Sonnet 4.6 | 페이지/레이아웃, UI 컴포넌트, Server Actions, API Routes, 클라이언트 훅, 폼 검증 | `src/app/`, `src/components/`, `src/lib/`, `src/hooks/` |
| **Foundation Agent** | Sonnet 4.6 | DB 스키마 설계, SQL 마이그레이션, RLS 정책, TypeScript 타입 생성, 테스트 작성, E2E 테스트, 환경 설정 | `supabase/`, `prisma/`, `__tests__/`, `e2e/`, 설정 파일 |

**장점**:
- 통신 채널 3개로 복잡도 최소화
- Fullstack Agent가 FE/BE 경계를 자유롭게 넘나들어 API 인터페이스 불일치 방지
- Foundation Agent가 DB 설계부터 테스트까지 "기반 품질"을 일괄 담당
- 토큰 비용 절감 (3인 vs 6인)

**적합한 프로젝트**: 랜딩 페이지, 블로그, 표준 CRUD 앱, 소규모 SaaS

### 3.2 안 B: 확장 4인 팀 (Standard Team) -- 중급 프로젝트용

**컨셉**: Fullstack을 FE/BE로 분리하되, 불필요한 역할은 통합.

```
PM Agent (Opus 4.6) -- 팀장/조율자
  |
  +-- Frontend Agent (Sonnet 4.6) -- UI 전문
  |      |<-- 메시지박스 -->|
  +-- Backend Agent (Sonnet 4.6) -- API + DB 통합
  |
  +-- Quality Agent (Sonnet 4.6) -- 테스트 + 코드 리뷰
```

| 에이전트 | 모델 | 역할 상세 | 파일 소유권 |
|---------|------|---------|-----------|
| **PM Agent** | Opus 4.6 | 조율, 스캐폴딩, 머지, 배포, 아키텍처 결정 | 루트 설정, `CLAUDE.md` |
| **Frontend Agent** | Sonnet 4.6 | 페이지, 컴포넌트, 레이아웃, 클라이언트 훅, 폼 UI | `src/app/`, `src/components/` |
| **Backend Agent** | Sonnet 4.6 | Server Actions, API Routes, DB 스키마, 마이그레이션, RLS, Supabase 설정 | `src/actions/`, `src/lib/`, `supabase/`, `prisma/` |
| **Quality Agent** | Sonnet 4.6 | 단위/통합/E2E 테스트, 코드 리뷰, 빌드 검증, 접근성 검사 | `__tests__/`, `e2e/`, `.github/` |

**핵심 변경**: DB Agent를 Backend Agent에 통합, QA + DevOps를 Quality Agent로 통합

**장점**:
- FE/BE 분리로 병렬 구현 가능 (Phase 2)
- Quality Agent가 DB 스키마 완성 직후부터 테스트 작성 시작 가능 (조기 QA)
- Backend + DB 통합으로 Server Actions <-> DB 쿼리 인터페이스 불일치 제거
- 통신 채널 6개로 관리 가능

**적합한 프로젝트**: 이커머스, 중규모 SaaS, 결제 연동 앱

### 3.3 안 C: 전문 5인 팀 (Expert Team) -- 복잡한 프로젝트용

**컨셉**: 전문성 극대화. 복잡한 도메인 로직이 있는 프로젝트에 적합.

```
PM Agent (Opus 4.6) -- 팀장/조율자
  |
  +-- Frontend Agent (Sonnet 4.6) -- UI/UX 전문
  |      |<-- 메시지박스 -->|
  +-- Backend Agent (Sonnet 4.6) -- API + 비즈니스 로직
  |
  +-- Data Agent (Sonnet 4.6) -- DB + 데이터 파이프라인
  |
  +-- Guardian Agent (Sonnet 4.6) -- 테스트 + 보안 + 성능
```

| 에이전트 | 모델 | 역할 상세 |
|---------|------|---------|
| **PM Agent** | Opus 4.6 | 전략적 아키텍처 결정, 복잡한 머지 해결, 에이전트 간 API 인터페이스 중재 |
| **Frontend Agent** | Sonnet 4.6 | 복잡한 상태 관리, 실시간 UI, 접근성, 국제화 |
| **Backend Agent** | Sonnet 4.6 | 복잡한 비즈니스 로직, 외부 API 연동, 결제, 인증 커스텀 |
| **Data Agent** | Sonnet 4.6 | 복잡한 스키마 설계, 데이터 마이그레이션, 캐싱 전략, 실시간 구독 |
| **Guardian Agent** | Sonnet 4.6 | 보안 감사, 성능 프로파일링, E2E/부하 테스트, 취약점 스캔 |

**적합한 프로젝트**: 복잡한 SaaS, 멀티테넌트 플랫폼, 결제+구독+실시간 기능 조합

---

## 4. 역할 정의 개선: RACI 매트릭스

### 4.1 PM Agent 역할 재정의

기존 문제: PM Agent가 조율과 구현을 모두 담당하려는 경향 (리드의 직접 구현 안티패턴)

**개선된 PM Agent 역할 원칙**:

```
PM Agent = "Coordinator, Never Coder"

해야 할 것:
  - 요구사항 분석 및 Phase 분해
  - 팀 구성 결정 및 에이전트 스폰
  - 태스크 분배 및 우선순위 설정
  - API 인터페이스 중재 (FE <-> BE 계약 정의)
  - 머지 충돌 해결
  - 품질 게이트 관리 (빌드 통과 여부 확인)
  - 배포 트리거
  - 사용자 커뮤니케이션

하지 않아야 할 것:
  - 직접 코드 작성 (Phase 0 스캐폴딩 제외)
  - 테스트 작성
  - DB 쿼리 작성
  - UI 컴포넌트 구현
```

### 4.2 RACI 매트릭스 (안 B: 4인 팀 기준)

| 활동 | PM | Frontend | Backend | Quality |
|------|:--:|:--------:|:-------:|:-------:|
| 요구사항 분석 | **R** | C | C | I |
| 프로젝트 스캐폴딩 | **R** | I | I | I |
| DB 스키마 설계 | A | I | **R** | C |
| API 인터페이스 정의 | **R** | C | C | I |
| UI 컴포넌트 구현 | I | **R** | I | I |
| 페이지/라우팅 | I | **R** | I | I |
| Server Actions | I | I | **R** | I |
| API Routes | I | I | **R** | I |
| 마이그레이션 | A | I | **R** | I |
| 단위 테스트 | I | I | I | **R** |
| E2E 테스트 | I | I | I | **R** |
| 코드 리뷰 | A | I | I | **R** |
| 빌드 검증 | A | I | I | **R** |
| 머지 관리 | **R** | I | I | I |
| 배포 | **R** | I | I | I |

> R = Responsible (실행), A = Accountable (승인), C = Consulted (자문), I = Informed (통보)

---

## 5. 에이전트 간 커뮤니케이션 설계

### 5.1 통신 프로토콜

```
통신 유형별 채널 설계:

1. 태스크 할당: PM --> 팀메이트 (스폰 프롬프트)
   - 구체적 파일 경로, 수용 기준, 산출물 형태 명시
   - 예: "src/app/products/page.tsx를 생성하세요.
         제품 목록을 Supabase에서 SSR로 가져오고,
         shadcn/ui Card 컴포넌트로 그리드 표시.
         반응형 (모바일 2열, 데스크탑 4열)."

2. 인터페이스 합의: Frontend <--> Backend (메시지박스)
   - API 요청/응답 스키마 합의
   - 예: FE --> BE: "GET /api/products 응답에 thumbnailUrl 필드 추가 필요"
         BE --> FE: "확인. ProductDto 타입에 추가 완료.
                     타입: { id: string, name: string, thumbnailUrl: string | null }"

3. 품질 피드백: Quality --> PM --> 해당 에이전트 (태스크 리스트)
   - 테스트 실패 시 구체적 수정 요청
   - 예: "ProductCard 컴포넌트의 가격 표시에서
         소수점 2자리 포맷팅 누락.
         formatPrice() 함수를 src/lib/utils.ts에 추가하고 적용하세요."

4. 진행 보고: 팀메이트 --> PM (TaskCompleted 훅)
   - 자동 보고 (CLAUDE.md 규칙 기반)
```

### 5.2 공유 아티팩트 전략

에이전트 간 컨텍스트 공유를 위한 "계약 파일" 시스템:

```
프로젝트 루트/
├── .contracts/                    # 에이전트 간 공유 계약 (PM이 관리)
│   ├── api-schema.ts              # API 요청/응답 타입 (FE/BE 공유)
│   ├── db-schema.prisma           # DB 스키마 (Backend이 생성, 모두 참조)
│   ├── shared-types.ts            # 공유 도메인 타입
│   └── routes.ts                  # 라우트 목록 + 파라미터 정의
```

**핵심 원칙**: PM Agent가 Phase 0에서 계약 파일 초안을 생성하고, 각 에이전트가 자기 영역의 구체적 타입을 추가. 계약 파일 변경 시 PM Agent의 승인 필요.

### 5.3 스폰 프롬프트 템플릿

PM Agent가 팀메이트를 스폰할 때 사용하는 표준 프롬프트 구조:

```markdown
## 태스크 컨텍스트
- 프로젝트: [프로젝트명] - [도메인]
- 기술 스택: Next.js 15 + Supabase + TailwindCSS v4

## 당신의 역할
[역할명] - [한줄 설명]

## 담당 영역
- 파일 소유권: [디렉토리 목록]
- 수정 금지: [다른 에이전트 소유 디렉토리]

## 태스크 목록
1. [구체적 태스크 + 수용 기준]
2. [구체적 태스크 + 수용 기준]
...

## 참조 파일
- DB 스키마: .contracts/db-schema.prisma
- API 타입: .contracts/api-schema.ts
- 코딩 규칙: CLAUDE.md

## 완료 조건
- [ ] TypeScript 타입 에러 없음
- [ ] ESLint 통과
- [ ] [역할별 추가 조건]
```

---

## 6. 프로젝트 복잡도별 팀 자동 구성 전략

### 6.1 복잡도 판단 기준

PM Agent가 요구사항 분석 단계에서 자동으로 복잡도를 판단하는 기준:

```
복잡도 점수 = Sum of:
  +1: 페이지 수 > 3
  +1: DB 테이블 > 3
  +1: 인증/회원가입 필요
  +1: 결제 연동
  +1: 외부 API 2개 이상
  +1: 실시간 기능 (WebSocket/SSE)
  +1: 파일 업로드/미디어 처리
  +1: 다국어 지원
  +1: 멀티테넌트
  +1: 복잡한 권한 체계 (RBAC)

점수 --> 팀 구성:
  0-2점: 안 A (3인 Lean Team)
  3-5점: 안 B (4인 Standard Team)
  6점+:  안 C (5인 Expert Team)
```

### 6.2 동적 팀 구성 매트릭스 (개선)

| 프로젝트 유형 | 복잡도 | 팀 구성 | Phase 구조 | 예상 시간 | 예상 비용 |
|-------------|--------|---------|-----------|---------|---------|
| 정적 랜딩 페이지 | 0-1 | Fullstack 1명 (PM 직접) | 단일 Phase | 2-3분 | ~$0.50 |
| 블로그/포트폴리오 | 1-2 | 안 A: 3인 | 2 Phase | 3-5분 | ~$1.00 |
| 표준 웹앱 (CRUD) | 2-3 | 안 A: 3인 | 3 Phase | 5-8분 | ~$2.00 |
| 이커머스 (결제) | 4-5 | 안 B: 4인 | 4 Phase | 8-12분 | ~$3.50 |
| SaaS (구독+팀) | 5-6 | 안 B: 4인 | 5 Phase | 10-15분 | ~$4.50 |
| 복잡한 플랫폼 | 7+ | 안 C: 5인 | 5-6 Phase | 15-25분 | ~$6.00 |

### 6.3 팀 스케일 업/다운 규칙

```
스케일 업 트리거:
  - 단일 에이전트의 태스크가 10개 초과
  - 특정 Phase에서 예상 시간 2배 초과
  - 사용자가 "더 빠르게" 요청

스케일 다운 트리거:
  - 에이전트가 유휴 상태 (TeammateIdle 훅)
  - 남은 태스크가 단일 에이전트로 처리 가능
  - 예산 90% 소진 경고

스케일 업 방법:
  - Fullstack Agent --> Frontend Agent + Backend Agent 분리
  - Foundation Agent --> DB Agent + QA Agent 분리
  - Quality Agent에 보안 전문 서브에이전트 추가 스폰
```

---

## 7. 에이전트 파일 구조 설계 (.claude/agents/)

### 7.1 권장 파일 구조

```
.claude/
├── agents/
│   ├── dev/                      # 개발 에이전트
│   │   ├── pm.md                 # PM Agent (팀장) 정의
│   │   ├── fullstack.md          # Fullstack Agent 정의 (안 A)
│   │   ├── frontend.md           # Frontend Agent 정의 (안 B/C)
│   │   ├── backend.md            # Backend Agent 정의 (안 B/C)
│   │   └── foundation.md         # Foundation Agent 정의 (안 A)
│   │
│   ├── quality/                  # 품질 에이전트
│   │   ├── quality.md            # Quality Agent 정의 (안 B)
│   │   ├── guardian.md           # Guardian Agent 정의 (안 C)
│   │   └── code-reviewer.md      # 코드 리뷰 서브에이전트
│   │
│   └── data/                     # 데이터 에이전트
│       └── data.md               # Data Agent 정의 (안 C)
│
├── settings.json                 # 팀 설정 (Agent Teams 활성화)
└── worktrees/                    # 에이전트별 격리 워크트리 (자동 생성)
```

### 7.2 에이전트 정의 파일 예시 (개선)

#### PM Agent (pm.md)

```markdown
---
name: pm
description: 프로젝트 매니저. 요구사항 분석, 팀 구성, 태스크 분배, 머지 관리, 배포.
tools: Read, Write, Edit, Bash, Glob, Grep, Agent(fullstack, frontend, backend, foundation, quality, guardian, data)
model: opus
permissionMode: plan
memory: project
hooks:
  TaskCompleted:
    - type: command
      command: "./scripts/validate-task-completion.sh"
---

당신은 YHAI 프로젝트의 PM Agent입니다.

## 핵심 원칙: Coordinator, Never Coder
- 직접 코드를 작성하지 마세요 (Phase 0 스캐폴딩 제외)
- 태스크를 구체적으로 분해하여 팀메이트에게 위임하세요
- API 인터페이스를 중재하세요 (FE <-> BE 계약 정의)
- 머지 충돌을 해결하세요

## 팀 구성 결정 기준
- 복잡도 0-2점: 안 A (3인 Lean Team)
- 복잡도 3-5점: 안 B (4인 Standard Team)
- 복잡도 6점+: 안 C (5인 Expert Team)

## 태스크 분배 규칙
- 팀메이트당 5-6개 태스크 (최대 10개)
- 각 태스크에 파일 경로, 수용 기준, 산출물 명시
- 의존성 있는 태스크는 순차 Phase로 분리

## 완료 보고 형식
팀메이트의 작업 완료 시 다음을 확인:
1. TypeScript 타입 에러 없음 (tsc --noEmit)
2. ESLint 통과
3. 빌드 성공 (next build)
```

#### Fullstack Agent (fullstack.md) -- 안 A용

```markdown
---
name: fullstack
description: Next.js 15 풀스택 개발자. UI 컴포넌트, 페이지, Server Actions, API Routes 구현.
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
isolation: worktree
memory: project
mcpServers:
  - shadcn
hooks:
  PostToolUse:
    - matcher: "Write|Edit"
      hooks:
        - type: command
          command: "npx eslint --fix ${TOOL_INPUT_PATH} 2>/dev/null || true"
---

당신은 Next.js 15 + React 19 + TailwindCSS v4 풀스택 개발자입니다.

## 담당 영역
- 파일 소유권: src/app/, src/components/, src/lib/, src/hooks/, src/actions/
- 수정 금지: supabase/, prisma/, __tests__/, e2e/

## 핵심 규칙
- App Router 사용 (pages/ 아님)
- Server Components 기본, 'use client'는 필요시에만
- Server Actions로 폼 제출 + 데이터 변경 처리
- shadcn/ui 컴포넌트 우선 사용
- TypeScript strict 모드
- 파일명: kebab-case, 컴포넌트명: PascalCase

## API 인터페이스 계약
- .contracts/api-schema.ts의 타입 정의를 준수
- 새로운 API 엔드포인트 필요 시 PM에게 메시지로 요청

## 완료 조건
- TypeScript 타입 에러 없음
- ESLint 통과
- 반응형 레이아웃 (모바일 우선)
- 모든 Server Actions에 Zod 입력 검증
```

#### Quality Agent (quality.md) -- 안 B용

```markdown
---
name: quality
description: 품질 보증 엔지니어. 테스트 작성/실행, 코드 리뷰, 빌드 검증, 접근성 검사.
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

당신은 품질 보증(QA) 엔지니어이자 코드 리뷰어입니다.

## 담당 영역
- 파일 소유권: __tests__/, e2e/, .github/workflows/
- 읽기 전용: src/ (코드 리뷰 목적)

## 테스트 전략
1. 단위 테스트 (Vitest): 유틸리티, 훅, Server Actions
2. 통합 테스트: Supabase 연동 (모킹 활용)
3. E2E 테스트 (Playwright): 핵심 사용자 플로우
4. 접근성 검사: axe-core 규칙 적용

## 조기 QA 원칙
- DB 스키마 완성 직후 데이터 모델 테스트 작성 시작
- API 인터페이스 정의 직후 통합 테스트 스텁 작성
- UI 완성 전 E2E 테스트 시나리오 사전 준비

## 버그 리포트 형식
테스트 실패 시 PM에게 다음 형식으로 보고:
- 실패 테스트명
- 에러 메시지
- 원인 분석
- 수정 제안 (파일 경로 + 코드 변경 내용)

## 완료 조건
- 핵심 플로우 E2E 테스트 3개 이상
- 유틸리티 함수 커버리지 80% 이상
- 모든 테스트 통과
```

---

## 8. 창의적 아이디어

### 8.1 "에이전트 디베이트" 패턴

아키텍처 결정이 필요할 때, 2명의 에이전트가 서로 다른 방안을 옹호하고 PM이 최종 결정.

```
예시: 상태 관리 방식 결정
  Agent A: "Zustand가 적합. 서버 상태는 React Query로."
  Agent B: "Server Components + URL State로 충분. 클라이언트 상태 최소화."
  PM: Agent B 채택 -- Next.js 15의 Server Components 패러다임에 부합
```

### 8.2 "Rotating QA" 패턴

Quality Agent가 Phase 2부터 참여하여 다른 에이전트의 코드를 실시간으로 리뷰. Phase 4에서 집중 테스트가 아니라 "지속적 품질 보증".

```
Phase 1: DB 스키마 --> Quality가 데이터 모델 테스트 작성
Phase 2: FE/BE 구현 --> Quality가 단위 테스트 병렬 작성
Phase 3: 연동 --> Quality가 통합 테스트 작성
Phase 4: Quality가 E2E 테스트 + 최종 검증
```

### 8.3 "Contract-First Development" 패턴

PM Agent가 Phase 0에서 모든 API 인터페이스를 TypeScript 타입으로 정의하고, FE/BE가 이 "계약"을 준수하며 독립적으로 구현.

```typescript
// .contracts/api-schema.ts (PM Agent가 생성)
export interface ProductAPI {
  'GET /api/products': {
    query: { category?: string; page?: number };
    response: { products: Product[]; total: number };
  };
  'POST /api/products': {
    body: CreateProductInput;
    response: Product;
  };
}
```

이 패턴은 FE/BE 에이전트가 서로 대기할 필요 없이 완전 병렬 구현을 가능하게 함.

### 8.4 "Shadow Agent" 패턴

Haiku 모델로 "그림자 에이전트"를 저렴하게 실행하여 주 에이전트의 코드를 실시간 검증.

```
Frontend Agent (Sonnet) -- 코드 작성
  |
  +-- Shadow (Haiku) -- 타입 체크, 린트, 접근성 경고를 실시간 피드백
```

비용: Haiku는 Sonnet의 약 1/10 비용으로 지속적 검증 가능.

---

## 9. 팀장 추천 의견

### 9.1 단계별 적용 전략

조사 결과와 YHAI의 현재 개발 단계를 고려한 팀장의 추천:

**MVP 단계 (Phase 1)**: 안 A (3인 Lean Team) 적용
- PM + Fullstack + Foundation으로 시작
- 단순하고 검증 가능한 구조
- 토큰 비용 최소화
- 이 단계에서 에이전트 간 협업 패턴을 학습

**성장 단계 (Phase 2-3)**: 안 B (4인 Standard Team) 기본, 동적 확장
- 프로젝트 복잡도에 따라 안 A <-> 안 B 자동 전환
- Contract-First Development 패턴 도입
- Rotating QA 패턴 적용

**성숙 단계 (Phase 4)**: 안 C (5인 Expert Team) + 고급 패턴
- 에이전트 디베이트, Shadow Agent 등 고급 패턴 적용
- 에이전트 영속 메모리 활용
- A/B 빌드 (동일 요구사항 2버전 병렬 생성) 지원

### 9.2 핵심 결정 포인트

| 결정 | 추천 | 근거 |
|------|------|------|
| 기본 팀 구성 | 안 B (4인) | 병렬 구현 + 조기 QA 가능, 비용 합리적 |
| 팀 구성 방식 | 하이브리드 (기본 고정 + 동적 확장) | 예측 가능성 + 유연성 |
| DB Agent 독립 여부 | Backend에 통합 | Server Actions <-> DB 인터페이스 불일치 제거 |
| QA 시점 | 조기 QA (Phase 1부터 참여) | 후행적 QA의 비효율 방지 |
| DevOps Agent | PM에 통합 | Vercel 배포는 PM이 단독 처리 가능 |
| 오케스트레이션 | 중앙집중 + 메시지박스 하이브리드 | PM 중앙 조율 + FE-BE 직접 통신 |
| 에이전트 간 계약 | Contract-First (TypeScript 타입) | 병렬 구현 시 인터페이스 불일치 방지 |

---

## 10. 다음 단계

1. **사용자 리뷰**: 3가지 팀 구성안 (A/B/C) 중 기본 구성 선택
2. **에이전트 정의 파일 구현**: 선택된 안의 `.claude/agents/` 파일 작성
3. **Contract-First 템플릿 설계**: `.contracts/` 디렉토리 구조 + 타입 템플릿
4. **파이프라인 연동**: 팀 구성과 Phase 실행 흐름의 YHAI 백엔드 구현

---

## 참고 자료

### 조사 출처

- [Claude Code Agent Teams 공식 문서](https://code.claude.com/docs/en/agent-teams)
- [Claude Code Agent Teams 완전 가이드 2026](https://claudefa.st/blog/guide/agents/agent-teams)
- [Claude Code Agent Teams Best Practices & Troubleshooting](https://claudefa.st/blog/guide/agents/agent-teams-best-practices)
- [Claude Code Swarms - Addy Osmani](https://addyosmani.com/blog/claude-code-agent-teams/)
- [Building a C compiler with parallel Claudes - Anthropic](https://www.anthropic.com/engineering/building-c-compiler)
- [How we built our multi-agent research system - Anthropic](https://www.anthropic.com/engineering/multi-agent-research-system)
- [AI Agent Orchestration Patterns - Microsoft Azure](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)
- [AI Agent Orchestration in 2026 - Kanerika](https://kanerika.com/blogs/ai-agent-orchestration/)
- [Multi-Agent Systems Guide 2026 - Codebridge](https://www.codebridge.tech/articles/mastering-multi-agent-orchestration-coordination-is-the-new-scale-frontier)
- [Single Agent vs Multi-Agent Teams 2026 - Taskade](https://www.taskade.com/blog/single-agent-systems-versus-multi-agent-ai-teams)
- [Multi-agent systems - Google ADK](https://google.github.io/adk-docs/agents/multi-agents/)
- [AI Agent Frameworks 2026 - CalmOps](https://calmops.com/ai/ai-agent-frameworks-comparison-2026/)
- [AI Agent Swarm Orchestration - Fast.io](https://fast.io/resources/ai-agent-swarm-orchestration/)
- [AI Agent Delegation Patterns - Zylos Research](https://zylos.ai/research/2026-03-08-ai-agent-delegation-team-coordination-patterns)
