# YHAI 시스템 아키텍처 설계서

> Plan 3 산출물
> 작성일: 2026-03-14
> 상태: 초안
> 기반 문서:
> - `docs/planning/master-plan.md`
> - `docs/planning/information-architecture.md` (Plan 2)
> - `docs/planning/proposals/deployment-strategy.md`
> - `docs/planning/proposals/vercel-supabase-architecture.md`
> - `docs/planning/proposals/claude-code-dev-automation.md`
> - `docs/planning/decisions.md` (D-001 ~ D-011)

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| v1 | 2026-03-14 | 초안 완성. 10개 섹션 전체 작성 |

---

## 1. 시스템 구성도

### 1.1 전체 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────────┐
│                          클라이언트 (브라우저)                         │
│  Next.js 15 App Router (RSC + Client Components)                   │
│  ├─ React Query (서버 상태)                                         │
│  ├─ Zustand (클라이언트 상태)                                        │
│  ├─ SSE 클라이언트 (채팅/빌드 스트리밍)                                │
│  └─ Supabase Realtime 클라이언트 (이벤트 구독)                        │
└────────────┬──────────────────────────┬────────────────────────┬────┘
             │ HTTPS (REST/SSE)        │ WSS                   │
             │                         │ (Supabase Realtime)   │
             ▼                         ▼                       │
┌────────────────────────┐  ┌──────────────────────┐           │
│   Vercel Edge Network   │  │   Supabase Platform   │           │
│   (프론트엔드 호스팅)     │  │                      │           │
│                        │  │  ├─ Auth (JWT)        │           │
│  ├─ Static Assets      │  │  ├─ Realtime (WSS)   │◄──────────┘
│  ├─ Server Components  │  │  ├─ Storage (S3)     │
│  ├─ API Routes (BFF)   │  │  └─ PostgreSQL (RLS) │
│  └─ Middleware (Auth)  │  └──────────┬───────────┘
└────────────┬───────────┘             │
             │ HTTPS                   │ PostgreSQL Wire Protocol
             ▼                         │
┌────────────────────────────────────┐ │
│       FastAPI 백엔드 서버             │ │
│       (별도 서버 / Vercel Pro)       │ │
│                                    │ │
│  ┌──────────────────────────────┐  │ │
│  │        API Gateway           │  │ │
│  │  ├─ JWT 검증 (Guard)        │  │ │
│  │  ├─ Rate Limiting           │  │ │
│  │  ├─ CORS                    │  │ │
│  │  └─ Request Validation      │  │ │
│  └──────────────────────────────┘  │ │
│                                    │ │
│  ┌──────────┐  ┌──────────┐       │ │
│  │ Auth     │  │ Projects │       │ │
│  │ Module   │  │ Module   │       │ │
│  └──────────┘  └──────────┘       │ │
│  ┌──────────┐  ┌──────────┐       │ │
│  │ Chat     │  │ Experts  │       │ │
│  │ Module   │  │ Module   │       │ │
│  └──────────┘  └──────────┘       │ │
│  ┌──────────┐  ┌──────────┐       │ │
│  │ Team     │  │ Build    │       │ │
│  │ Module   │  │ Module   │       │ │
│  └──────────┘  └──────────┘       │ │
│  ┌──────────┐  ┌──────────┐       │ │
│  │ Deploy   │  │ Billing  │       │ │
│  │ Module   │  │ Module   │       │ │
│  └──────────┘  └──────────┘       │ │
│                                    │ │
│  ┌──────────────────────────────┐  │ │
│  │   Agent Orchestrator         │  │ │
│  │   (Claude Agent SDK)         │  │ │
│  │   ├─ PM Agent (Opus)        │  │ │
│  │   ├─ Frontend Agent (Sonnet)│  │ │
│  │   ├─ Backend Agent (Sonnet) │  │ │
│  │   ├─ DB Agent (Sonnet)      │  │ │
│  │   └─ QA Agent (Sonnet)      │  │ │
│  └──────────────────────────────┘  │ │
└─────────┬──────────┬───────────────┘ │
          │          │                 │
          ▼          ▼                 ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Upstash Redis │ │ Anthropic API │ │ Supabase DB  │
│ (Celery + Redis 큐)  │ │ (Claude LLM) │ │ (PostgreSQL) │
│              │ │              │ │              │
│ ├─ 빌드 큐   │ │ ├─ Opus 4.6  │ │ ├─ Users     │
│ ├─ 배포 큐   │ │ ├─ Sonnet 4.6│ │ ├─ Projects  │
│ └─ 세션 캐시 │ │ └─ Haiku     │ │ ├─ Messages  │
└──────────────┘ └──────────────┘ │ └─ RLS 정책  │
                                  └──────────────┘
```

### 1.2 통신 프로토콜 요약

| 구간 | 프로토콜 | 용도 |
|------|---------|------|
| 브라우저 → Vercel | HTTPS | 페이지 렌더링, 정적 자산 |
| 브라우저 → FastAPI | HTTPS (REST) | API 호출 (CRUD) |
| 브라우저 ← FastAPI | SSE (HTTPS) | 채팅 스트리밍, 빌드 사고 과정 |
| 브라우저 ↔ Supabase | WSS | Realtime 이벤트 (빌드/배포 상태) |
| FastAPI → Supabase | PostgreSQL Wire | DB 쿼리 (Prisma/Supabase Client) |
| FastAPI → Anthropic | HTTPS | Claude API 호출 (스트리밍) |
| FastAPI → Upstash | Redis Protocol (TLS) | 작업 큐, 캐시 |
| FastAPI → Vercel API | HTTPS (REST) | 배포 자동화 |
| FastAPI → Supabase Mgmt | HTTPS (REST) | DB 프로비저닝 |

### 1.3 데이터 흐름 개요

```
[사용자 요청]
     │
     ▼
[Vercel Middleware] ──(JWT 검증)──> [Supabase Auth]
     │
     ▼
[Next.js API Route / Server Action]
     │
     ├──(일반 CRUD)──> [FastAPI REST API] ──> [Supabase DB]
     │
     ├──(채팅)──> [FastAPI SSE Endpoint] ──> [Anthropic API] ──stream──> [브라우저]
     │
     ├──(빌드 시작)──> [FastAPI] ──> [Celery + Redis] ──> [Agent Orchestrator]
     │                                              │
     │                                    [Supabase Realtime]
     │                                              │
     │                                              ▼
     │                                        [브라우저 구독]
     │
     └──(배포)──> [FastAPI] ──> [Vercel API + Supabase Mgmt API]
```

---

## 2. 프론트엔드 아키텍처

### 2.1 Next.js 15 App Router 구조

#### Server Components vs Client Components 구분 원칙

```
┌─────────────────────────────────────────────────┐
│              Server Components (기본)             │
│                                                 │
│  사용 시점:                                      │
│  ├─ 데이터 페칭 (DB 직접 접근, API 호출)          │
│  ├─ 보안 민감 로직 (API 키, 토큰)                │
│  ├─ 레이아웃, 페이지 셸                          │
│  ├─ SEO 필요 콘텐츠                             │
│  └─ 정적/준정적 UI                              │
│                                                 │
│  예시:                                          │
│  ├─ app/(portal)/dashboard/page.tsx              │
│  ├─ app/(public)/page.tsx (랜딩)                │
│  └─ app/(portal)/projects/[id]/layout.tsx       │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│           Client Components ('use client')       │
│                                                 │
│  사용 시점:                                      │
│  ├─ 사용자 인터랙션 (onClick, onChange)           │
│  ├─ 브라우저 API (localStorage, WebSocket)       │
│  ├─ 실시간 구독 (SSE, Supabase Realtime)        │
│  ├─ 폼 상태 관리 (React Hook Form)              │
│  └─ 애니메이션, 트랜지션                         │
│                                                 │
│  예시:                                          │
│  ├─ components/chat/chat-panel.tsx               │
│  ├─ components/build/mission-control.tsx         │
│  ├─ components/preview/live-preview.tsx          │
│  └─ components/experts/expert-recommend-card.tsx │
└─────────────────────────────────────────────────┘
```

#### 디렉토리 구조 (확장)

```
frontend/src/
├── app/
│   ├── (public)/          # Server Components 중심
│   ├── (auth)/            # Server Components + Client Form
│   ├── (portal)/          # Hybrid (SC 셸 + CC 인터랙션)
│   ├── (admin)/           # Server Components 중심
│   └── api/               # API Routes (BFF 패턴)
│       ├── chat/stream/route.ts      # SSE 프록시
│       ├── auth/[...supabase]/route.ts
│       └── webhooks/
│
├── components/
│   ├── ui/                # shadcn/ui 기본 컴포넌트
│   ├── layout/            # 레이아웃 컴포넌트 (SC)
│   ├── chat/              # 채팅 UI (CC)
│   ├── experts/           # 전문가 시스템 (CC)
│   ├── build/             # Mission Control (CC)
│   ├── preview/           # 3-패널 미리보기 (CC)
│   ├── deploy/            # 배포 UI (CC)
│   └── forms/             # 폼 컴포넌트 (CC)
│
├── hooks/
│   ├── use-chat.ts        # 채팅 SSE 연결
│   ├── use-build-stream.ts # 빌드 진행 구독
│   ├── use-realtime.ts    # Supabase Realtime 래퍼
│   ├── use-auth.ts        # 인증 상태
│   └── use-project.ts     # 프로젝트 데이터
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts      # 브라우저 클라이언트 (createBrowserClient)
│   │   ├── server.ts      # 서버 클라이언트 (createServerClient)
│   │   └── middleware.ts   # 미들웨어 클라이언트
│   ├── api-client.ts      # FastAPI API 호출 래퍼
│   ├── utils.ts           # 유틸리티
│   └── constants.ts       # 상수
│
├── stores/
│   ├── auth-store.ts      # Zustand: 인증 상태
│   ├── chat-store.ts      # Zustand: 채팅 UI 상태
│   ├── build-store.ts     # Zustand: 빌드 진행 상태
│   └── ui-store.ts        # Zustand: 사이드바, 모달 등
│
├── providers/
│   ├── query-provider.tsx  # React Query Provider
│   ├── auth-provider.tsx   # Supabase Auth Provider
│   └── theme-provider.tsx  # 테마 Provider
│
└── types/
    ├── project.ts
    ├── chat.ts
    ├── expert.ts
    ├── build.ts
    └── api.ts
