# YHAI 정보 아키텍처 (Information Architecture)

> Plan 2 산출물
> 작성일: 2026-03-14
> 상태: Gate Review 대기
> 기반 문서: `docs/planning/user-scenarios.md` (v2), `docs/planning/proposals/deployment-strategy.md`, `docs/planning/master-plan.md`

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| v1 | 2026-03-14 | 초안 완성. 사이트맵, 화면 목록, 네비게이션, URL 구조, ERD, API 엔드포인트 |

---

## 1. 사이트맵 (전체 페이지 구조)

```
YHAI Platform
├── / (랜딩 페이지)
│   ├── /pricing (요금제)
│   ├── /gallery (프로젝트 갤러리 -- 스냅샷 포크용)
│   └── /docs (도움말/가이드)
│
├── /login (로그인)
├── /signup (회원가입)
├── /auth/callback (OAuth 콜백)
├── /forgot-password (비밀번호 찾기)
│
├── /dashboard (포탈 대시보드) ← 인증 필요
│   ├── 프로젝트 목록 (메인)
│   ├── /dashboard/new (새 프로젝트 생성 -- 인텐트 캡처)
│   └── /dashboard/templates (템플릿 선택)
│
├── /projects/[projectId] (프로젝트 상세) ← 탭 기반 네비게이션
│   ├── /projects/[projectId]/chat (채팅 -- 전문가 대화)
│   │   └── 사이드 패널: 전문가 목록, 전문가 갤러리
│   ├── /projects/[projectId]/requirements (요구사항 대시보드)
│   ├── /projects/[projectId]/team (AI 팀 구성/관리)
│   ├── /projects/[projectId]/build (빌드 진행 -- Mission Control)
│   │   └── 실시간 활동 로그, 에이전트별 진행률, 비용 대시보드
│   ├── /projects/[projectId]/preview (3-패널 미리보기)
│   │   └── 파일 트리 + 라이브 프리뷰 + 수정 대화
│   ├── /projects/[projectId]/deploy (배포 관리)
│   └── /projects/[projectId]/settings (프로젝트 설정)
│
├── /settings (계정 설정)
│   ├── /settings/profile (프로필)
│   ├── /settings/billing (결제/요금제)
│   ├── /settings/api-keys (API 키 관리)
│   └── /settings/notifications (알림 설정)
│
└── /admin (관리자 -- 내부 운영용)
    ├── /admin/users (사용자 관리)
    ├── /admin/projects (프로젝트 관리)
    ├── /admin/experts (전문가 관리)
    └── /admin/analytics (사용 통계)
```

---

## 2. 화면 목록 + 핵심 요소

### 2.1 퍼블릭 페이지 (비인증)

| # | 화면 | URL | 핵심 요소 | 시나리오 |
|---|------|-----|-----------|---------|
| P1 | 랜딩 페이지 | `/` | 히어로 섹션, 기능 소개, 사용 데모(빌드 리플레이), CTA, 가격 미리보기 | - |
| P2 | 요금제 | `/pricing` | 3단계 플랜(Free/Pro/Business), 기능 비교표, FAQ | - |
| P3 | 프로젝트 갤러리 | `/gallery` | 공개 프로젝트 카드, 필터(도메인/기술), 포크 버튼 | 시나리오 8.7 |
| P4 | 도움말 | `/docs` | 가이드, 튜토리얼, API 문서 | - |

### 2.2 인증 페이지

| # | 화면 | URL | 핵심 요소 | 시나리오 |
|---|------|-----|-----------|---------|
| A1 | 로그인 | `/login` | 소셜 로그인(Google/GitHub/Kakao), 이메일/비밀번호, Magic Link | 시나리오 1 |
| A2 | 회원가입 | `/signup` | 소셜 회원가입, 이메일 입력, 약관 동의 | 시나리오 1 |
| A3 | OAuth 콜백 | `/auth/callback` | 인증 처리 중 로딩, 리다이렉트 | 시나리오 1 |
| A4 | 비밀번호 찾기 | `/forgot-password` | 이메일 입력, 재설정 링크 발송 | - |

