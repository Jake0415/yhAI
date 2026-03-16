# YHAI 구현 로드맵 (ROADMAP)

> Plan 5 산출물
> 작성일: 2026-03-14
> 상태: Gate Review 대기
> 기반 문서: `prd.md`, `master-plan.md`, `information-architecture.md`, `proposals/deployment-strategy.md`

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| v1 | 2026-03-14 | 초안 완성. 5 Phase + V2 로드맵 |

---

## 전체 타임라인 요약

```
Phase 0       Phase 1          Phase 2           Phase 3        Phase 4       V2
인프라 세팅   MVP Core        Multi-Agent       Deploy&Polish  Monetization  성장 기능
[1주]        [4주]           [3주]             [2주]          [2주]         [이후]
|------------|---------------|-----------------|-------------|-------------|------->
W1           W2-W5           W6-W8             W9-W10        W11-W12

                     MVP 런칭 ----------->     V1 런칭 ---->
                     (Phase 0+1 완료)          (Phase 0~3 완료)
```

**총 개발 기간**: 약 12주 (3개월) -- Phase 0~4 완료 기준
**MVP 런칭**: 5주 (Phase 0+1)
**V1 런칭**: 10주 (Phase 0~3)

---

## Phase 0: 인프라 세팅 (1주, W1)

> 목표: 프론트엔드, 백엔드, DB, CI/CD 기반 인프라를 세팅하여 개발 시작 준비 완료

### 체크리스트

#### 0-1. 모노레포 구조 확립
- [ ] npm workspaces 설정 (`frontend/`, `backend/`, `packages/shared/`)
- [ ] `packages/shared/` 생성 -- 공유 타입, Zod 스키마, 상수
- [ ] TypeScript 프로젝트 참조(Project References) 설정
- [ ] 루트 `package.json` 스크립트 정리 (`dev`, `build`, `lint`, `check-all`)

#### 0-2. 프론트엔드 구조 완성
- [ ] Next.js 15.5.3 App Router Route Group 구조 세팅
  - `(public)/`, `(auth)/`, `(portal)/`, `(admin)/`
- [ ] 레이아웃 파일 생성 (Root, Public, Auth, Portal, Admin)
- [ ] shadcn/ui 기본 컴포넌트 설치 (Button, Card, Input, Form, Dialog, Sheet, Avatar, Badge, Separator)
- [ ] TailwindCSS v4 테마 설정 (디자인 시스템 변수)
- [ ] next-intl 기본 구조 세팅 (한국어 기본)

#### 0-3. 백엔드 세팅

- [ ] FastAPI 프로젝트 초기화 (`backend/`)
- [ ] 모듈 구조 설계 (auth, projects, conversations, experts, requirements, teams, builds, deployments)
- [ ] 환경변수 설정 (`.env.example`)
- [ ] Swagger/OpenAPI 문서 자동 생성 설정

#### 0-4. Supabase 프로젝트 + DB 스키마
- [ ] Supabase 프로젝트 생성
- [ ] Prisma ORM 설정 + Supabase PostgreSQL 연결
- [ ] 핵심 테이블 마이그레이션 (User, Project, Conversation, Message, ExpertProfile)
- [ ] Row Level Security(RLS) 정책 기본 설정
- [ ] Supabase Auth 설정 (OAuth 프로바이더 등록)

#### 0-5. CI/CD 파이프라인
- [ ] GitHub Actions 워크플로우 (lint + type-check + build)
- [ ] Vercel 프론트엔드 자동 배포 연결
- [ ] Vercel 프리뷰 배포 (PR별)
- [ ] Husky + lint-staged 설정 (프리커밋 검사)

### 완료 기준
- `npm run dev`로 프론트/백엔드 동시 실행 가능
- Supabase DB에 핵심 테이블 생성 완료
- PR 생성 시 CI 파이프라인 자동 실행
- `main` 브랜치 푸시 시 Vercel 자동 배포

---

## Phase 1: MVP Core (4주, W2-W5)

> 목표: 사용자가 AI 전문가와 대화하고, 단일 에이전트로 기본 빌드 + 미리보기까지 가능한 end-to-end 흐름

### W2: 인증 + 대시보드