```

### 2.2 상태 관리 전략

```
┌─────────────────────────────────────────────────────────┐
│                    상태 관리 계층도                        │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  서버 상태 (React Query / TanStack Query v5)     │    │
│  │                                                 │    │
│  │  용도: API 응답 캐시, 자동 재검증, 낙관적 업데이트  │    │
│  │                                                 │    │
│  │  ├─ useQuery('projects')       프로젝트 목록     │    │
│  │  ├─ useQuery('project', id)    프로젝트 상세     │    │
│  │  ├─ useQuery('requirements')   요구사항 목록     │    │
│  │  ├─ useQuery('team', id)       팀 구성          │    │
│  │  ├─ useMutation('updateReq')   요구사항 수정     │    │
│  │  └─ useQuery('buildStatus')    빌드 상태        │    │
│  │                                                 │    │
│  │  설정:                                          │    │
│  │  ├─ staleTime: 30초 (일반), 5초 (빌드 중)       │    │
│  │  ├─ gcTime: 5분                                 │    │
│  │  └─ refetchOnWindowFocus: true                  │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  클라이언트 상태 (Zustand)                       │    │
│  │                                                 │    │
│  │  용도: UI 상태, 임시 상태, 실시간 스트리밍 버퍼    │    │
│  │                                                 │    │
│  │  ├─ authStore       현재 사용자, 세션 토큰       │    │
│  │  ├─ chatStore       입력 중 메시지, 스트리밍 버퍼 │    │
│  │  ├─ buildStore      실시간 로그, 진행률 캐시     │    │
│  │  └─ uiStore         사이드바 열림/닫힘, 모달     │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  URL 상태 (Next.js searchParams)                │    │
│  │                                                 │    │
│  │  용도: 필터, 정렬, 페이지네이션, 공유 가능 상태    │    │
│  │                                                 │    │
│  │  ├─ ?tab=chat         프로젝트 내 활성 탭        │    │
│  │  ├─ ?status=building  프로젝트 필터              │    │
│  │  └─ ?page=2           페이지네이션               │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │  폼 상태 (React Hook Form + Zod)                │    │
│  │                                                 │    │
│  │  용도: 폼 입력, 검증, 제출                       │    │
│  │                                                 │    │
│  │  ├─ 로그인/회원가입 폼                           │    │
│  │  ├─ 프로젝트 생성 폼                             │    │
│  │  ├─ 요구사항 편집 폼                             │    │
│  │  └─ 설정 폼                                     │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 2.3 인증 플로우

```
[1] 초기 로드
    브라우저 → Vercel (Next.js)
         │
         ▼
    middleware.ts
         │
         ├─ Supabase 세션 확인 (쿠키 기반)
         │   ├─ 유효 → 요청 통과, 헤더에 사용자 정보 주입
         │   ├─ 만료 → Supabase Auth refresh token 갱신 시도
         │   │         ├─ 성공 → 새 쿠키 설정 + 통과
         │   │         └─ 실패 → /login 리다이렉트
         │   └─ 없음 → 퍼블릭 경로면 통과, 포탈 경로면 /login
         │
         ▼
    페이지 렌더링 (Server Component)

[2] 로그인
    브라우저 ──(이메일+비밀번호 또는 OAuth)──> Supabase Auth
         │
         ▼
    Supabase Auth 서버
         │
         ├─ 이메일/비밀번호 → JWT 발급
         ├─ OAuth (Google/GitHub/Kakao) → /auth/callback → JWT 발급
         └─ Magic Link → 이메일 발송 → 클릭 → JWT 발급
         │
         ▼
    JWT (access_token + refresh_token)
         │
         ├─ 쿠키에 저장 (httpOnly, secure, sameSite: lax)
         └─ AuthProvider에서 onAuthStateChange 리스너 등록

[3] API 호출 인증
    브라우저 → Next.js API Route (BFF)
         │
         ├─ 쿠키에서 Supabase 세션 추출
         ├─ createServerClient로 인증된 Supabase 클라이언트 생성
         ▼
    Next.js API Route → FastAPI 백엔드
         │
         ├─ Authorization: Bearer {supabase_access_token}
         ▼
    FastAPI AuthGuard
         │
         ├─ Supabase JWT 검증 (supabase.auth.getUser)
         ├─ 사용자 정보 Request에 주입
         └─ RLS 자동 적용 (Supabase Client에 JWT 전달)
```

### 2.4 실시간 데이터 구독 패턴

```typescript
// 패턴 1: SSE (채팅 스트리밍)
// hooks/use-chat.ts
function useChat(projectId: string) {
  const [messages, addMessage] = useChatStore(s => [s.messages, s.addMessage]);

  const sendMessage = async (content: string) => {
    const response = await fetch(`/api/chat/stream`, {
      method: 'POST',
      body: JSON.stringify({ projectId, content }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      // SSE 파싱: "data: {...}\n\n"
      const events = parseSSE(chunk);
      events.forEach(event => addMessage(event));
    }
  };

  return { messages, sendMessage };
}

// 패턴 2: Supabase Realtime (빌드 이벤트)
// hooks/use-build-stream.ts
function useBuildStream(projectId: string) {
  const updateProgress = useBuildStore(s => s.updateProgress);

  useEffect(() => {
    const channel = supabase
      .channel(`project:${projectId}:build`)
      .on('broadcast', { event: 'agent_activity' }, ({ payload }) => {
        updateProgress(payload);
      })
      .on('broadcast', { event: 'phase_transition' }, ({ payload }) => {
        updateProgress(payload);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId]);
}

// 패턴 3: Supabase Realtime (DB 변경 감지)
// hooks/use-realtime.ts
function useRealtimeTable<T>(table: string, filter: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table, filter },
        () => {
          // React Query 캐시 무효화로 최신 데이터 반영
          queryClient.invalidateQueries({ queryKey: [table] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [table, filter]);
}
```

---

## 3. 백엔드 아키텍처

### 3.1 FastAPI 모듈 구조