### 2.3 대시보드 (인증 필요)

| # | 화면 | URL | 핵심 요소 | 시나리오 |
|---|------|-----|-----------|---------|
| D1 | 대시보드 | `/dashboard` | 프로젝트 카드 목록(상태 뱃지), 새 프로젝트 버튼, 최근 활동 | 시나리오 5 |
| D2 | 새 프로젝트 생성 | `/dashboard/new` | 인텐트 캡처("무엇을 만들까요?"), 유사 사례 카드, 전문가 자동 추천 | 시나리오 1 |
| D3 | 템플릿 선택 | `/dashboard/templates` | 도메인별 템플릿 카드, 갤러리 포크 프로젝트 | 시나리오 8.7 |

### 2.4 프로젝트 상세 (탭 네비게이션)

| # | 화면 | URL | 핵심 요소 | 시나리오 |
|---|------|-----|-----------|---------|
| PJ1 | 채팅 | `/projects/[id]/chat` | 메인 채팅 영역, 전문가 아바타/색상 구분, 사이드 패널(전문가 목록), "+" 전문가 추가, 예시 칩, 진행률 바 | 시나리오 1, 2 |
| PJ2 | 요구사항 | `/projects/[id]/requirements` | 요구사항 카드(필수/권장/선택), 드래그&드롭 우선순위, AI 근거 표시, "확정" 버튼 | 시나리오 3 |
| PJ3 | AI 팀 | `/projects/[id]/team` | PM Agent 분석 스트리밍, 팀 구성 제안 카드, 역할 추가/제거, Phase 실행 계획, 비용 예측, "승인" 버튼 | 시나리오 3 |
| PJ4 | 빌드 (Mission Control) | `/projects/[id]/build` | Phase 진행 바, 에이전트별 진행률 카드, 실시간 활동 로그, 비용 대시보드, 코파일럿 입력창, 사고 과정 패널 | 시나리오 3 |
| PJ5 | 미리보기 | `/projects/[id]/preview` | 3-패널(파일 트리 + 라이브 프리뷰 + 수정 대화), 반응형 전환(모바일/태블릿/데스크톱), 포인트&토크 수정 | 시나리오 4 |
| PJ6 | 배포 | `/projects/[id]/deploy` | 배포 파이프라인 진행상태, 스테이징/프로덕션 URL, QR코드, 배포 이력 | 시나리오 4 |
| PJ7 | 프로젝트 설정 | `/projects/[id]/settings` | 프로젝트명, 도메인, 환경변수, 위험 영역(삭제) | - |

### 2.5 계정 설정

| # | 화면 | URL | 핵심 요소 | 시나리오 |
|---|------|-----|-----------|---------|
| S1 | 프로필 | `/settings/profile` | 이름, 아바타, 이메일, 비밀번호 변경 | - |
| S2 | 결제/요금제 | `/settings/billing` | 현재 플랜, 사용량, 결제 내역, 플랜 변경 | - |
| S3 | API 키 | `/settings/api-keys` | API 키 목록, 생성/폐기, 사용량 | - |
| S4 | 알림 | `/settings/notifications` | 이메일/슬랙 알림 설정, 빌드 완료 알림 | - |

---

## 3. 네비게이션 구조

### 3.1 글로벌 네비게이션 (비인증)

```
[YHAI 로고] ---- [기능 소개] [요금제] [갤러리] [도움말] ---- [로그인] [시작하기]
```

### 3.2 대시보드 레이아웃 (인증)

```
+--[ 사이드바 ]--+--[ 메인 콘텐츠 ]---------------------------+
|                |                                            |
| [YHAI 로고]    |  대시보드 / 프로젝트 상세 내용               |
|                |                                            |
| [대시보드]     |                                            |
| [새 프로젝트]  |                                            |
| [템플릿]       |                                            |
|                |                                            |
| --- 프로젝트 --+                                            |
| [PetBox 구독]  |                                            |
| [카페 예약]    |                                            |
| [+ 새 프로젝트]|                                            |
|                |                                            |
| --- 하단 ------+                                            |
| [설정]         |                                            |
| [프로필/로그아웃]|                                           |
+----------------+--------------------------------------------+
```