#### 1-1. 인증 시스템 (Supabase Auth)
- [ ] Supabase Auth 클라이언트 설정 (`@supabase/ssr`)
- [ ] 로그인 페이지 (`/login`) -- 소셜(Google) + 이메일/비밀번호
- [ ] 회원가입 페이지 (`/signup`) -- 이메일 인증 플로우
- [ ] OAuth 콜백 처리 (`/auth/callback`)
- [ ] 미들웨어 인증 가드 (포탈 라우트 보호)
- [ ] 세션 관리 + 토큰 자동 갱신
- [ ] AuthProvider 컨텍스트 (현재 사용자 상태)

#### 1-2. 대시보드 + 프로젝트 생성
- [ ] 대시보드 페이지 (`/dashboard`) -- 프로젝트 카드 목록
- [ ] 프로젝트 카드 컴포넌트 (이름, 상태 뱃지, 최근 활동, 썸네일)
- [ ] 새 프로젝트 생성 (`/dashboard/new`) -- 인텐트 캡처 UI
  - 자유 텍스트 입력 ("무엇을 만들고 싶으세요?")
  - 유사 사례 카드 표시 (초기에는 하드코딩된 예시)
- [ ] Backend: 프로젝트 CRUD API (`/api/projects`)
- [ ] 프로젝트 상태 머신 구현 (상태 전이 로직)

### W3: 전문가 채팅

#### 1-3. 전문가 시스템 기반
- [ ] 전문가 레지스트리 DB 시드 (8개 기본 전문가 프로필)
  - 이커머스, 마케팅, 콘텐츠, SaaS, 커뮤니티, 예약, UI/UX, 기술 아키텍트
- [ ] Backend: 도메인 감지기 (Claude Haiku 기반 대화 분류)
- [ ] Backend: 전문가 추천 API (`GET /api/experts/recommend`)
- [ ] Backend: 전문가 초빙/퇴장 API
- [ ] Frontend: 전문가 추천 카드 UI (수락/거부 버튼)
- [ ] Frontend: 채팅 사이드 패널 (참여 전문가 목록, 추가/제거)

#### 1-4. 멀티 전문가 채팅 (단일 전문가부터)
- [ ] Backend: Claude API SSE 스트리밍 연동
- [ ] Backend: 멀티 전문가 프롬프트 조합 엔진
- [ ] Frontend: 채팅 UI (`/projects/[id]/chat`)
  - 메시지 버블 (사용자/전문가 구분)
  - 전문가별 아바타/이름/색상
  - SSE 스트리밍 실시간 표시
  - 마크다운 렌더링
  - 예시 칩 (빠른 응답)
- [ ] Frontend: `useChat` 커스텀 훅
- [ ] 메시지 히스토리 저장 + 페이지네이션

### W4: 요구사항 + 기본 빌드

#### 1-5. 요구사항 자동 추출
- [ ] Backend: 대화에서 요구사항 추출 파이프라인 (Claude 호출)
- [ ] Backend: 요구사항 CRUD API
- [ ] Frontend: 요구사항 대시보드 (`/projects/[id]/requirements`)
  - 요구사항 카드 (필수/권장/선택 분류)
  - 드래그&드롭 우선순위 재정렬
  - 개별 편집/삭제
  - AI 추출 근거 표시
- [ ] "요구사항 확정" 버튼 -> 상태 전환 (`REQUIREMENTS_REVIEW` -> `TEAM_PLANNING`)

#### 1-6. 기본 빌드 (단일 에이전트)
- [ ] Backend: 빌드 엔진 기본 구조 (BullMQ 큐)
- [ ] Backend: 단일 에이전트 코드 생성 (Claude Sonnet)
  - 시스템 프롬프트: Next.js 15 + TailwindCSS + shadcn/ui 코드 생성
  - 파일 단위 아티팩트 생성
- [ ] Backend: 빌드 상태 관리 + 실시간 이벤트 발행 (Supabase Realtime)
- [ ] Frontend: 간소화된 빌드 진행 화면 (`/projects/[id]/build`)
  - 진행률 바
  - 활동 로그 (실시간)
  - 빌드 시작/중지 버튼

### W5: 미리보기 + 통합 테스트

#### 1-7. 미리보기
- [ ] Backend: 생성된 파일 저장 (Supabase Storage 또는 DB)
- [ ] Backend: 파일 트리 조회 API
- [ ] Frontend: 3-패널 미리보기 (`/projects/[id]/preview`)
  - 왼쪽: 파일 트리
  - 중앙: 라이브 프리뷰 (iframe / WebContainer)
  - 오른쪽: 수정 대화창 (간소화)