```
backend/src/
├── main.ts                          # 앱 부트스트랩
├── app.module.ts                    # 루트 모듈
│
├── common/                          # 공통 유틸리티
│   ├── decorators/
│   │   ├── current-user.decorator.ts  # @CurrentUser() 파라미터 데코레이터
│   │   └── api-response.decorator.ts  # 표준 응답 데코레이터
│   ├── guards/
│   │   ├── supabase-auth.guard.ts     # Supabase JWT 인증 가드
│   │   ├── roles.guard.ts             # 역할 기반 인가 가드
│   │   └── project-owner.guard.ts     # 프로젝트 소유자 검증
│   ├── interceptors/
│   │   ├── logging.interceptor.ts     # 요청/응답 로깅
│   │   ├── transform.interceptor.ts   # 응답 포맷 통일
│   │   └── timeout.interceptor.ts     # 요청 타임아웃
│   ├── filters/
│   │   └── global-exception.filter.ts # 전역 예외 처리
│   ├── pipes/
│   │   └── zod-validation.pipe.ts     # Zod 스키마 검증 파이프
│   └── dto/
│       ├── pagination.dto.ts          # 페이지네이션 공통
│       └── api-response.dto.ts        # 표준 API 응답
│
├── modules/
│   ├── auth/                        # 인증/인가
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts       # /auth/*
│   │   ├── auth.service.ts
│   │   └── strategies/
│   │       └── supabase.strategy.ts # Supabase JWT 검증
│   │
│   ├── projects/                    # 프로젝트 관리
│   │   ├── projects.module.ts
│   │   ├── projects.controller.ts   # /api/projects/*
│   │   ├── projects.service.ts
│   │   └── projects.repository.ts
│   │
│   ├── chat/                        # 채팅/대화
│   │   ├── chat.module.ts
│   │   ├── chat.controller.ts       # /api/projects/:id/conversation/*
│   │   ├── chat.service.ts          # 메시지 저장/조회
│   │   ├── chat-stream.service.ts   # Claude API SSE 스트리밍
│   │   └── domain-detector.service.ts # 도메인 감지 (Haiku)
│   │
│   ├── experts/                     # 전문가 시스템
│   │   ├── experts.module.ts
│   │   ├── experts.controller.ts    # /api/experts/*
│   │   ├── experts.service.ts
│   │   ├── expert-registry.service.ts # 전문가 레지스트리
│   │   └── multi-expert-chat.service.ts # 멀티 전문가 채팅 엔진
│   │
│   ├── requirements/                # 요구사항
│   │   ├── requirements.module.ts
│   │   ├── requirements.controller.ts
│   │   ├── requirements.service.ts
│   │   └── requirement-extractor.service.ts # AI 자동 추출
│   │
│   ├── team/                        # AI 팀 관리
│   │   ├── team.module.ts
│   │   ├── team.controller.ts       # /api/projects/:id/team/*
│   │   ├── team.service.ts
│   │   └── team-analyzer.service.ts # PM Agent 분석 SSE
│   │
│   ├── build/                       # 빌드 오케스트레이션
│   │   ├── build.module.ts
│   │   ├── build.controller.ts      # /api/projects/:id/build/*
│   │   ├── build.service.ts
│   │   ├── build-queue.service.ts   # Celery + Redis 큐 관리
│   │   └── copilot.service.ts       # 빌드 중 사용자 개입
│   │
│   ├── agent-orchestrator/          # 에이전트 오케스트레이션
│   │   ├── orchestrator.module.ts
│   │   ├── orchestrator.service.ts  # Claude Agent SDK 통합
│   │   ├── worktree.service.ts      # Git Worktree 관리
│   │   ├── merge.service.ts         # 자동 머지 + 충돌 해결
│   │   ├── budget.service.ts        # 토큰 예산 관리
│   │   └── agent-configs/           # 에이전트 정의
│   │       ├── pm-agent.config.ts
│   │       ├── frontend-agent.config.ts
│   │       ├── backend-agent.config.ts
│   │       ├── db-agent.config.ts
│   │       └── qa-agent.config.ts
│   │
│   ├── deploy/                      # 배포
│   │   ├── deploy.module.ts
│   │   ├── deploy.controller.ts     # /api/projects/:id/deploy/*
│   │   ├── deploy.service.ts        # 배포 파이프라인 오케스트레이션
│   │   ├── vercel.service.ts        # Vercel REST API 클라이언트
│   │   └── supabase-mgmt.service.ts # Supabase Management API
│   │
│   ├── billing/                     # 결제/요금제
│   │   ├── billing.module.ts
│   │   ├── billing.controller.ts    # /api/settings/billing/*
│   │   ├── billing.service.ts
│   │   ├── stripe.service.ts        # Stripe 연동
│   │   └── usage.service.ts         # 사용량 추적
│   │
│   ├── gallery/                     # 갤러리/포크
│   │   ├── gallery.module.ts
│   │   ├── gallery.controller.ts
│   │   └── gallery.service.ts
│   │
│   └── webhooks/                    # 웹훅 수신
│       ├── webhooks.module.ts
│       ├── vercel-webhook.controller.ts
│       └── stripe-webhook.controller.ts
│
├── infrastructure/                  # 인프라 계층
│   ├── supabase/
│   │   ├── supabase.module.ts       # Supabase 클라이언트 모듈
│   │   ├── supabase.service.ts      # 서비스 클라이언트 래퍼
│   │   └── supabase-admin.service.ts # Admin 클라이언트 (RLS 우회)
│   ├── redis/
│   │   ├── redis.module.ts
│   │   └── redis.service.ts         # Upstash Redis 연결
│   ├── celery/
│   │   ├── celery.module.ts
│   │   └── queues/
│   │       ├── build.queue.ts       # 빌드 작업 큐
│   │       └── deploy.queue.ts      # 배포 작업 큐
│   └── anthropic/
│       ├── anthropic.module.ts
│       └── anthropic.service.ts     # Claude API 클라이언트
│
└── config/
    ├── app.config.ts                # 앱 설정
    ├── supabase.config.ts           # Supabase 설정
    ├── redis.config.ts              # Redis 설정
    └── anthropic.config.ts          # Claude API 설정
```

### 3.2 API 레이어 설계

```
요청 흐름:

[HTTP 요청]
     │
     ▼
[Global Middleware]
     ├─ helmet (보안 헤더)
     ├─ compression (gzip)
     └─ cors (CORS 정책)
     │
     ▼
[Global Guards]
     ├─ ThrottlerGuard (Rate Limiting)
     └─ SupabaseAuthGuard (JWT 인증) ── 일부 경로 제외 (@Public)
     │
     ▼
[Controller]
     ├─ @UseGuards(ProjectOwnerGuard)   프로젝트 소유자 검증
     ├─ @UsePipes(ZodValidationPipe)    요청 데이터 검증
     ├─ 라우트 핸들러 실행
     │
     ▼
[Service]
     ├─ 비즈니스 로직 처리
     ├─ 트랜잭션 관리
     ├─ 외부 서비스 호출 (Claude API, Vercel, Stripe)
     │
     ▼
[Repository / Supabase Client]
     ├─ DB 쿼리 실행 (RLS 적용)
     ├─ 데이터 매핑
     │
     ▼
[Response Interceptor]
     ├─ 성공: { success: true, data: T, meta?: PaginationMeta }
     └─ 실패: { success: false, error: { code, message, details? } }
```

#### 표준 응답 포맷

```typescript
// 성공 응답
interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// 에러 응답
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;          // 'PROJECT_NOT_FOUND', 'UNAUTHORIZED'
    message: string;       // 사용자 친화적 메시지
    details?: unknown;     // 개발 환경에서만 상세 정보
    statusCode: number;    // HTTP 상태 코드
  };
}
```

### 3.3 Supabase 클라이언트 통합 패턴

```
┌─────────────────────────────────────────────────┐
│             Supabase 클라이언트 계층              │
│                                                 │
│  [1] Admin Client (RLS 우회)                    │
│      용도: 시스템 작업 (배포, 마이그레이션, 통계)   │
│      생성: createClient(url, service_role_key)   │
│      주의: 절대 클라이언트에 노출 금지             │
│                                                 │
│  [2] Authenticated Client (RLS 적용)            │
│      용도: 사용자 데이터 CRUD                     │
│      생성: 요청별 JWT를 주입한 클라이언트          │
│      보안: 사용자 소유 데이터만 접근 가능           │
│                                                 │
│  [3] Anonymous Client (제한적 접근)              │
│      용도: 공개 데이터 조회 (갤러리, 요금제)        │
│      생성: createClient(url, anon_key)           │
│      보안: RLS 정책에 따라 공개 데이터만 접근       │
└─────────────────────────────────────────────────┘
```

```typescript
// infrastructure/supabase/supabase.service.ts
@Injectable()
export class SupabaseService {
  private adminClient: SupabaseClient;

  constructor(private config: ConfigService) {
    this.adminClient = createClient(
      config.get('SUPABASE_URL'),
      config.get('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  // RLS 적용 클라이언트 (사용자별)
  getAuthClient(accessToken: string): SupabaseClient {
    return createClient(
      this.config.get('SUPABASE_URL'),
      this.config.get('SUPABASE_ANON_KEY'),
      {
        global: {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      },
    );
  }

  // Admin 클라이언트 (RLS 우회, 시스템 작업용)
  getAdminClient(): SupabaseClient {
    return this.adminClient;
  }
}
```

### 3.4 에러 처리 + 로깅 전략

```
┌─────────────────────────────────────────────────────────┐
│                     에러 처리 계층                        │
│                                                         │
│  [Layer 1] Controller/Service 레벨                      │
│  ├─ 비즈니스 예외: throw new BusinessException(code, msg) │
│  ├─ 입력 검증: ZodValidationPipe 자동 처리               │
│  └─ 인증/인가: Guard 자동 처리                           │
│                                                         │
│  [Layer 2] Global Exception Filter                      │
│  ├─ BusinessException → 400/404/409 매핑                │
│  ├─ UnauthorizedException → 401                         │
│  ├─ ForbiddenException → 403                            │
│  ├─ ThrottlerException → 429                            │
│  ├─ Unknown Error → 500 + Sentry 전송                   │
│  └─ 모든 에러: 구조화된 JSON 응답 + 로그 기록             │
│                                                         │
│  [Layer 3] External Service 에러                        │
│  ├─ Anthropic API → 재시도 (3회) + 폴백 메시지           │
│  ├─ Supabase → 재시도 (2회) + 연결 풀 리셋              │
│  ├─ Vercel API → 재시도 + 큐 재등록                     │
│  └─ Stripe → 웹훅 재수신 대기                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                     로깅 전략                            │
│                                                         │
│  포맷: 구조화된 JSON 로그                                │
│                                                         │
│  {                                                      │
│    "timestamp": "2026-03-14T10:30:00.000Z",             │
│    "level": "info|warn|error",                          │
│    "context": "ChatService",                            │
│    "message": "메시지 전송 완료",                         │
│    "traceId": "req-abc123",                             │
│    "userId": "user-xyz",                                │
│    "projectId": "proj-456",                             │
│    "duration": 1234,                                    │
│    "metadata": { ... }                                  │
│  }                                                      │
│                                                         │
│  수준별 정책:                                            │
│  ├─ DEBUG: 개발 환경만. DB 쿼리, 외부 API 상세          │
│  ├─ INFO: 요청/응답 요약, 주요 비즈니스 이벤트            │
│  ├─ WARN: 재시도 발생, 비정상 패턴 감지                  │
│  └─ ERROR: 예외 발생, 외부 서비스 실패                   │
│                                                         │
│  전송 대상:                                              │
│  ├─ 개발: 콘솔 (pino-pretty)                            │
│  ├─ 스테이징/프로덕션: stdout → 클라우드 로그 수집        │
│  └─ 에러: Sentry (스택 트레이스 + 컨텍스트)              │
└─────────────────────────────────────────────────────────┘
```