### 3.3 프로젝트 내부 탭 네비게이션

```
[< 대시보드]  PetBox 구독 서비스  [상태: 빌드 중]
+------+--------+------+-------+---------+-------+--------+
| 채팅 | 요구사항 | AI팀 | 빌드  | 미리보기 | 배포  | 설정   |
+------+--------+------+-------+---------+-------+--------+
|                                                          |
|  (선택된 탭의 콘텐츠)                                      |
|                                                          |
+----------------------------------------------------------+
```

### 3.4 프로젝트 상태별 탭 가용성

프로젝트 상태에 따라 접근 가능한 탭이 달라진다.

| 상태 | 채팅 | 요구사항 | AI팀 | 빌드 | 미리보기 | 배포 |
|------|:---:|:------:|:---:|:---:|:------:|:---:|
| CHATTING | O (활성) | - | - | - | - | - |
| REQUIREMENTS_REVIEW | O | O (활성) | - | - | - | - |
| TEAM_PLANNING | O | O (읽기) | O (활성) | - | - | - |
| BUILDING | O (코파일럿) | O (읽기) | O (읽기) | O (활성) | - | - |
| BUILD_COMPLETE | O | O | O | O (읽기) | O (활성) | - |
| DEPLOYING | O | O | O | O | O | O (활성) |
| DEPLOYED | O | O | O | O | O | O (관리) |

---

## 4. URL 구조 (Next.js App Router)

### 4.1 디렉토리 구조

```
src/app/
├── (public)/                    # Route Group: 퍼블릭 레이아웃
│   ├── layout.tsx               # 퍼블릭 헤더/푸터
│   ├── page.tsx                 # / 랜딩 페이지
│   ├── pricing/page.tsx         # /pricing
│   ├── gallery/page.tsx         # /gallery
│   └── docs/
│       ├── page.tsx             # /docs
│       └── [slug]/page.tsx      # /docs/getting-started
│
├── (auth)/                      # Route Group: 인증 레이아웃
│   ├── layout.tsx               # 인증 페이지 레이아웃 (센터 카드)
│   ├── login/page.tsx           # /login
│   ├── signup/page.tsx          # /signup
│   ├── forgot-password/page.tsx # /forgot-password
│   └── auth/callback/route.ts   # /auth/callback (API Route)
│
├── (portal)/                    # Route Group: 포탈 레이아웃 (사이드바)
│   ├── layout.tsx               # 사이드바 + 헤더 레이아웃
│   ├── dashboard/
│   │   ├── page.tsx             # /dashboard
│   │   ├── new/page.tsx         # /dashboard/new
│   │   └── templates/page.tsx   # /dashboard/templates
│   │
│   ├── projects/[projectId]/
│   │   ├── layout.tsx           # 프로젝트 탭 레이아웃
│   │   ├── page.tsx             # /projects/[id] → 리다이렉트 to /chat
│   │   ├── chat/page.tsx        # /projects/[id]/chat
│   │   ├── requirements/page.tsx # /projects/[id]/requirements
│   │   ├── team/page.tsx        # /projects/[id]/team
│   │   ├── build/page.tsx       # /projects/[id]/build
│   │   ├── preview/page.tsx     # /projects/[id]/preview
│   │   ├── deploy/page.tsx      # /projects/[id]/deploy
│   │   └── settings/page.tsx    # /projects/[id]/settings
│   │
│   └── settings/
│       ├── layout.tsx           # 설정 사이드 네비게이션
│       ├── page.tsx             # /settings → 리다이렉트 to /profile
│       ├── profile/page.tsx     # /settings/profile
│       ├── billing/page.tsx     # /settings/billing
│       ├── api-keys/page.tsx    # /settings/api-keys
│       └── notifications/page.tsx # /settings/notifications
│
├── (admin)/                     # Route Group: 관리자 레이아웃
│   ├── layout.tsx               # 관리자 전용 레이아웃
│   └── admin/
│       ├── page.tsx             # /admin
│       ├── users/page.tsx       # /admin/users
│       ├── projects/page.tsx    # /admin/projects
│       ├── experts/page.tsx     # /admin/experts
│       └── analytics/page.tsx   # /admin/analytics
│
├── api/                         # API Routes
│   ├── chat/
│   │   └── stream/route.ts     # SSE 채팅 스트리밍
│   ├── projects/
│   │   └── [projectId]/
│   │       ├── route.ts         # 프로젝트 CRUD
│   │       ├── requirements/route.ts
│   │       ├── team/route.ts
│   │       ├── build/
│   │       │   ├── route.ts     # 빌드 시작/중지
│   │       │   └── stream/route.ts # 빌드 진행 SSE
│   │       └── deploy/route.ts
│   ├── experts/route.ts         # 전문가 목록/추천
│   ├── auth/
│   │   └── [...supabase]/route.ts # Supabase Auth 핸들러
│   └── webhooks/
│       ├── vercel/route.ts      # Vercel 배포 웹훅
│       └── stripe/route.ts      # 결제 웹훅
│
├── layout.tsx                   # Root Layout (html, body, providers)
└── not-found.tsx                # 404 페이지
```