- [ ] 기본 코드 하이라이팅 (파일 클릭 시)

#### 1-8. MVP 통합 + QA
- [ ] End-to-End 플로우 테스트 (회원가입 -> 프로젝트 -> 채팅 -> 요구사항 -> 빌드 -> 미리보기)
- [ ] 에러 핸들링 + 로딩 상태 + 빈 상태 처리
- [ ] 반응형 레이아웃 검증 (데스크톱 우선)
- [ ] 크리티컬 버그 수정

### Phase 1 완료 기준 (MVP)
- 사용자가 회원가입 -> 프로젝트 생성 -> 전문가 대화 -> 요구사항 확정 -> 빌드 -> 미리보기 가능
- 단일 에이전트로 기본적인 Next.js 프로젝트 코드 생성
- 3-패널 미리보기에서 생성 결과 확인 가능
- 대시보드에서 프로젝트 관리 가능

---

## Phase 2: Multi-Agent (3주, W6-W8)

> 목표: PM Agent 동적 팀 생성, Phase 기반 병렬 빌드, Git Worktree 격리 구현

### W6: PM Agent + 팀 구성

#### 2-1. PM Agent 구현
- [ ] Backend: PM Agent 모듈 (Claude Opus 기반)
  - 요구사항 분석 -> 복잡도 판단 (Low/Medium/High)
  - 팀 구성 제안 (역할, 모델, 인원수)
  - Phase 분해 (순차/병렬 구분, 의존성 그래프)
  - 태스크 생성 + 에이전트 배정
- [ ] Backend: 분석 과정 SSE 스트리밍 (PM의 사고 과정 실시간 전달)
- [ ] Backend: 비용 예측 엔진 (토큰 예상량 x 모델 단가)

#### 2-2. 팀 관리 UI
- [ ] Frontend: AI 팀 페이지 (`/projects/[id]/team`)
  - PM 분석 스트리밍 표시 (타이핑 효과)
  - 팀 구성 제안 카드 (에이전트별 역할/모델/아바타)
  - Phase 실행 계획 타임라인
  - 비용 예측 표시
  - 에이전트 추가/제거 UI
  - "팀 구성 승인" 버튼

### W7: Phase 기반 빌드 + Git Worktree

#### 2-3. Phase 실행 엔진
- [ ] Backend: Phase 순차/병렬 실행 엔진
  - 의존성 기반 실행 순서 결정
  - Phase 내 태스크 병렬 실행
  - Phase 간 결과 전달
- [ ] Backend: 에이전트별 시스템 프롬프트 관리
  - Frontend Agent: React/Next.js/TailwindCSS 전문
  - Backend Agent: FastAPI/API/Server Actions 전문
  - DB Agent: PostgreSQL/Prisma/RLS 전문
  - QA Agent: 테스트/검증 전문

#### 2-4. Git Worktree 격리
- [ ] Backend: Git 저장소 초기화 (프로젝트별)
- [ ] Backend: 에이전트별 Worktree 생성/관리
- [ ] Backend: 아티팩트 병합 로직 (충돌 감지 + 자동 해결 시도)
- [ ] Backend: 병합 실패 시 PM Agent 에스컬레이션

#### 2-5. 에이전트 간 통신
- [ ] Backend: AgentMessage 시스템 (API 합의, 타입 공유, 에스컬레이션)
- [ ] Backend: 에이전트 상태 관리 (`IDLE` -> `WORKING` -> `WAITING` -> `DONE`)

### W8: Mission Control UI + 통합

#### 2-6. Mission Control UI 강화
- [ ] Frontend: 빌드 페이지 전면 개편 (`/projects/[id]/build`)
  - Phase 진행 바 (전체 + 개별)
  - 에이전트별 진행률 카드 (상태 아이콘, 현재 작업, 토큰 사용량)
  - 실시간 활동 로그 (Supabase Realtime 구독)
  - 에이전트 간 통신 메시지 표시
- [ ] Frontend: 프로젝트 탭 네비게이션 (상태별 가용성 적용)

#### 2-7. 멀티 에이전트 통합 테스트
- [ ] 복잡도별 시나리오 테스트
  - Low: 랜딩 페이지 (1-2인 팀)
  - Medium: 블로그/포트폴리오 (3인 팀)
  - High: SaaS/이커머스 (4-5인 팀)