---

## 4. AI 에이전트 오케스트레이션 아키텍처

### 4.1 전체 오케스트레이션 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                    Agent Orchestrator (FastAPI)                   │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  OrchestratorService                                      │  │
│  │  ├─ executeBuild(projectId, requirements)                 │  │
│  │  ├─ pauseBuild(projectId)                                 │  │
│  │  ├─ resumeBuild(projectId)                                │  │
│  │  └─ injectCopilotMessage(projectId, message)              │  │
│  └───────────────┬───────────────────────────────────────────┘  │
│                  │                                              │
│          ┌───────▼───────┐                                      │
│          │   Celery + Redis 큐   │                                      │
│          │  (build-queue) │                                     │
│          └───────┬───────┘                                      │
│                  │                                              │
│  ┌───────────────▼───────────────────────────────────────────┐  │
│  │  Build Worker (Celery + Redis Worker)                             │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  PM Agent (Opus 4.6) -- Team Lead                   │  │  │
│  │  │                                                     │  │  │
│  │  │  역할:                                              │  │  │
│  │  │  ├─ 요구사항 분석 + 복잡도 판단                      │  │  │
│  │  │  ├─ 팀 동적 구성 (3~5명)                            │  │  │
│  │  │  ├─ Phase 분해 + 태스크 의존성 그래프                │  │  │
│  │  │  ├─ 공유 태스크 리스트 관리                          │  │  │
│  │  │  ├─ 에이전트 스폰 + 모니터링                        │  │  │
│  │  │  ├─ 충돌 해결 (자동 3-way 머지)                     │  │  │
│  │  │  └─ 최종 통합 + 빌드 검증                           │  │  │
│  │  │                                                     │  │  │
│  │  │  ┌──────────────────────────────────────────────┐   │  │  │
│  │  │  │         Agent Teams (Teammates)              │   │  │  │
│  │  │  │                                              │   │  │  │
│  │  │  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │   │  │  │
│  │  │  │  │ Frontend │  │ Backend  │  │   DB     │  │   │  │  │
│  │  │  │  │ Agent    │  │ Agent    │  │  Agent   │  │   │  │  │
│  │  │  │  │ (Sonnet) │  │ (Sonnet) │  │ (Sonnet) │  │   │  │  │
│  │  │  │  │          │  │          │  │          │  │   │  │  │
│  │  │  │  │ worktree │  │ worktree │  │ worktree │  │   │  │  │
│  │  │  │  │ /fe      │  │ /be      │  │ /db      │  │   │  │  │
│  │  │  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  │   │  │  │
│  │  │  │       │    메시지박스    │              │       │   │  │  │
│  │  │  │       └──────◄►───────┘              │       │   │  │  │
│  │  │  │              ◄────────────────────────┘       │   │  │  │
│  │  │  │                                              │   │  │  │
│  │  │  │  ┌──────────┐                                │   │  │  │
│  │  │  │  │   QA     │  (Phase 4에서 활성화)           │   │  │  │
│  │  │  │  │  Agent   │                                │   │  │  │
│  │  │  │  │ (Sonnet) │                                │   │  │  │
│  │  │  │  └──────────┘                                │   │  │  │
│  │  │  └──────────────────────────────────────────────┘   │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  이벤트 발행 ──> Supabase Realtime (project:{id}:build)         │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 PM Agent의 팀 구성 → Phase 분해 → 태스크 분배 흐름

```
[요구사항 문서 입력]
       │
       ▼
  PM Agent 분석 (Opus 4.6, SSE 스트리밍)
       │
       ├─ [Step 1] 도메인 식별
       │   ├─ 이커머스, SaaS, 커뮤니티, 블로그 등
       │   └─ 기술 스택 확정 (Next.js 15 + Supabase 기본)
       │
       ├─ [Step 2] 복잡도 판단
       │   ├─ 단순 (랜딩/포트폴리오): Frontend 1명
       │   ├─ 중간 (CRUD 웹앱): Frontend + Backend + DB = 3명
       │   └─ 복잡 (SaaS/이커머스): 전체 팀 4~5명
       │
       ├─ [Step 3] 팀 구성안 생성
       │   ├─ 각 역할의 에이전트 정의 (.claude/agents/*.md 참조)
       │   ├─ 예상 시간/비용 산출
       │   └─ ──> 사용자에게 승인 요청 (Human-in-the-Loop)
       │
       ├─ [Step 4] Phase 분해
       │   ├─ Phase 0: 프로젝트 초기화 (PM 단독)
       │   │   └─ 스캐폴딩, CLAUDE.md, 디렉토리 구조
       │   ├─ Phase 1: 데이터 레이어 (DB Agent, 순차)
       │   │   └─ 스키마, 마이그레이션, RLS, 타입 생성
       │   ├─ Phase 2: 핵심 기능 (Frontend + Backend, 병렬)
       │   │   └─ 페이지, API, 컴포넌트, 비즈니스 로직
       │   ├─ Phase 3: 연동 + 고급 기능 (순차/병렬)
       │   │   └─ 결제, 외부 API, 실시간 기능
       │   └─ Phase 4: 테스트 + 통합 (QA Agent, 순차)
       │       └─ 단위/통합/E2E 테스트, 빌드 검증
       │
       ├─ [Step 5] 태스크 분배
       │   ├─ 공유 태스크 리스트에 태스크 등록
       │   │   { id, title, assignee, phase, status, dependencies }
       │   ├─ Phase별 순차 실행 제어
       │   └─ 병렬 Phase 내에서는 에이전트 자율 클레임 허용
       │
       └─ [Step 6] 실행 + 모니터링
           ├─ 각 Phase 완료 시 worktree 머지
           ├─ 충돌 발생 시 자동 3-way 머지 시도
           ├─ 실패 시 사용자 에스컬레이션
           ├─ 토큰 예산 90% 도달 시 일시정지 + 사용자 확인
           └─ 모든 Phase 완료 → 빌드 검증 (next build) → 배포 트리거
```

### 4.3 Celery + Redis 작업 큐를 통한 에이전트 실행 관리

```
┌─────────────────────────────────────────────────────────┐
│                    Celery + Redis 큐 구조                        │
│                                                         │
│  build-queue (빌드 작업)                                 │
│  ├─ Job Data:                                           │
│  │   {                                                  │
│  │     projectId: string                                │
│  │     requirements: RequirementDoc                     │
│  │     teamConfig: TeamConfig                           │
│  │     budget: { maxTokens: number, maxCost: number }   │
│  │     userId: string                                   │
│  │   }                                                  │
│  │                                                      │
│  ├─ Job Options:                                        │
│  │   attempts: 2           # 실패 시 1회 재시도          │
│  │   backoff: 30000        # 30초 대기 후 재시도         │
│  │   timeout: 1800000      # 30분 타임아웃              │
│  │   removeOnComplete: false # 완료 기록 보존            │
│  │   removeOnFail: false    # 실패 기록 보존             │
│  │                                                      │
│  ├─ Job Events → Supabase Realtime 발행:               │
│  │   ├─ active    → { type: 'build_started' }          │
│  │   ├─ progress  → { type: 'agent_activity', ... }    │
│  │   ├─ completed → { type: 'build_complete' }         │
│  │   └─ failed    → { type: 'build_failed', error }    │
│  │                                                      │
│  └─ Concurrency: 3        # 동시 빌드 최대 3개          │
│                                                         │
│  deploy-queue (배포 작업)                                │
│  ├─ Job Data: { projectId, environment, artifacts }     │
│  ├─ Concurrency: 5        # 동시 배포 최대 5개          │
│  └─ Rate Limit: 100/hour  # Vercel API 제한 고려        │
└─────────────────────────────────────────────────────────┘
```

### 4.4 Git Worktree 기반 파일 격리

```
프로젝트 빌드 시 디렉토리 구조:

/builds/{projectId}/
├── main/                      # 메인 브랜치 (PM Agent 작업 공간)
│   ├── .git/                  # 공유 Git 객체 저장소
│   ├── CLAUDE.md              # 프로젝트별 코딩 규칙
│   ├── src/
│   └── package.json
│
├── worktrees/
│   ├── db/                    # DB Agent 전용 (Phase 1)
│   │   ├─ 브랜치: feature/db-schema
│   │   ├─ 작업: SQL 마이그레이션, RLS, 타입
│   │   └─ 완료 시: merge → main
│   │
│   ├── fe/                    # Frontend Agent 전용 (Phase 2)
│   │   ├─ 브랜치: feature/frontend
│   │   ├─ 작업: 페이지, 컴포넌트, 스타일
│   │   └─ 완료 시: merge → main
│   │
│   ├── be/                    # Backend Agent 전용 (Phase 2)
│   │   ├─ 브랜치: feature/backend
│   │   ├─ 작업: API Routes, Server Actions
│   │   └─ 완료 시: merge → main (fe 이후)
│   │
│   └── qa/                    # QA Agent 전용 (Phase 4)
│       ├─ 브랜치: feature/tests
│       ├─ 작업: 테스트 파일 추가
│       └─ 완료 시: merge → main
│
└── artifacts/                 # 최종 빌드 산출물
    └── (배포용 파일)

머지 전략:
  Phase 1 (순차): db → main (충돌 가능성 낮음)
  Phase 2 (병렬): fe → main, 그 다음 be → main
     ├─ 겹치는 파일 없음 → 순차 머지
     └─ 겹치는 파일 있음 → 3-way 머지 시도
        ├─ 성공 → 자동 커밋
        └─ 실패 → PM Agent 해결 또는 사용자 에스컬레이션
  Phase 4 (순차): qa → main (테스트 파일만, 충돌 거의 없음)
```