### 4.2 레이아웃 중첩 계층

```
Root Layout (ThemeProvider, Toaster, AuthProvider)
├── (public) Layout -- 퍼블릭 헤더/푸터
├── (auth) Layout -- 인증 카드 센터 정렬
├── (portal) Layout -- 사이드바 + 인증 가드
│   ├── Dashboard 페이지들
│   ├── Project Layout -- 프로젝트 탭 네비게이션
│   │   └── 각 탭 페이지 (chat, requirements, team, build, preview, deploy)
│   └── Settings Layout -- 설정 사이드 네비게이션
└── (admin) Layout -- 관리자 레이아웃 + 권한 가드
```

---

## 5. 데이터 모델 (ERD)

### 5.1 핵심 엔티티

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
│    User      │     │    Project       │     │  Conversation    │
├─────────────┤     ├─────────────────┤     ├──────────────────┤
│ id (PK)     │──┐  │ id (PK)         │──┐  │ id (PK)          │
│ email       │  │  │ userId (FK)     │  │  │ projectId (FK)   │
│ name        │  │  │ name            │  │  │ title            │
│ avatarUrl   │  │  │ description     │  │  │ createdAt        │
│ plan        │  │  │ status          │  │  │ updatedAt        │
│ role        │  │  │ domain          │  └──│                  │
│ createdAt   │  │  │ techStack (json)│     └──────────────────┘
│ updatedAt   │  │  │ deployUrl       │              │
└─────────────┘  │  │ createdAt       │              │
                 │  │ updatedAt       │     ┌────────┴─────────┐
                 │  └─────────────────┘     │    Message        │
                 │           │              ├──────────────────┤
                 │           │              │ id (PK)          │
                 │           │              │ conversationId   │
                 │           │              │ role             │
                 │           │              │ content          │
                 │           │              │ expertId (FK?)   │
                 │           │              │ metadata (json)  │
                 │           │              │ createdAt        │
                 │           │              └──────────────────┘
                 │           │
                 │  ┌────────┴─────────┐
                 │  │ ConversationExpert│
                 │  ├──────────────────┤
                 │  │ id (PK)          │
                 │  │ conversationId   │
                 │  │ expertId (FK)    │
                 │  │ joinedAt         │
                 │  │ leftAt           │
                 │  └──────────────────┘
                 │
                 │  ┌─────────────────┐
                 │  │ ExpertProfile    │
                 │  ├─────────────────┤
                 │  │ id (PK)         │
                 │  │ name            │
                 │  │ domain          │
                 │  │ avatar          │
                 │  │ color           │
                 │  │ systemPrompt    │
                 │  │ triggerKeywords │
                 │  │ description     │
                 │  │ capabilities    │
                 │  │ isDefault       │
                 │  └─────────────────┘
                 │
                 │  ┌─────────────────────┐
                 └──│    Requirement       │
                    ├─────────────────────┤
                    │ id (PK)             │
                    │ projectId (FK)      │
                    │ title               │
                    │ description         │
                    │ priority (필수/권장/선택) │
                    │ category            │
                    │ status (draft/confirmed) │
                    │ suggestedBy (expertId)   │
                    │ sortOrder           │
                    │ createdAt           │
                    └─────────────────────┘
