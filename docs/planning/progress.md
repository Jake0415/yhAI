# 기획 진행 상태

## 현재 상태
- **현재 단계**: 전체 기획 완료 (Plan 1~5) — PPT 정리 + 이메일 발송 진행 중
- **마지막 업데이트**: 2026-03-14
- **이전 Gate Review**: Plan 2 승인 완료, 3건 일괄 승인 완료 (Vercel+Supabase, Claude Code 자동화, 팀 구성)

## Gate Review 기록

| # | 단계 | 상태 | 완료일 | 비고 |
|---|------|------|--------|------|
| 0 | 마스터 플랜 초안 | 완료 | 2026-03-12 | 기술 스택, 서비스 흐름, 전문가 시스템, 팀 운영 체계 확정 |
| 1 | Plan 1: 서비스 시나리오 v1 | 완료 | 2026-03-12 | 페르소나 3명, 시나리오 5개, 전문가 초빙 상세 흐름, 화면별 플로우 완성 |
| 1-v2 | Plan 1: 서비스 시나리오 v2 | 완료 (승인) | 2026-03-14 | 시나리오 3 전면 재설계, 6대 문제-해결 전략, 7개 창의적 아이디어 추가 |
| - | 추가 조사: 배포/인프라 전략 v1 | 완료 | 2026-03-14 | GCP Cloud Run + Neon 3단계 하이브리드 전략 제안 |
| - | 추가 조사: 배포/인프라 전략 v2 (Vercel+Supabase) | 완료 (승인) | 2026-03-14 | 사용자 결정: Vercel + Supabase로 전략 변경. 상세 아키텍처 + 비용 분석 완료 |
| - | 추가 조사: Claude Code 자동화 개발 방안 | 완료 (승인) | 2026-03-14 | Agent Teams + Git Worktree + CI/CD 파이프라인 |
| - | 추가 조사: 팀 구성 개선안 | 완료 (승인) | 2026-03-14 | 복잡도별 동적 결정 방식 채택. YHAI = High complexity -> 안 B(4인 Standard) 또는 C(Expert) |
| 2 | Plan 2: 정보 아키텍처 | 완료 (승인) | 2026-03-14 | 사이트맵, 화면 25개, URL 구조, ERD 20+ 테이블, API 50+ 엔드포인트, 실시간 통신 아키텍처 |
| 3 | Plan 3: 시스템 아키텍처 | 완료 | 2026-03-14 | 프론트엔드/백엔드/AI오케스트레이션/DB/실시간/배포/보안/모니터링/확장성 10개 섹션 + ADR 부록, 1,800줄 |
| 4 | Plan 4: UI/UX 디자인 | 완료 | 2026-03-14 | 디자인 원칙, 디자인 시스템, 8개 핵심 화면 와이어프레임, 인터랙션 패턴, 반응형, 접근성 |
| 5 | Plan 5: PRD + ROADMAP | 완료 | 2026-03-14 | PRD(MoSCoW 28개 기능, NFR, KPI) + ROADMAP(5 Phase + V2, 12주 타임라인) |

## 추가 조사 산출물

| 산출물 | 경로 | 상태 |
|--------|------|------|
| 배포/인프라 조사 리포트 v1 | `docs/planning/research/deployment-infrastructure-analysis.md` | 완료 |
| 배포/인프라 전략 제안서 v1 | `docs/planning/proposals/deployment-strategy.md` | v2로 업데이트됨 |
| Vercel + Supabase 조사 리포트 | `docs/planning/research/vercel-supabase-integration.md` | 완료 (승인) |
| Vercel + Supabase 아키텍처 정의서 | `docs/planning/proposals/vercel-supabase-architecture.md` | 완료 (승인) |
| 배포/인프라 전략 제안서 v2 (통합) | `docs/planning/proposals/deployment-strategy.md` | 완료 (승인) |

## Plan 1 산출물

| 산출물 | 경로 | 상태 | 버전 |
|--------|------|------|------|
| 경쟁사 분석 리포트 | `docs/planning/research/ai-web-builder-analysis.md` | 완료 | v1 |
| 에이전트 UX 패턴 조사 | `docs/planning/research/agent-ux-patterns.md` | 완료 | v1 |
| 시나리오 개선 제안서 (v1) | `docs/planning/proposals/scenario-improvements.md` | 완료 | v1 |
| 에이전트 오케스트레이션 심층 조사 | `docs/planning/research/agent-orchestration-deep-dive.md` | 완료 | v2 신규 |
| 시나리오 v2 핵심 개선 제안서 | `docs/planning/proposals/scenario-v2-improvements.md` | 완료 | v2 신규 |
| **서비스 시나리오 정의서** | `docs/planning/user-scenarios.md` | 완료 (승인) | v2 |

## Plan 1 v2 주요 변경사항