- [ ] 파일 충돌 시나리오 테스트
- [ ] Phase 간 의존성 전달 검증
- [ ] 빌드 실패/재시도 시나리오 테스트

### Phase 2 완료 기준
- PM Agent가 요구사항을 분석하여 동적으로 3~5명 팀 구성
- Phase 기반 순차/병렬 빌드 동작
- Git Worktree로 에이전트별 파일 격리
- Mission Control에서 실시간 빌드 진행 모니터링

---

## Phase 3: Deploy & Polish (2주, W9-W10)

> 목표: Vercel 자동 배포 파이프라인 완성, 포인트&토크 수정, 프로젝트 재방문 기능

### W9: 배포 + 수정

#### 3-1. Vercel 자동 배포
- [ ] Backend: Vercel REST API 연동 모듈
  - 프로젝트 생성
  - 파일 인라인 업로드 (Git 없이)
  - 환경변수 자동 설정
  - 배포 트리거 + 상태 모니터링
- [ ] Backend: 배포 파이프라인 (스테이징 -> 프로덕션 2단계)
- [ ] Backend: Vercel 웹훅 수신 (배포 완료/실패 이벤트)
- [ ] Frontend: 배포 페이지 (`/projects/[id]/deploy`)
  - 배포 파이프라인 진행 상태
  - 스테이징/프로덕션 URL 표시
  - QR 코드 생성
  - 배포 이력 목록

#### 3-2. 포인트&토크 수정
- [ ] Frontend: 프리뷰 iframe 내 요소 선택 인터랙션
  - 요소 호버 시 하이라이트
  - 클릭 시 요소 정보 캡처 (CSS selector, 컴포넌트명)
- [ ] Backend: 포인트&토크 수정 API
  - 선택된 요소 + 자연어 지시 -> AI가 해당 파일만 수정
  - 부분 재빌드 (전체 재빌드 아님)
- [ ] Frontend: 변경 전/후 비교 표시
- [ ] 수정 이력 관리

### W10: 재방문 + 전체 Polish

#### 3-3. 프로젝트 재방문 + 컨텍스트 복원
- [ ] Backend: 대화 컨텍스트 복원 로직 (요약 + 핵심 포인트)
- [ ] Backend: 변경 영향 분석 (기존 코드 기반)
- [ ] Frontend: 대시보드에서 배포 완료 프로젝트 재진입 플로우
- [ ] 상태 전환: `DEPLOYED` -> `CHATTING` (기능 추가 모드)

#### 3-4. 대시보드 완성
- [ ] 프로젝트 검색 + 필터 (상태별, 최신순)
- [ ] 최근 활동 타임라인
- [ ] 프로젝트 아카이브/삭제
- [ ] 빈 상태 UI ("첫 프로젝트를 만들어보세요")

#### 3-5. 전체 UX Polish
- [ ] 로딩 상태 (스켈레톤 UI)
- [ ] 에러 상태 (에러 바운더리 + 사용자 친화적 메시지)
- [ ] 빈 상태 (각 화면별)
- [ ] 토스트 알림 (성공/에러/진행)
- [ ] 키보드 단축키 (채팅: Enter 전송, Ctrl+K 명령 팔레트)
- [ ] 다크 모드 검증 + 수정
- [ ] 반응형 레이아웃 최종 검수 (데스크톱/태블릿)

#### 3-6. 랜딩 페이지 + 퍼블릭
- [ ] 랜딩 페이지 (`/`) -- 히어로, 기능 소개, 사용 데모, CTA
- [ ] 도움말 페이지 (`/docs`) -- 시작 가이드, FAQ
- [ ] 404 페이지

### Phase 3 완료 기준 (V1)
- Vercel 자동 배포 end-to-end 동작
- 포인트&토크로 미리보기에서 수정 + 부분 재빌드
- 배포 완료 프로젝트 재방문 + 기능 추가 플로우 동작
- 랜딩 페이지 + 대시보드 완성
- 주요 화면 UX polish 완료

---

## Phase 4: Monetization (2주, W11-W12)

> 목표: 요금제 + Stripe 결제 + 사용량 트래킹으로 수익 구조 확립

### W11: 요금제 + 결제