```

### 5.2 빌드 관련 엔티티

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    Team          │     │    Agent          │     │    Task           │
├─────────────────┤     ├──────────────────┤     ├──────────────────┤
│ id (PK)         │──┐  │ id (PK)          │──┐  │ id (PK)          │
│ projectId (FK)  │  │  │ teamId (FK)      │  │  │ agentId (FK)     │
│ composition     │  │  │ role             │  │  │ phaseId (FK)     │
│ status          │  │  │ name             │  │  │ title            │
│ totalCost       │  │  │ systemPrompt     │  │  │ description      │
│ createdAt       │  │  │ model            │  │  │ status           │
└─────────────────┘  │  │ status           │  │  │ dependencies     │
                     │  │ worktreePath     │  │  │ artifacts (json) │
                     └──│ tokenUsage       │  │  │ tokenUsage       │
                        │ cost             │  └──│ startedAt        │
                        └──────────────────┘     │ completedAt      │
                                                 └──────────────────┘

┌──────────────────┐     ┌──────────────────┐
│    Phase          │     │  AgentMessage     │
├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │
│ teamId (FK)      │     │ fromAgentId (FK) │
│ number           │     │ toAgentId (FK)   │
│ name             │     │ teamId (FK)      │
│ type (순차/병렬)  │     │ content          │
│ status           │     │ type (api_agree/  │
│ estimatedTime    │     │   escalation/     │
│ estimatedCost    │     │   type_share)     │
│ actualCost       │     │ createdAt        │
│ startedAt        │     └──────────────────┘
│ completedAt      │
└──────────────────┘
```

### 5.3 배포 관련 엔티티

```
┌──────────────────┐     ┌──────────────────┐
│  Deployment       │     │  ActivityLog      │
├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │
│ projectId (FK)   │     │ projectId (FK)   │
│ environment      │     │ type             │
│ provider (vercel)│     │ agentId (FK?)    │
│ providerDeployId │     │ message          │
│ url              │     │ metadata (json)  │
│ status           │     │ createdAt        │
│ buildLog         │     └──────────────────┘
│ createdAt        │
│ updatedAt        │
└──────────────────┘

┌──────────────────┐     ┌──────────────────┐
│  Artifact         │     │  BuildSnapshot    │
├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │
│ taskId (FK)      │     │ projectId (FK)   │
│ projectId (FK)   │     │ phaseId (FK)     │
│ filePath         │     │ gitCommitHash    │
│ content          │     │ metadata (json)  │
│ type (file/dir)  │     │ createdAt        │
│ createdAt        │     └──────────────────┘
│ updatedAt        │
└──────────────────┘
```

### 5.4 결제/사용량 엔티티

```
┌──────────────────┐     ┌──────────────────┐
│  Subscription     │     │  UsageRecord      │
├──────────────────┤     ├──────────────────┤
│ id (PK)          │     │ id (PK)          │
│ userId (FK)      │     │ userId (FK)      │
│ plan             │     │ projectId (FK)   │
│ status           │     │ type (token/build │
│ currentPeriodEnd │     │   /deploy)       │
│ stripeCustomerId │     │ amount           │
│ stripeSubId      │     │ cost             │
│ createdAt        │     │ createdAt        │
└──────────────────┘     └──────────────────┘
```

### 5.5 엔티티 관계 요약