- **시나리오 3 전면 재설계**: 고정 5인 팀 --> PM Agent 동적 팀 생성 + Phase 분해 + Git Worktree 격리
- **신규 섹션 6**: AI 팀 빌드 메커니즘 상세 (PM Agent 프로세스, Phase 실행 흐름, 에이전트 협업 패턴)
- **신규 섹션 7**: 6대 문제점과 해결 전략 (파일 충돌, 컨텍스트 유실, 에러 전파, 무한 루프, 비용 폭발, 품질 불일치)
- **신규 섹션 8**: 7개 창의적 차별화 아이디어 (코파일럿 빌드, 사고 과정 스트리밍, 전문가 디베이트, 브랜치 빌드, A/B 빌드, 빌드 리플레이, 스냅샷 포크)
- **차별화 포인트 확장**: 6개 --> 12개

## 배포 전략 v2 주요 변경사항 (2026-03-14)

- **전략 변경**: GCP Cloud Run + Neon --> Vercel + Supabase (사용자 결정)
- **앱 호스팅**: Vercel REST API 파일 인라인 업로드 (Git 불필요)
- **DB**: Supabase 올인원 (PostgreSQL + Auth + Storage + Realtime)
- **멀티테넌트**: 하이브리드 (공유 RLS + 전용 프로젝트)
- **비용**: 하이브리드 전략 시 100명 ~$295/월, 1,000명 ~$2,175/월
- **의사결정**: D-008, D-009, D-010 기록 완료

## Plan 1 체크리스트

- [x] **사용자 페르소나** 정의 (3명: 창업 기획자, 1인 개발자, 소상공인)
- [x] **핵심 사용자 시나리오** 작성 (5개 시나리오)
- [x] **전문가 초빙 시나리오** 상세 정의 (자동 감지, 수동 추가, 퇴장)
- [x] **화면별 사용자 플로우** (flowchart)
- [x] **시나리오 3 재설계** -- PM Agent 동적 팀 생성 + Phase 기반 빌드 (v2)
- [x] **AI 팀 빌드 메커니즘 상세** -- 팀 구성, Phase 실행, 에이전트 협업 패턴 (v2)
- [x] **문제점-해결 전략** -- 6대 멀티에이전트 문제와 YHAI 해결 메커니즘 (v2)
- [x] **창의적 차별화 아이디어** -- 7개 아이디어 + 우선순위 매트릭스 (v2)
- [x] 결과물: `docs/planning/user-scenarios.md` (v2)

## Plan 2 체크리스트

- [x] **사이트맵** (전체 페이지 구조) -- 4개 영역, 25+ 페이지
- [x] **화면 목록 + 각 화면의 핵심 요소** -- P1~P4, A1~A4, D1~D3, PJ1~PJ7, S1~S4
- [x] **네비게이션 구조** (글로벌 네비 + 사이드바 + 프로젝트 탭 + 상태별 가용성)
- [x] **URL 구조** (Next.js App Router Route Groups + 디렉토리 구조)
- [x] **데이터 모델 (ERD)** 초안 -- 20+ 테이블, 상태 머신, 관계도
- [x] **API 엔드포인트 목록** 초안 -- 10개 카테고리, 50+ 엔드포인트
- [x] **사용자 플로우** (시나리오 1~5 화면 매핑)
- [x] **실시간 통신 아키텍처** (SSE + Supabase Realtime 채널 설계)
- [x] 결과물: `docs/planning/information-architecture.md`

## Plan 2 산출물

| 산출물 | 경로 | 상태 |
|--------|------|------|
| IA 설계 패턴 조사 리포트 | `docs/planning/research/information-architecture-patterns.md` | 완료 |
| **정보 아키텍처 정의서** | `docs/planning/information-architecture.md` | 완료 (승인) |

## 팀원 작업 상태