#### 4-1. 요금제 시스템
- [ ] Backend: 사용자 플랜 관리 (Free/Pro/Business)
- [ ] Backend: 플랜별 제한 적용
  - 프로젝트 수 제한
  - 빌드 횟수 제한
  - 에이전트 팀 인원 제한
  - 동시 빌드 수 제한
- [ ] Backend: 사용량 트래킹 (토큰, 빌드, 배포 건수)
- [ ] DB: Subscription, UsageRecord 테이블 마이그레이션

#### 4-2. Stripe 결제 연동
- [ ] Backend: Stripe 고객 생성 + 구독 관리
- [ ] Backend: Stripe Checkout 세션 생성
- [ ] Backend: Stripe 웹훅 처리 (결제 성공/실패, 구독 변경/취소)
- [ ] Frontend: 요금제 페이지 (`/pricing`) -- 3단계 플랜 비교표
- [ ] Frontend: 결제/요금제 설정 (`/settings/billing`)
  - 현재 플랜 표시
  - 사용량 게이지 바
  - 플랜 업그레이드/다운그레이드
  - 결제 내역

### W12: 비용 대시보드 + 마무리

#### 4-3. 비용 대시보드
- [ ] Frontend: 빌드 화면 비용 섹션
  - 빌드 전 예상 비용 표시
  - 빌드 중 실시간 비용 업데이트
  - 에이전트별/Phase별 비용 분류
- [ ] Frontend: 사용량 리포트 (`/settings/billing` 내)
  - 월간 사용량 차트
  - 프로젝트별 비용 분류
  - 남은 크레딧/한도 표시

#### 4-4. 플랜 제한 UI
- [ ] 빌드 한도 초과 시 업그레이드 유도 모달
- [ ] 프로젝트 생성 한도 도달 시 안내
- [ ] Free 플랜 제한 배너 (비침습적)

#### 4-5. 최종 QA + 런칭 준비
- [ ] 전체 E2E 테스트 (Free -> 회원가입 -> 프로젝트 -> 빌드 -> 배포 -> 결제 -> Pro 전환)
- [ ] 보안 점검 (RLS 검증, API 키 암호화, Rate Limiting)
- [ ] 성능 점검 (Core Web Vitals, 빌드 시간)
- [ ] 에러 모니터링 설정 (Sentry 또는 Vercel Analytics)
- [ ] SEO 기본 설정 (메타태그, OG 이미지, sitemap)

### Phase 4 완료 기준
- Free/Pro/Business 요금제 동작
- Stripe 결제 end-to-end (구독/취소/변경)
- 사용량 트래킹 + 비용 대시보드
- 플랜별 제한 정상 적용

---

## V2 Features (Phase 4 이후, 우선순위순)

> 목표: 차별화 기능 확대, 커뮤니티 성장, 경쟁 우위 확보

### V2-1: 코파일럿 빌드 강화 (P1)
- [ ] 빌드 중 실시간 사용자 개입 고도화
- [ ] 특정 에이전트에게 직접 지시
- [ ] Phase 순서 실시간 변경
- [ ] 빌드 분기점(Checkpoint) 저장/복원

### V2-2: 사고 과정 스트리밍 (P1)
- [ ] 에이전트 의사결정 과정 실시간 패널
- [ ] "왜 이 기술을 선택했는가" 근거 표시
- [ ] 대안 비교 시각화

### V2-3: 빌드 리플레이 (P1)
- [ ] ActivityLog 기반 빌드 과정 타임라인 재생
- [ ] 재생 속도 조절 (1x, 2x, 5x)
- [ ] 랜딩 페이지 데모용 공개 리플레이
- [ ] 특정 시점으로 점프

### V2-4: 스냅샷 포크 갤러리 (P2)
- [ ] 프로젝트 공개 설정 (Public/Private)
- [ ] 갤러리 페이지 (`/gallery`) -- 도메인/인기순 필터
- [ ] 프로젝트 미리보기 카드 (스크린샷 + 사용 기술 태그)
- [ ] 원클릭 포크 -> 새 프로젝트 생성
- [ ] 포크 횟수/인기도 표시

### V2-5: 전문가 디베이트 (P2)
- [ ] 특정 의사결정 포인트에서 전문가 간 찬반 토론 UI
- [ ] 전문가별 주장 + 근거 카드
- [ ] 사용자 최종 선택 버튼
- [ ] 디베이트 결과 요구사항 반영