```
User ──1:N──> Project ──1:1──> Conversation ──1:N──> Message
                │                    │
                │                    └──N:M──> ExpertProfile
                │                              (via ConversationExpert)
                │
                ├──1:N──> Requirement
                │
                ├──1:1──> Team ──1:N──> Agent ──1:N──> Task
                │           │                    └──> AgentMessage
                │           └──1:N──> Phase
                │
                ├──1:N──> Deployment
                ├──1:N──> Artifact
                ├──1:N──> BuildSnapshot
                └──1:N──> ActivityLog

User ──1:1──> Subscription
User ──1:N──> UsageRecord
```

### 5.6 프로젝트 상태 머신

```
CHATTING
   │ (요구사항 충분히 수집됨)
   v
REQUIREMENTS_REVIEW
   │ (사용자 "요구사항 확정" 클릭)
   v
TEAM_PLANNING
   │ (사용자 "팀 구성 승인" + "Phase 계획 승인")
   v
BUILDING
   │ (모든 Phase 완료 + QA 통과)
   v
BUILD_COMPLETE
   │ (사용자 수정 요청 시 → BUILDING으로 복귀 가능)
   v
DEPLOYING
   │ (배포 완료)
   v
DEPLOYED
   │ (기능 추가 요청 시 → CHATTING으로 복귀)
   v
ARCHIVED (사용자 수동 아카이브)
```

---

## 6. API 엔드포인트 목록

### 6.1 인증 API

| Method | Endpoint | 설명 | 비고 |
|--------|----------|------|------|
| POST | `/auth/signup` | 회원가입 | Supabase Auth |
| POST | `/auth/login` | 로그인 | Supabase Auth |
| POST | `/auth/logout` | 로그아웃 | Supabase Auth |
| POST | `/auth/refresh` | 토큰 갱신 | Supabase Auth |
| GET | `/auth/callback` | OAuth 콜백 | Supabase Auth |
| POST | `/auth/forgot-password` | 비밀번호 재설정 | Supabase Auth |
| GET | `/auth/me` | 현재 사용자 정보 | Supabase Auth |

### 6.2 프로젝트 API

| Method | Endpoint | 설명 | 요청 바디 |
|--------|----------|------|----------|
| GET | `/api/projects` | 내 프로젝트 목록 | ?status=&page=&size= |
| POST | `/api/projects` | 새 프로젝트 생성 | { name, description, intent } |
| GET | `/api/projects/:id` | 프로젝트 상세 | - |
| PATCH | `/api/projects/:id` | 프로젝트 수정 | { name?, description?, status? } |
| DELETE | `/api/projects/:id` | 프로젝트 삭제 | - |

### 6.3 채팅/대화 API

| Method | Endpoint | 설명 | 비고 |
|--------|----------|------|------|
| GET | `/api/projects/:id/conversation` | 대화 조회 | 메시지 페이지네이션 |
| POST | `/api/projects/:id/conversation/messages` | 메시지 전송 | SSE 응답 스트리밍 |
| GET | `/api/projects/:id/conversation/messages` | 메시지 목록 | ?cursor=&limit= |

### 6.4 전문가 API

| Method | Endpoint | 설명 | 비고 |
|--------|----------|------|------|
| GET | `/api/experts` | 전문가 전체 목록 | 갤러리용 |
| GET | `/api/experts/recommend` | 전문가 추천 | ?projectId=&context= |
| POST | `/api/projects/:id/experts` | 전문가 초빙 | { expertId } |
| DELETE | `/api/projects/:id/experts/:expertId` | 전문가 퇴장 | - |
| GET | `/api/projects/:id/experts` | 참여 전문가 목록 | - |

### 6.5 요구사항 API

| Method | Endpoint | 설명 | 비고 |
|--------|----------|------|------|
| GET | `/api/projects/:id/requirements` | 요구사항 목록 | 카테고리/우선순위별 |
| POST | `/api/projects/:id/requirements` | 요구사항 추가 | { title, description, priority } |
| PATCH | `/api/projects/:id/requirements/:reqId` | 요구사항 수정 | { title?, priority?, sortOrder? } |
| DELETE | `/api/projects/:id/requirements/:reqId` | 요구사항 삭제 | - |
| POST | `/api/projects/:id/requirements/confirm` | 요구사항 확정 | 상태 -> TEAM_PLANNING |
| POST | `/api/projects/:id/requirements/extract` | AI 자동 추출 | 대화에서 요구사항 추출 |