### 4.5 메시지박스 기반 에이전트 간 통신

```
┌──────────────────────────────────────────────────────┐
│              에이전트 간 통신 패턴                      │
│                                                      │
│  [상황] Frontend Agent가 API 응답 스키마를 알아야 함    │
│                                                      │
│  Frontend Agent                    Backend Agent     │
│       │                                 │            │
│       │  ── 메시지박스 ──>               │            │
│       │  "GET /api/products 응답에       │            │
│       │   thumbnailUrl 필드를            │            │
│       │   추가해주세요"                   │            │
│       │                                 │            │
│       │                <── 메시지박스 ──  │            │
│       │                "확인. ProductDto │            │
│       │                 에 추가 완료.    │            │
│       │                 타입 정의:       │            │
│       │                 thumbnailUrl:    │            │
│       │                 string | null"   │            │
│       │                                 │            │
│       ▼                                 ▼            │
│  [thumbnailUrl 사용한                [API 응답에      │
│   이미지 컴포넌트 구현]               thumbnailUrl    │
│                                     필드 포함]       │
│                                                      │
│  통신 규칙:                                           │
│  ├─ API 인터페이스 합의: 양방향 메시지                  │
│  ├─ 에스컬레이션: PM Agent에게 전달                    │
│  ├─ 타입 공유: 공유 태스크 리스트에 타입 정의 첨부       │
│  └─ 비동기: 상대가 응답할 때까지 다른 태스크 진행        │
└──────────────────────────────────────────────────────┘
```

### 4.6 비용 추적 + 예산 게이트

```
┌─────────────────────────────────────────────────────┐
│                 비용 관리 시스템                       │
│                                                     │
│  [예산 설정] 프로젝트 시작 시                          │
│  ├─ maxTokens: 500,000 (기본)                       │
│  ├─ maxCost: $5.00 (기본)                           │
│  └─ 사용자 티어별 상한 조정                           │
│                                                     │
│  [실시간 추적] BudgetService                        │
│  ├─ 에이전트별 토큰 사용량 누적                       │
│  │   ├─ PM Agent (Opus): inputTokens + outputTokens │
│  │   ├─ Frontend (Sonnet): inputTokens + outputTokens│
│  │   └─ ...                                         │
│  ├─ 비용 계산 (모델별 단가 적용)                      │
│  │   ├─ Opus: $15/MTok (input) + $75/MTok (output)  │
│  │   ├─ Sonnet: $3/MTok (input) + $15/MTok (output) │
│  │   └─ Haiku: $0.25/MTok (input) + $1.25/MTok (out)│
│  └─ Supabase Realtime으로 사용자에게 실시간 전송       │
│                                                     │
│  [게이트 체크]                                       │
│  ├─ 50% 도달: 사용자에게 알림 (정보)                  │
│  ├─ 80% 도달: 사용자에게 경고                        │
│  ├─ 90% 도달: 빌드 일시정지 + 사용자 확인 요청         │
│  │   ├─ "예산 추가" → 빌드 재개                      │
│  │   └─ "현재 상태로 완료" → 남은 태스크 스킵          │
│  └─ 100% 도달: 강제 중단                            │
│                                                     │
│  [모델 라우팅 최적화]                                 │
│  ├─ 탐색/읽기 작업 → Haiku (~$0.02/태스크)           │
│  ├─ 코드 구현 → Sonnet (~$0.15/태스크)               │
│  └─ 판단/계획 → Opus (~$0.30/태스크)                │
└─────────────────────────────────────────────────────┘
```

---

## 5. 데이터베이스 아키텍처

### 5.1 Supabase PostgreSQL 설정

```
┌─────────────────────────────────────────────────────┐
│            Supabase 프로젝트 구성                     │
│                                                     │
│  프로젝트: YHAI Main (Supabase Pro)                  │
│  리전: ap-northeast-1 (도쿄)                         │
│  플랜: Pro ($25/월)                                  │
│  DB 크기: 8GB (기본), 자동 확장                       │
│                                                     │
│  ├─ PostgreSQL 15+                                  │
│  │   ├─ Extensions:                                 │
│  │   │   ├─ uuid-ossp (UUID 생성)                   │
│  │   │   ├─ pgcrypto (암호화)                       │
│  │   │   ├─ pg_trgm (풀텍스트 검색)                  │
│  │   │   └─ moddatetime (updated_at 자동 갱신)      │
│  │   │                                              │
│  │   ├─ Connection Pooling:                         │
│  │   │   ├─ PgBouncer (Supabase 내장)               │
│  │   │   ├─ Transaction Mode (기본)                  │
│  │   │   ├─ Pool Size: 15 (Pro 기본)                │
│  │   │   └─ Prisma: ?pgbouncer=true&connection_limit=1│
│  │   │                                              │
│  │   └─ Schemas:                                    │
│  │       ├─ public   (앱 테이블)                     │
│  │       ├─ auth     (Supabase Auth, 자동 관리)      │
│  │       └─ storage  (Supabase Storage, 자동 관리)   │
│  │                                                  │
│  ├─ Auth: OAuth + Email + Magic Link                │
│  ├─ Storage: 프로젝트 에셋, 템플릿                    │
│  └─ Realtime: 빌드/배포 이벤트 브로드캐스트            │
└─────────────────────────────────────────────────────┘
```

### 5.2 RLS (Row Level Security) 정책 설계

```sql
-- 기본 원칙: 모든 테이블에 RLS 활성화
-- 사용자는 자신의 데이터만 접근 가능

-- [1] 프로젝트: 소유자만 접근
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "projects_select_own"
  ON projects FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "projects_insert_own"
  ON projects FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "projects_update_own"
  ON projects FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "projects_delete_own"
  ON projects FOR DELETE
  USING (user_id = auth.uid());

-- [2] 메시지: 프로젝트 소유자만 접근
CREATE POLICY "messages_select_own"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT c.id FROM conversations c
      JOIN projects p ON p.id = c.project_id
      WHERE p.user_id = auth.uid()
    )
  );

-- [3] 전문가 프로필: 모든 인증된 사용자 조회 가능
CREATE POLICY "experts_select_all"
  ON expert_profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- [4] 관리자 정책: admin 역할만 전체 접근
CREATE POLICY "admin_full_access"
  ON projects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- [5] 갤러리: 공개 프로젝트는 모두 조회 가능
CREATE POLICY "gallery_public_select"
  ON projects FOR SELECT
  USING (is_public = true);
```

### 5.3 마이그레이션 전략

```
┌─────────────────────────────────────────────────────┐
│              마이그레이션 전략                         │
│                                                     │
│  도구: Prisma ORM + Supabase CLI (하이브리드)         │
│                                                     │
│  [Prisma 역할]                                      │
│  ├─ schema.prisma: 타입 안전 스키마 정의              │
│  ├─ prisma generate: TypeScript 클라이언트 생성       │
│  ├─ prisma migrate dev: 로컬 개발 마이그레이션         │
│  └─ prisma migrate deploy: 프로덕션 마이그레이션       │
│                                                     │
│  [Supabase CLI 역할]                                │
│  ├─ RLS 정책 관리 (Prisma가 미지원)                   │
│  ├─ Edge Functions 배포                              │
│  ├─ Realtime 설정                                   │
│  └─ Auth 설정 (providers, templates)                │
│                                                     │
│  마이그레이션 흐름:                                   │
│  1. schema.prisma 수정                              │
│  2. npx prisma migrate dev --name {description}     │
│  3. RLS 정책 SQL 파일 수동 추가                       │
│     └─ supabase/migrations/{timestamp}_rls.sql      │
│  4. 로컬 테스트 (supabase start)                     │
│  5. npx prisma migrate deploy (프로덕션)             │
│  6. supabase db push (RLS 정책)                     │
│                                                     │
│  파일 구조:                                          │
│  backend/                                           │
│  ├─ prisma/                                         │
│  │   ├─ schema.prisma                               │
│  │   └─ migrations/                                 │
│  │       ├─ 20260314_init/migration.sql             │
│  │       └─ 20260315_add_experts/migration.sql      │
│  └─ supabase/                                       │
│      ├─ config.toml                                 │
│      └─ migrations/                                 │
│          ├─ 20260314_rls_policies.sql               │
│          └─ 20260314_realtime_setup.sql             │
└─────────────────────────────────────────────────────┘
```

### 5.4 인덱스 전략