| 팀원 | 작업 | 상태 | 완료일 |
|------|------|------|--------|
| 웹 검색 전문가 | 경쟁사 분석 + UX 패턴 조사 (v1) | 완료 | 2026-03-12 |
| 서비스 플랜 전문가 | 시나리오 개선 제안 (v1) | 완료 | 2026-03-12 |
| 웹 검색 전문가 | 에이전트 오케스트레이션 심층 조사 (v2) | 완료 | 2026-03-14 |
| 서비스 플랜 전문가 | 시나리오 v2 핵심 개선 제안 (v2) | 완료 | 2026-03-14 |
| 팀장 | v2 통합 + user-scenarios.md 업데이트 | 완료 | 2026-03-14 |
| 웹 검색 전문가 | 배포/인프라 전략 조사 v1 (SaaS/클라우드/하이브리드) | 완료 | 2026-03-14 |
| 서비스 플랜 전문가 | 배포/인프라 전략 제안서 v1 (비용 시뮬레이션, 아키텍처) | 완료 | 2026-03-14 |
| 팀장 | 배포/인프라 조사 통합 + Slack 보고 | 완료 | 2026-03-14 |
| 웹 검색 전문가 | Vercel + Supabase 상세 조사 (API, 가격, 연동) | 완료 | 2026-03-14 |
| 서비스 플랜 전문가 | Vercel + Supabase 아키텍처 정의 (멀티테넌트, 비용, 로드맵) | 완료 | 2026-03-14 |
| 팀장 | Vercel + Supabase 전략 통합 + Slack/Email 보고 | 완료 | 2026-03-14 |
| 웹 검색 전문가 | Claude Code 자동화 개발 조사 (Agent Teams, Worktree, CI/CD) | 완료 | 2026-03-14 |
| 서비스 플랜 전문가 | Claude Code 자동화 개발 팀 구성 + 파이프라인 방안 정의 | 완료 | 2026-03-14 |
| 팀장 | 자동화 개발 방안 통합 + Slack 보고 | 완료 | 2026-03-14 |
| 웹 검색 전문가 | AI 에이전트 팀 구성 사례/역할 패턴/성공실패 사례 조사 | 완료 | 2026-03-14 |
| 서비스 플랜 전문가 | 팀 구성 개선안 + 역할 배치 아이디어 제안 | 완료 | 2026-03-14 |
| 팀장 | 팀 구성 개선안 통합 + Slack 보고 | 완료 | 2026-03-14 |
| 팀장 | 3건 일괄 승인 처리 + Plan 2 시작 | 완료 | 2026-03-14 |
| 웹 검색 전문가 | 정보 아키텍처 설계 패턴/트렌드 조사 (SaaS IA, 네비게이션, URL 구조) | 완료 | 2026-03-14 |
| 팀장 | 정보 아키텍처 초안 작성 + 통합 (사이트맵, ERD, API, URL, 화면 목록) | 완료 | 2026-03-14 |
| 서비스 플랜 전문가 | Plan 5: PRD 작성 (MoSCoW 기능 분류, NFR, KPI, 리스크) | 완료 | 2026-03-14 |
| 서비스 플랜 전문가 | Plan 5: ROADMAP 작성 (5 Phase + V2, 12주 타임라인, 체크리스트) | 완료 | 2026-03-14 |

## Claude Code 자동화 개발 방안 산출물

| 산출물 | 경로 | 상태 |
|--------|------|------|
| Claude Code 자동화 개발 조사 리포트 | `docs/planning/research/claude-code-automation.md` | 완료 |
| Claude Code 자동화 개발 팀 구성/파이프라인 방안 | `docs/planning/proposals/claude-code-dev-automation.md` | 완료 (승인) |
| AI 에이전트 팀 구성 및 역할 배치 개선안 | `docs/planning/proposals/team-composition-ideas.md` | 완료 (승인) |

## Plan 5 체크리스트

- [x] **PRD 작성** -- 제품 개요, MoSCoW 기능 분류, NFR, 기술 제약, KPIs
  - Must Have: 11개 (F-M01~M11)
  - Should Have: 6개 (F-S01~S06)
  - Could Have: 5개 (F-C01~C05)
  - Won't Have: 6개 (범위 외 항목 정의)
- [x] **ROADMAP 작성** -- 5 Phase + V2, 12주 타임라인, 의존성 그래프
  - Phase 0: 인프라 세팅 (1주)
  - Phase 1: MVP Core (4주)
  - Phase 2: Multi-Agent (3주)
  - Phase 3: Deploy & Polish (2주)
  - Phase 4: Monetization (2주)
  - V2: 9개 성장 기능
- [x] 결과물: `docs/planning/prd.md`, `docs/planning/roadmap.md`

## Plan 5 산출물

| 산출물 | 경로 | 상태 |
|--------|------|------|
| **제품 요구사항 문서 (PRD)** | `docs/planning/prd.md` | 완료 |
| **구현 로드맵 (ROADMAP)** | `docs/planning/roadmap.md` | 완료 |

## Plan 3 산출물

| 산출물 | 경로 | 상태 |
|--------|------|------|
| 시스템 아키텍처 조사 리포트 | `docs/planning/research/system-architecture-research.md` | 완료 |
| **시스템 아키텍처 설계서** | `docs/planning/system-architecture.md` | 완료 |

## Plan 4 산출물

| 산출물 | 경로 | 상태 |
|--------|------|------|
| UI/UX 디자인 조사 리포트 | `docs/planning/research/ui-ux-design-research.md` | 완료 |
| **UI/UX 디자인 가이드** | `docs/planning/ui-ux-design-guide.md` | 완료 |

## 인프라 상태

- [x] Gmail MCP -- 사용 가능
- [x] Slack MCP -- 사용 가능