### 6.6 AI 팀/빌드 API

| Method | Endpoint | 설명 | 비고 |
|--------|----------|------|------|
| POST | `/api/projects/:id/team/analyze` | PM Agent 분석 시작 | SSE 분석 과정 스트리밍 |
| GET | `/api/projects/:id/team` | 팀 구성 조회 | 에이전트 목록 + Phase 계획 |
| PATCH | `/api/projects/:id/team` | 팀 구성 수정 | { agents: [...] } |
| POST | `/api/projects/:id/team/approve` | 팀 구성 승인 | - |
| POST | `/api/projects/:id/build/start` | 빌드 시작 | - |
| POST | `/api/projects/:id/build/pause` | 빌드 일시정지 | - |
| POST | `/api/projects/:id/build/resume` | 빌드 재개 | - |
| GET | `/api/projects/:id/build/status` | 빌드 상태 조회 | Phase별 진행률 |
| GET | `/api/projects/:id/build/stream` | 빌드 실시간 스트리밍 | SSE: 활동로그, 진행률, 비용 |
| POST | `/api/projects/:id/build/copilot` | 코파일럿 메시지 | 빌드 중 사용자 개입 |
| GET | `/api/projects/:id/build/thinking` | 사고 과정 스트리밍 | SSE: 에이전트 사고 과정 |

### 6.7 미리보기/배포 API

| Method | Endpoint | 설명 | 비고 |
|--------|----------|------|------|
| GET | `/api/projects/:id/preview/files` | 파일 트리 조회 | - |
| GET | `/api/projects/:id/preview/files/:path` | 파일 내용 조회 | - |
| POST | `/api/projects/:id/preview/modify` | 포인트&토크 수정 | { element, instruction } |
| POST | `/api/projects/:id/deploy` | 배포 시작 | { environment } |
| GET | `/api/projects/:id/deploy/status` | 배포 상태 | - |
| GET | `/api/projects/:id/deploy/history` | 배포 이력 | - |

### 6.8 설정/결제 API

| Method | Endpoint | 설명 | 비고 |
|--------|----------|------|------|
| GET | `/api/settings/profile` | 프로필 조회 | - |
| PATCH | `/api/settings/profile` | 프로필 수정 | - |
| GET | `/api/settings/billing` | 결제 정보 | 현재 플랜, 사용량 |
| POST | `/api/settings/billing/subscribe` | 플랜 구독 | Stripe Checkout |
| POST | `/api/settings/billing/cancel` | 구독 취소 | - |
| GET | `/api/settings/api-keys` | API 키 목록 | - |
| POST | `/api/settings/api-keys` | API 키 생성 | - |
| DELETE | `/api/settings/api-keys/:keyId` | API 키 삭제 | - |
| GET | `/api/usage` | 사용량 조회 | ?period=monthly |

### 6.9 갤러리/포크 API

| Method | Endpoint | 설명 | 비고 |
|--------|----------|------|------|
| GET | `/api/gallery` | 공개 프로젝트 목록 | ?domain=&sort=popular |
| GET | `/api/gallery/:id` | 프로젝트 상세 미리보기 | - |
| POST | `/api/gallery/:id/fork` | 프로젝트 포크 | 새 프로젝트 생성 |

### 6.10 웹훅 API

| Method | Endpoint | 설명 | 비고 |
|--------|----------|------|------|
| POST | `/api/webhooks/vercel` | Vercel 배포 이벤트 | 배포 완료/실패 알림 |
| POST | `/api/webhooks/stripe` | Stripe 결제 이벤트 | 결제 완료/실패 처리 |

---

## 7. 사용자 플로우 (화면 매핑)

### 7.1 시나리오 1-2: 온보딩 → 전문가 대화