```sql
-- 핵심 인덱스 설계

-- [1] 프로젝트 조회 (대시보드 목록)
CREATE INDEX idx_projects_user_status
  ON projects (user_id, status);
CREATE INDEX idx_projects_user_updated
  ON projects (user_id, updated_at DESC);

-- [2] 메시지 조회 (채팅 히스토리, 커서 기반 페이지네이션)
CREATE INDEX idx_messages_conversation_created
  ON messages (conversation_id, created_at DESC);

-- [3] 요구사항 정렬
CREATE INDEX idx_requirements_project_sort
  ON requirements (project_id, sort_order);

-- [4] 태스크 상태 조회 (빌드 모니터링)
CREATE INDEX idx_tasks_agent_status
  ON tasks (agent_id, status);
CREATE INDEX idx_tasks_phase_status
  ON tasks (phase_id, status);

-- [5] 활동 로그 (타임라인)
CREATE INDEX idx_activity_log_project_created
  ON activity_logs (project_id, created_at DESC);

-- [6] 사용량 집계 (빌링)
CREATE INDEX idx_usage_records_user_period
  ON usage_records (user_id, created_at);
CREATE INDEX idx_usage_records_project
  ON usage_records (project_id, type);

-- [7] 배포 이력
CREATE INDEX idx_deployments_project_created
  ON deployments (project_id, created_at DESC);

-- [8] 갤러리 (공개 프로젝트)
CREATE INDEX idx_projects_public_domain
  ON projects (domain, created_at DESC)
  WHERE is_public = true;

-- 인덱스 설계 원칙:
-- 1. WHERE 절 컬럼 우선 (user_id, project_id, status)
-- 2. ORDER BY 컬럼 포함 (created_at DESC)
-- 3. 부분 인덱스 활용 (WHERE is_public = true)
-- 4. 복합 인덱스는 카디널리티 높은 순
-- 5. 불필요한 인덱스 방지 (쓰기 성능 고려)
```

---

## 6. 실시간 통신 상세 설계

### 6.1 SSE 엔드포인트 구현 패턴

```
┌─────────────────────────────────────────────────────┐
│              SSE (Server-Sent Events) 설계            │
│                                                     │
│  사용 시점:                                          │
│  ├─ 채팅 응답 스트리밍 (Claude AI → 브라우저)          │
│  ├─ PM Agent 분석 과정 스트리밍                       │
│  └─ 에이전트 사고 과정 스트리밍                        │
│                                                     │
│  이유: 단방향 스트리밍, HTTP 기반, 방화벽 친화적        │
└─────────────────────────────────────────────────────┘

FastAPI SSE 컨트롤러 패턴:

  @Controller('api/projects/:id/conversation')
  export class ChatController {

    @Post('messages')
    @Header('Content-Type', 'text/event-stream')
    @Header('Cache-Control', 'no-cache')
    @Header('Connection', 'keep-alive')
    async streamMessage(
      @Param('id') projectId: string,
      @Body() dto: SendMessageDto,
      @Res() res: Response,
    ) {
      // 1. 사용자 메시지 저장
      await this.chatService.saveMessage(projectId, dto);

      // 2. Claude API 스트리밍 호출
      const stream = await this.anthropic.messages.stream({
        model: 'claude-sonnet-4-20250514',
        messages: [...history, { role: 'user', content: dto.content }],
        system: this.buildSystemPrompt(experts),
      });

      // 3. SSE 이벤트 전송
      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          res.write(`data: ${JSON.stringify({
            type: 'text_delta',
            content: event.delta.text,
            expertId: currentExpert?.id,
          })}\n\n`);
        }

        if (event.type === 'message_stop') {
          res.write(`data: ${JSON.stringify({
            type: 'message_complete',
            messageId: savedMessage.id,
          })}\n\n`);
        }
      }

      res.write('data: [DONE]\n\n');
      res.end();
    }
  }

SSE 이벤트 포맷:

  // 텍스트 청크
  data: {"type":"text_delta","content":"안녕","expertId":"exp-123"}

  // 전문가 전환
  data: {"type":"expert_switch","expertId":"exp-456","name":"UI/UX 전문가"}

  // 사고 과정 (Extended Thinking)
  data: {"type":"thinking","content":"결제 연동 방식을 고려 중..."}

  // 완료
  data: {"type":"message_complete","messageId":"msg-789"}

  // 종료
  data: [DONE]
```

### 6.2 Supabase Realtime 채널 설계

```
┌─────────────────────────────────────────────────────┐
│           Supabase Realtime 채널 구조                 │
│                                                     │
│  [채널 1] project:{projectId}:build                  │
│  용도: 빌드 진행상황 실시간 전달                       │
│  모드: Broadcast (서버 → 다수 클라이언트)              │
│                                                     │
│  이벤트:                                             │
│  ├─ phase_started                                   │
│  │   { phase: 1, name: "데이터 레이어", agents: [...] }│
│  ├─ agent_activity                                  │
│  │   { agentId, action: "writing", file: "page.tsx" }│
│  ├─ agent_progress                                  │
│  │   { agentId, progress: 65, currentTask: "..." }  │
│  ├─ agent_message                                   │
│  │   { from: "fe", to: "be", content: "..." }       │
│  ├─ phase_completed                                 │
│  │   { phase: 1, duration: 45, cost: 0.15 }         │
│  ├─ merge_event                                     │
│  │   { type: "success"|"conflict", details: "..." } │
│  ├─ cost_update                                     │
│  │   { current: 1.80, budget: 5.00, percent: 36 }   │
│  ├─ build_complete                                  │
│  │   { totalDuration: 480, totalCost: 3.20 }        │
│  └─ build_failed                                    │
│      { error: "...", phase: 2, agentId: "be" }      │
│                                                     │
│  [채널 2] project:{projectId}:deploy                 │
│  용도: 배포 파이프라인 상태 전달                       │
│  모드: Broadcast                                     │
│                                                     │
│  이벤트:                                             │
│  ├─ deploy_started                                  │
│  │   { environment: "production" }                  │
│  ├─ deploy_step                                     │
│  │   { step: "supabase_setup"|"vercel_deploy"|      │
│  │     "db_migration"|"healthcheck",                │
│  │     status: "running"|"completed"|"failed" }     │
│  ├─ deploy_completed                                │
│  │   { url: "https://app.vercel.app", duration: 180 }│
│  └─ deploy_failed                                   │
│      { step: "vercel_deploy", error: "..." }        │
│                                                     │
│  [채널 3] user:{userId}:notifications                │
│  용도: 사용자 알림 (빌드 완료, 에러 등)               │
│  모드: Broadcast (특정 사용자만)                      │
│                                                     │
│  이벤트:                                             │
│  ├─ build_done     { projectId, projectName }       │
│  ├─ deploy_done    { projectId, url }               │
│  ├─ budget_warning { projectId, percent: 90 }       │
│  └─ system_notice  { message }                      │
└─────────────────────────────────────────────────────┘

서버 측 이벤트 발행 (FastAPI):

  // Supabase Realtime에 이벤트 브로드캐스트
  async publishBuildEvent(projectId: string, event: BuildEvent) {
    const channel = this.supabase
      .channel(`project:${projectId}:build`);

    await channel.send({
      type: 'broadcast',
      event: event.type,
      payload: event.data,
    });
  }
```

### 6.3 클라이언트 재연결/복구 전략

```
┌─────────────────────────────────────────────────────┐
│              재연결 + 복구 전략                        │
│                                                     │
│  [SSE 재연결]                                        │
│  ├─ 브라우저 EventSource는 자동 재연결 내장            │
│  ├─ 커스텀 fetch 기반 SSE 시:                        │
│  │   ├─ 연결 끊김 감지 (reader.read() 에러)          │
│  │   ├─ 재연결 대기: 1초, 2초, 4초... (지수 백오프)   │
│  │   ├─ 최대 재시도: 5회                             │
│  │   └─ lastEventId 전송하여 이어받기                 │
│  └─ 재연결 중 UI: "연결 중..." 인디케이터 표시         │
│                                                     │
│  [Supabase Realtime 재연결]                          │
│  ├─ Supabase JS SDK 내장 자동 재연결                  │
│  ├─ 상태 콜백 모니터링:                               │
│  │   channel.on('system', {}, (status) => {         │
│  │     if (status === 'CHANNEL_ERROR')               │
│  │       // 복구 로직 트리거                          │
│  │   })                                             │
│  └─ 재연결 후 상태 동기화:                            │
│      ├─ React Query 캐시 무효화 (최신 데이터 재조회)    │
│      └─ 빌드 중이면 현재 진행 상태 API 호출             │
│                                                     │
│  [상태 복구 패턴]                                     │
│  ├─ 채팅: 메시지는 DB에 저장되므로 API 재조회로 복구    │
│  ├─ 빌드: GET /api/projects/:id/build/status로 복구  │
│  │   ├─ 현재 Phase, 에이전트별 진행률, 비용            │
│  │   └─ 활동 로그는 DB에서 마지막 N건 조회             │
│  └─ 배포: GET /api/projects/:id/deploy/status로 복구 │
│                                                     │
│  [오프라인 처리]                                      │
│  ├─ 네트워크 상태 감지 (navigator.onLine)             │
│  ├─ 오프라인 시: 토스트 알림 + 입력 비활성화           │
│  └─ 온라인 복귀 시: 자동 재연결 + 상태 동기화          │
└─────────────────────────────────────────────────────┘
```

---

## 7. 배포 오케스트레이터 (Deployment Orchestrator)