### V2-6: 브랜치 빌드 / A/B 빌드 (P2)
- [ ] 동일 요구사항 2개 버전 동시 빌드
- [ ] 비교 뷰 (side-by-side 미리보기)
- [ ] 하이브리드 병합 (A의 헤더 + B의 본문)
- [ ] 비용: 2배 토큰 소모 안내

### V2-7: 커스텀 도메인 (P2)
- [ ] Vercel API 도메인 연결
- [ ] DNS 설정 가이드
- [ ] SSL 자동 발급

### V2-8: 관리자 대시보드 (P2)
- [ ] `/admin` -- 사용자/프로젝트/전문가 관리
- [ ] 사용 통계 차트 (MAU, 빌드 수, 매출)
- [ ] 전문가 프로필 편집 (시스템 프롬프트 수정)

### V2-9: 영어 지원 (P2)
- [ ] next-intl 기반 영문 번역
- [ ] 전문가 시스템 프롬프트 영문 버전
- [ ] 랜딩 페이지 영문

---

## 마일스톤 요약

| 마일스톤 | 기간 | 핵심 성과 | PRD 기능 |
|---------|------|----------|----------|
| **Phase 0** | W1 (1주) | 개발 인프라 완성 | - |
| **Phase 1 (MVP)** | W2-W5 (4주) | 전문가 채팅 + 단일 빌드 + 미리보기 | F-M01~M11 |
| **Phase 2** | W6-W8 (3주) | PM Agent + 멀티에이전트 + Phase 빌드 | F-M06, F-M07 강화 |
| **Phase 3 (V1)** | W9-W10 (2주) | Vercel 배포 + 수정 + Polish | F-M09, F-M10, F-S04 |
| **Phase 4** | W11-W12 (2주) | 요금제 + 결제 + 비용 대시보드 | F-S03, F-S05, F-S06 |
| **V2** | W13+ | 차별화 기능 확장 | F-S01, F-S02, F-C01~C05 |

---

## 의존성 그래프

```
Phase 0 (인프라)
    |
    v
Phase 1 (MVP Core)
    |
    +---> Phase 2 (Multi-Agent) ---> Phase 3 (Deploy & Polish)
    |                                        |
    |                                        v
    |                                   Phase 4 (Monetization)
    |                                        |
    |                                        v
    +--------------------------------------> V2 Features
```

- Phase 0은 모든 Phase의 전제 조건
- Phase 1은 Phase 2, 3의 전제 조건
- Phase 2와 Phase 3은 독립적 병렬 가능하나, 순차 진행 권장 (1인 개발)
- Phase 4는 Phase 3 이후 (배포 기능 있어야 유료 가치 제공)
- V2는 Phase 4 이후 우선순위순 진행

---

## 기술 부채 관리

> 각 Phase에서 발생할 수 있는 기술 부채와 해소 시점

| 부채 | 발생 시점 | 해소 시점 | 설명 |
|------|----------|----------|------|
| 하드코딩된 유사 사례 카드 | Phase 1 | Phase 3 | MVP에서는 정적 데이터, 이후 AI 생성으로 전환 |
| 단일 에이전트 빌드 | Phase 1 | Phase 2 | MVP는 단일 에이전트, Phase 2에서 멀티에이전트로 교체 |
| 테스트 부족 | Phase 1-2 | Phase 3-4 | MVP는 핵심 E2E만, 이후 단위/통합 테스트 보강 |
| 에러 핸들링 미흡 | Phase 1 | Phase 3 | MVP는 기본 에러 처리, Phase 3에서 UX polish |
| 모바일 미지원 | Phase 1-2 | Phase 3 | 데스크톱 우선, Phase 3에서 반응형 검수 |

---

## 부록: 참조 문서

| 문서 | 경로 |
|------|------|
| PRD | `docs/planning/prd.md` |
| 마스터 플랜 | `docs/planning/master-plan.md` |
| 서비스 시나리오 | `docs/planning/user-scenarios.md` |
| 정보 아키텍처 | `docs/planning/information-architecture.md` |
| 배포 전략 | `docs/planning/proposals/deployment-strategy.md` |
| 팀 구성 개선안 | `docs/planning/proposals/team-composition-ideas.md` |
| 의사결정 로그 | `docs/planning/decisions.md` |