```
[P1 랜딩] → [A2 회원가입] → [D2 새 프로젝트(인텐트 캡처)]
    → [D2 유사 사례 카드] → [D2 전문가 추천]
    → [PJ1 채팅(가이디드 대화)]
    → [PJ1 사이드패널(전문가 추가/제거)]
```

### 7.2 시나리오 3: 요구사항 → 팀 → 빌드

```
[PJ1 채팅] → 시스템 "요구사항 정리하자"
    → [PJ2 요구사항(카드 정렬/확정)]
    → [PJ3 AI팀(PM 분석 스트리밍 → 팀 구성 → Phase 계획)]
    → 사용자 "팀 승인" + "Phase 승인"
    → [PJ4 빌드(Mission Control)]
    → 코파일럿 입력, 사고 과정 확인
```

### 7.3 시나리오 4: 미리보기 → 배포

```
[PJ4 빌드 완료] → [PJ5 미리보기(3-패널)]
    → 포인트&토크 수정 → 부분 재빌드 → [PJ5 재확인]
    → [PJ6 배포(스테이징 → 프로덕션)]
    → 배포 완료 → [D1 대시보드]
```

### 7.4 시나리오 5: 프로젝트 재방문

```
[D1 대시보드(프로젝트 카드)] → [PJ1 채팅(컨텍스트 복원)]
    → 전문가 "이전 대화 기억" + 변경 영향 분석
    → [PJ2 요구사항 추가] → 부분 재빌드 → [PJ5 미리보기] → [PJ6 재배포]
```

---

## 8. 실시간 통신 아키텍처

### 8.1 통신 채널 설계

| 기능 | 프로토콜 | 엔드포인트 | 용도 |
|------|---------|-----------|------|
| 채팅 응답 | SSE | `/api/projects/:id/conversation/messages` | Claude AI 응답 스트리밍 |
| 빌드 진행 | Supabase Realtime | `build_events` 채널 | 에이전트 활동, 진행률, 비용 |
| 팀 분석 | SSE | `/api/projects/:id/team/analyze` | PM Agent 분석 과정 스트리밍 |
| 사고 과정 | SSE | `/api/projects/:id/build/thinking` | 에이전트 의사결정 과정 |
| 배포 상태 | Supabase Realtime | `deployment_events` 채널 | 배포 파이프라인 상태 |
| 알림 | Supabase Realtime | `notifications` 채널 | 빌드 완료, 에러 등 알림 |

### 8.2 Supabase Realtime 채널 구조

```
프로젝트별 격리:
  project:{projectId}:build    -- 빌드 이벤트 (에이전트 활동, Phase 전환)
  project:{projectId}:deploy   -- 배포 이벤트
  user:{userId}:notifications  -- 사용자 알림
```

---

## 9. 기술 결정 요약

| 영역 | 결정 | 근거 |
|------|------|------|
| 네비게이션 | 사이드바(포탈) + 탭(프로젝트 내부) | SaaS 표준 패턴, 2단계 계층으로 복잡도 관리 |
| URL 구조 | Next.js App Router Route Groups | 레이아웃 재사용, 인증/비인증 분리 |
| DB | Supabase PostgreSQL + RLS | 확정된 배포 전략 반영, 멀티테넌트 지원 |
| 실시간 | SSE(채팅) + Supabase Realtime(빌드/배포) | 채팅은 단방향 스트리밍, 빌드는 양방향 필요 |
| API 스타일 | RESTful + SSE 하이브리드 | CRUD는 REST, 실시간은 SSE/Realtime |
| 인증 | Supabase Auth (OAuth + Email) | 확정된 배포 전략의 올인원 접근 |

---

## 부록: 참조 문서

- 서비스 시나리오: `docs/planning/user-scenarios.md` (v2)
- 배포 전략: `docs/planning/proposals/deployment-strategy.md` (v2)
- 팀 구성: `docs/planning/proposals/team-composition-ideas.md`
- 마스터 플랜: `docs/planning/master-plan.md`
- IA 패턴 조사: `docs/planning/research/information-architecture-patterns.md`