### 7.1 배포 파이프라인 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    배포 파이프라인                             │
│                                                             │
│  [빌드 완료] → [코드 검증] → [Vercel 배포] → [상태 모니터링]  │
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐ │
│  │ Pre-Deploy   │   │ Deploy       │   │ Post-Deploy      │ │
│  │ ─────────    │   │ ─────────    │   │ ──────────       │ │
│  │ • ESLint     │──▶│ • Vercel API │──▶│ • Health Check   │ │
│  │ • TypeCheck  │   │ • DNS 설정   │   │ • Smoke Test     │ │
│  │ • Build Test │   │ • SSL 인증서 │   │ • 성능 측정       │ │
│  │ • 보안 스캔  │   │ • 환경변수   │   │ • 알림 전송       │ │
│  └──────────────┘   └──────────────┘   └──────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Vercel REST API 배포 흐름

```typescript
// 배포 서비스 (FastAPI)
@Injectable()
export class DeploymentService {
  // 1단계: 프로젝트 생성
  async createProject(userId: string, projectName: string) {
    const response = await fetch('https://api.vercel.com/v10/projects', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.vercelToken}` },
      body: JSON.stringify({
        name: `yhai-${userId}-${projectName}`,
        framework: 'nextjs',
        buildCommand: 'next build',
        outputDirectory: '.next',
      }),
    });
    return response.json();
  }

  // 2단계: 파일 업로드 + 배포
  async deploy(projectId: string, files: DeployFile[]) {
    const fileUploads = await Promise.all(
      files.map(file => this.uploadFile(file))
    );

    const deployment = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.vercelToken}` },
      body: JSON.stringify({
        name: projectId,
        files: fileUploads,
        target: 'production',
      }),
    });
    return deployment.json();
  }

  // 3단계: 배포 상태 폴링
  async pollDeploymentStatus(deploymentId: string): Promise<DeployStatus> {
    const maxAttempts = 60;
    for (let i = 0; i < maxAttempts; i++) {
      const res = await fetch(
        `https://api.vercel.com/v13/deployments/${deploymentId}`,
        { headers: { Authorization: `Bearer ${this.vercelToken}` } }
      );
      const data = await res.json();

      if (data.readyState === 'READY') return { status: 'success', url: data.url };
      if (data.readyState === 'ERROR') return { status: 'failed', error: data.errorMessage };

      await new Promise(r => setTimeout(r, 5000));
    }
    return { status: 'timeout' };
  }
}
```

### 7.3 배포 전략

| 전략 | 설명 | 적용 시점 |
|------|------|----------|
| **Preview Deploy** | PR/브랜치별 임시 배포 | 사용자 프리뷰 요청 시 |
| **Production Deploy** | 최종 프로덕션 배포 | 사용자 "배포" 확정 시 |
| **Rollback** | 이전 배포로 즉시 복구 | 배포 실패 또는 사용자 요청 시 |
| **Custom Domain** | 사용자 도메인 연결 | Pro 플랜 이상 |

### 7.4 환경변수 관리

```
┌─────────────────────────────────────────┐
│          환경변수 관리 체계               │
│                                         │
│  [Supabase Vault]                       │
│  ├─ 사용자별 API 키 암호화 저장          │
│  ├─ 프로젝트별 환경변수 격리             │
│  └─ 배포 시 자동 주입                    │
│                                         │
│  [Vercel 환경변수 API]                   │
│  ├─ POST /v10/projects/:id/env         │
│  ├─ Development / Preview / Production  │
│  └─ 민감 정보 자동 암호화                │
└─────────────────────────────────────────┘
```

---

## 8. 보안 아키텍처 (Security Architecture)

### 8.1 인증 및 권한 관리

```
┌─────────────────────────────────────────────────────────┐
│                 인증/권한 아키텍처                        │
│                                                         │
│  [클라이언트]                                            │
│  ├─ Supabase Auth (OAuth 2.0 / Magic Link)              │
│  ├─ JWT Access Token (15분 만료)                         │
│  ├─ Refresh Token (7일, httpOnly Cookie)                 │
│  └─ PKCE Flow (SPA 보안 강화)                            │
│                                                         │
│  [서버 사이드]                                           │
│  ├─ Supabase SSR (@supabase/ssr)                        │
│  │   ├─ Server Component: createServerClient()          │
│  │   ├─ Route Handler: createRouteHandlerClient()       │
│  │   └─ Middleware: 세션 자동 갱신                        │
│  ├─ API 인증: Bearer Token 검증                          │
│  └─ 서비스 간 통신: Service Role Key (서버 전용)          │
│                                                         │
│  [Row Level Security]                                   │
│  ├─ projects: auth.uid() = user_id                      │
│  ├─ build_sessions: 프로젝트 소유자만 접근               │
│  ├─ deployments: 프로젝트 소유자만 접근                   │
│  └─ agent_logs: 프로젝트 소유자만 조회 가능               │
└─────────────────────────────────────────────────────────┘
```

### 8.2 RLS 정책 설계

```sql
-- 프로젝트 접근 제어
CREATE POLICY "Users can only access own projects"
  ON projects FOR ALL
  USING (auth.uid() = user_id);

-- 빌드 세션 접근 제어
CREATE POLICY "Users can only access own build sessions"
  ON build_sessions FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- 에이전트 로그 읽기 전용
CREATE POLICY "Users can only read own agent logs"
  ON agent_logs FOR SELECT
  USING (
    build_session_id IN (
      SELECT bs.id FROM build_sessions bs
      JOIN projects p ON p.id = bs.project_id
      WHERE p.user_id = auth.uid()
    )
  );

-- 배포 접근 제어
CREATE POLICY "Users can only access own deployments"
  ON deployments FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );
```

### 8.3 API 보안

```
┌─────────────────────────────────────────────────────┐
│                   API 보안 계층                      │
│                                                     │
│  Layer 1: Rate Limiting (Upstash Redis)             │
│  ├─ 인증 API: 5 req/min per IP                      │
│  ├─ 빌드 API: 3 req/min per user                    │
│  ├─ 일반 API: 60 req/min per user                   │
│  └─ AI API: 10 req/min per user (토큰 기반)          │
│                                                     │
│  Layer 2: Input Validation (Zod)                    │
│  ├─ 모든 API 입력 스키마 검증                        │
│  ├─ SQL Injection 방지 (Parameterized Query)        │
│  ├─ XSS 방지 (DOMPurify + CSP)                     │
│  └─ Path Traversal 방지 (경로 정규화)                │
│                                                     │
│  Layer 3: CORS & Headers                            │
│  ├─ 허용 Origin: 프로덕션 도메인만                    │
│  ├─ Content-Security-Policy                         │
│  ├─ X-Content-Type-Options: nosniff                 │
│  ├─ X-Frame-Options: DENY                           │
│  └─ Strict-Transport-Security                       │
│                                                     │
│  Layer 4: AI Prompt Security                        │
│  ├─ 사용자 입력 샌드박싱                              │
│  ├─ Prompt Injection 감지 필터                       │
│  ├─ 생성 코드 보안 스캔                               │
│  └─ 위험 패턴 차단 (eval, exec, rm -rf 등)           │
└─────────────────────────────────────────────────────┘
```

### 8.4 데이터 암호화

| 구분 | 방식 | 적용 대상 |
|------|------|----------|
| **전송 중 암호화** | TLS 1.3 | 모든 HTTP 통신 |
| **저장 시 암호화** | AES-256 (Supabase) | DB 전체 |
| **민감 데이터** | Supabase Vault | API 키, 토큰, 비밀번호 |
| **세션 토큰** | httpOnly + Secure + SameSite | 쿠키 기반 세션 |
| **파일 업로드** | Signed URL (15분 만료) | Supabase Storage |

---

## 9. 모니터링 및 관찰성 (Monitoring & Observability)

### 9.1 모니터링 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                   모니터링 스택                               │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ 에러 추적     │  │ 성능 모니터링 │  │ 로그 관리          │  │
│  │ ──────────   │  │ ──────────── │  │ ────────          │  │
│  │ Sentry       │  │ Vercel       │  │ Vercel Logs       │  │
│  │ • 프론트엔드 │  │ Analytics    │  │ • 실시간 스트림    │  │
│  │ • 백엔드     │  │ • Web Vitals │  │ • 구조화 로깅      │  │
│  │ • AI 에이전트│  │ • TTFB/FCP   │  │ • 검색 & 필터      │  │
│  │ • Source Map │  │ • 대역폭     │  │ • 보존 기간 관리   │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ 큐 모니터링   │  │ DB 모니터링   │  │ 알림              │  │
│  │ ──────────   │  │ ──────────── │  │ ──────            │  │
│  │ Celery + Redis       │  │ Supabase     │  │ 이메일/Slack      │  │
│  │ Dashboard    │  │ Dashboard    │  │ • 에러 임계값     │  │
│  │ • 작업 상태  │  │ • 연결 풀    │  │ • 성능 저하       │  │
│  │ • 실패율     │  │ • 쿼리 성능  │  │ • 빌드 실패       │  │
│  │ • 대기열     │  │ • 스토리지   │  │ • 비용 초과       │  │
│  └──────────────┘  └──────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 핵심 메트릭 (Key Metrics)

#### 비즈니스 메트릭
| 메트릭 | 설명 | 목표값 | 수집 방법 |
|--------|------|--------|----------|
| 빌드 성공률 | 전체 빌드 중 성공 비율 | ≥ 85% | DB 집계 |
| 평균 빌드 시간 | 빌드 요청~완료 소요 시간 | ≤ 3분 | 타임스탬프 차이 |
| 배포 성공률 | 전체 배포 중 성공 비율 | ≥ 95% | Vercel API |
| DAU/MAU | 일간/월간 활성 사용자 | 성장 추세 | Supabase Auth |
| 사용자 이탈률 | 첫 빌드 후 7일 내 재방문 | ≤ 40% | 이벤트 추적 |

#### 기술 메트릭
| 메트릭 | 설명 | 목표값 | 수집 방법 |
|--------|------|--------|----------|
| API 응답 시간 (P95) | 95번째 백분위 응답 시간 | ≤ 500ms | Vercel Analytics |
| 에러율 | 전체 요청 중 5xx 비율 | ≤ 1% | Sentry |
| Web Vitals LCP | Largest Contentful Paint | ≤ 2.5s | Vercel Analytics |
| Web Vitals CLS | Cumulative Layout Shift | ≤ 0.1 | Vercel Analytics |
| AI 토큰 사용량 | 빌드당 평균 토큰 소비 | 추적 | Claude API 응답 |
| 큐 대기 시간 | 작업 등록~실행 소요 시간 | ≤ 10s | Celery + Redis |

### 9.3 구조화 로깅 (Structured Logging)

```typescript
// 로깅 서비스
@Injectable()
export class LoggingService {
  private logger = new Logger();

  logBuildEvent(event: BuildEvent) {
    this.logger.log({
      level: 'info',
      service: 'build-orchestrator',
      event: event.type,
      projectId: event.projectId,
      userId: event.userId,
      buildSessionId: event.sessionId,
      phase: event.phase,
      duration: event.duration,
      agentId: event.agentId,
      tokensUsed: event.tokensUsed,
      timestamp: new Date().toISOString(),
    });
  }

  logError(error: Error, context: Record<string, unknown>) {
    Sentry.captureException(error, { extra: context });
    this.logger.error({
      level: 'error',
      message: error.message,
      stack: error.stack,
      ...context,
      timestamp: new Date().toISOString(),
    });
  }
}
```

### 9.4 알림 정책

```
┌─────────────────────────────────────────────────────┐
│                  알림 에스컬레이션                     │
│                                                     │
│  [P1 - 즉시] 서비스 다운, DB 연결 실패               │
│  → Slack #alerts + 이메일 + PagerDuty               │
│                                                     │
│  [P2 - 5분 이내] 에러율 5% 초과, API 응답 2s 초과    │
│  → Slack #alerts + 이메일                            │
│                                                     │
│  [P3 - 1시간 이내] 빌드 실패율 증가, 큐 적체          │
│  → Slack #monitoring                                │
│                                                     │
│  [P4 - 일간 리포트] 성능 추세, 비용 현황              │
│  → 이메일 일간 요약                                   │
└─────────────────────────────────────────────────────┘
```

---

## 10. 확장성 설계 (Scalability Design)

### 10.1 수평 확장 전략

```
┌─────────────────────────────────────────────────────────────┐
│                    확장성 아키텍처                            │
│                                                             │
│  [프론트엔드 - Vercel Edge]                                  │
│  ├─ Edge Functions: 글로벌 CDN 자동 배포                     │
│  ├─ ISR (Incremental Static Regeneration)                   │
│  ├─ 정적 자산: Vercel Edge Network 캐싱                      │
│  └─ 자동 스케일링: Vercel 관리                               │
│                                                             │
│  [백엔드 - Vercel Serverless]                                │
│  ├─ FastAPI → Serverless Functions 패키징                     │
│  ├─ Cold Start 최적화: 번들 크기 최소화                       │
│  ├─ 동시성: Vercel Pro (1,000 concurrent)                    │
│  └─ 장기 실행 작업: Vercel Cron + Celery + Redis                     │
│                                                             │
│  [데이터베이스 - Supabase]                                   │
│  ├─ Connection Pooling: Supavisor (PgBouncer 후속)           │
│  ├─ Read Replica: 읽기 분산 (Pro 플랜)                       │
│  ├─ 파티셔닝: build_sessions 시간 기반 파티션                 │
│  └─ 인덱스 최적화: 쿼리 패턴 기반                             │
│                                                             │
│  [큐 시스템 - Upstash Redis]                                 │
│  ├─ Serverless Redis: 자동 스케일링                           │
│  ├─ 글로벌 복제: 지역별 읽기 최적화                           │
│  └─ 메모리 관리: TTL 기반 자동 정리                           │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 캐싱 전략

```
┌─────────────────────────────────────────────────────┐
│                   캐싱 계층                          │
│                                                     │
│  L1: 브라우저 캐시                                   │
│  ├─ 정적 자산: Cache-Control max-age=31536000       │
│  ├─ API 응답: stale-while-revalidate 패턴           │
│  └─ React Query: 5분 staleTime                      │
│                                                     │
│  L2: Vercel Edge Cache                              │
│  ├─ ISR 페이지: revalidate = 3600                   │
│  ├─ API Route: s-maxage=60, stale-while-revalidate  │
│  └─ 이미지 최적화: next/image 자동 캐싱              │
│                                                     │
│  L3: Upstash Redis                                  │
│  ├─ 사용자 세션 데이터: TTL 30분                     │
│  ├─ 빌드 상태 캐시: TTL 5분                          │
│  ├─ 프로젝트 메타데이터: TTL 1시간                    │
│  └─ Rate Limit 카운터: TTL 1분                       │
│                                                     │
│  L4: Database Query Cache                           │
│  ├─ Supabase: Prepared Statements                   │
│  ├─ 커넥션 풀링: Supavisor                           │
│  └─ 쿼리 결과 캐시: pg_stat_statements              │
└─────────────────────────────────────────────────────┘
```

### 10.3 성능 예산 (Performance Budget)

| 항목 | 목표 | 전략 |
|------|------|------|
| **First Load JS** | ≤ 150KB (gzipped) | 코드 스플리팅, 트리 셰이킹 |
| **LCP** | ≤ 2.5s | 폰트 프리로드, 이미지 최적화 |
| **FID** | ≤ 100ms | 메인 스레드 차단 최소화 |
| **CLS** | ≤ 0.1 | 레이아웃 예약, 스켈레톤 UI |
| **API P95** | ≤ 500ms | 쿼리 최적화, 캐싱 |
| **빌드 시작** | ≤ 3s | 큐 우선순위, 워커 프리워밍 |

### 10.4 비용 최적화

```
┌─────────────────────────────────────────────────────┐
│                  비용 관리 전략                       │
│                                                     │
│  [AI 비용 (가장 큰 비용 항목)]                       │
│  ├─ PM Agent: Opus → 빌드당 ~$0.50                  │
│  ├─ Worker Agent: Sonnet → 빌드당 ~$0.15 × 3-5     │
│  ├─ 프롬프트 캐싱: 반복 컨텍스트 캐싱 (50% 절감)    │
│  ├─ 토큰 예산: 빌드당 최대 토큰 한도 설정             │
│  └─ 예상 빌드당 비용: $1.00-$1.50                    │
│                                                     │
│  [인프라 비용]                                       │
│  ├─ Vercel Pro: $20/월 (팀원 추가 $20/월)            │
│  ├─ Supabase Pro: $25/월                             │
│  ├─ Upstash Redis: $10/월 (사용량 기반)              │
│  └─ 예상 고정비: $55/월                              │
│                                                     │
│  [비용 모니터링]                                     │
│  ├─ 빌드당 AI 토큰 사용량 추적                        │
│  ├─ 일/주/월 비용 대시보드                            │
│  ├─ 비용 임계값 알림 ($100/일 초과 시)               │
│  └─ 사용자별 무료 크레딧 관리                         │
└─────────────────────────────────────────────────────┘
```

### 10.5 장애 복구 (Disaster Recovery)

| 구분 | RTO | RPO | 전략 |
|------|-----|-----|------|
| **프론트엔드** | < 1분 | 0 | Vercel 자동 복구, Edge 캐시 |
| **백엔드 API** | < 5분 | 0 | Serverless 자동 재시작 |
| **데이터베이스** | < 15분 | < 1분 | Supabase 자동 백업 (일 2회) |
| **Redis 캐시** | < 1분 | 캐시 손실 허용 | Upstash 자동 복구 |
| **빌드 세션** | < 5분 | 세션 재시작 | Celery + Redis 재시도 메커니즘 |

---

## 부록: 기술 의사결정 기록 (ADR)

| ID | 결정 | 근거 | 대안 |
|----|------|------|------|
| D-001 | Vercel 배포 | Next.js 네이티브 지원, Edge 최적화 | AWS Amplify, Netlify |
| D-002 | Supabase 선택 | Auth+DB+Storage+Realtime 통합, RLS | Firebase, PlanetScale |
| D-003 | Celery + Redis + Upstash | Serverless Redis 호환, 비용 효율 | AWS SQS, RabbitMQ |
| D-004 | Claude API 단일 | 코드 생성 품질 최고, Agent SDK | GPT-4o, Gemini 혼합 |
| D-005 | Sentry 에러 추적 | Next.js 통합 우수, Source Map 지원 | Datadog, LogRocket |
| D-006 | Supabase Realtime | DB 연동 자연스러움, RLS 적용 | Socket.io, Pusher |

