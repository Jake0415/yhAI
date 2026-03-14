# YHAI 배포/인프라 전략 — Vercel + Supabase (확정)

> 작성일: 2026-03-14 (v2 업데이트)
> 이전 버전: GCP Cloud Run + Neon 3단계 하이브리드 전략
> 변경 사유: 사용자 결정 -- Vercel + Supabase 조합 선택
> 상세 조사: `docs/planning/research/vercel-supabase-integration.md`
> 상세 아키텍처: `docs/planning/proposals/vercel-supabase-architecture.md`

---

## 1. 전략 요약

### 한 줄 요약
> **Vercel (Next.js 네이티브 배포) + Supabase (DB/Auth/Storage/Realtime 올인원)을 기반으로, 공유 RLS 멀티테넌트에서 시작하여 상위 티어에 전용 프로젝트를 제공하는 배포 전략**

### 핵심 구성

| 계층 | 서비스 | 역할 |
|------|--------|------|
| **앱 호스팅** | Vercel | Next.js 네이티브 배포, Edge Network, 프리뷰 배포 |
| **데이터베이스** | Supabase (PostgreSQL) | 관계형 DB, Auto-generated REST API |
| **인증** | Supabase Auth | OAuth, Email/Password, Magic Link, SSO |
| **스토리지** | Supabase Storage | 파일 업로드, 이미지 변환 |
| **실시간** | Supabase Realtime | 빌드 진행상황 스트리밍, 데이터 동기화 |
| **Edge Functions** | Supabase Edge Functions | 서버리스 백엔드 로직 |
| **캐시/큐** | Upstash Redis | 배포 큐, 세션 캐시 |

### 이전 전략 대비 변경점

| 항목 | v1 (Cloud Run + Neon) | v2 (Vercel + Supabase) |
|------|----------------------|--------------------------|
| 앱 호스팅 | GCP Cloud Run (Docker) | **Vercel** (Next.js 네이티브) |
| 앱 DB | Neon (Scale-to-Zero PG) | **Supabase** (올인원 PG) |
| 인증 | 별도 구축 필요 | **Supabase Auth** (내장) |
| 스토리지 | Cloudflare R2 | **Supabase Storage** (내장) |
| 실시간 | 별도 WebSocket 서버 | **Supabase Realtime** (내장) |
| 비용 모델 | 사용량 기반 (Scale-to-Zero) | 프로젝트 기반 (고정+사용량) |

---

## 2. 시스템 아키텍처

```
┌────────────────────────────────────────────────────────┐
│  YHAI 플랫폼                                            │
│  ├─ 프론트엔드: Vercel Pro (Next.js 15)                 │
│  ├─ 백엔드: Vercel Pro / 별도 서버                       │
│  ├─ 메인 DB: Supabase Pro (사용자/프로젝트 관리)         │
│  ├─ 캐시/큐: Upstash Redis (BullMQ)                    │
│  └─ AI 에이전트: Claude API (Anthropic)                 │
├────────────────────────────────────────────────────────┤
│  배포 오케스트레이터                                      │
│  ├─ Supabase Management API → DB 프로비저닝              │
│  ├─ Vercel REST API → 앱 배포                           │
│  └─ 배포 큐 + 상태 모니터링                               │
├────────────────────────────────────────────────────────┤
│  사용자 앱 (멀티테넌트)                                   │
│  ├─ Free/Starter: Vercel (공유 팀) + 공유 Supabase (RLS)│
│  ├─ Pro: Vercel (공유 팀) + 전용 Supabase Pro            │
│  └─ Business+: Vercel + 전용 Supabase Team/Enterprise   │
└────────────────────────────────────────────────────────┘
```

---

## 3. 배포 파이프라인

```
사용자 요청 → PM Agent → 코드 생성 Agent
    ↓
┌──────────────────────────────────────────┐
│  자동 배포 파이프라인 (2-8분)              │
│                                          │
│  1. Supabase 설정 (~1분)                 │
│     ├─ 공유: 테이블 + RLS 정책 추가       │
│     └─ 전용: Management API 프로젝트 생성  │
│                                          │
│  2. Vercel 프로젝트 생성 (~10초)          │
│     └─ 환경변수 자동 설정                  │
│                                          │
│  3. 코드 배포 (~3분)                      │
│     ├─ 파일 인라인 업로드 (Git 불필요)     │
│     └─ Vercel 빌드 + 배포                 │
│                                          │
│  4. DB 마이그레이션 (~30초)               │
│     ├─ 스키마 적용                        │
│     ├─ RLS 정책 적용                      │
│     └─ 시드 데이터                        │
│                                          │
│  5. 검증 (~30초)                         │
│     ├─ 헬스체크                           │
│     └─ DB 연결 테스트                     │
└──────────────────────────────────────────┘
    ↓
프리뷰 URL: https://app-name.vercel.app
```

---

## 4. 비용 구조

### 플랫폼 기본 비용: ~$95-125/월

| 구성 요소 | 서비스 | 월 비용 |
|----------|--------|--------|
| YHAI 프론트 | Vercel Pro | $20 |
| YHAI 백엔드 | Vercel Pro | $20-50 |
| YHAI 메인 DB | Supabase Pro | $25 |
| 큐/캐시 | Upstash Redis | $10-30 |

### 규모별 사용자 앱 비용 (하이브리드 전략)

| 규모 | Vercel | Supabase | 기타 | 총 비용 | 사용자당 |
|------|--------|----------|------|--------|---------|
| 100명 | ~$50 | ~$150 | $95 | **~$295/월** | $2.95 |
| 500명 | ~$120 | ~$675 | $125 | **~$920/월** | $1.84 |
| 1,000명 | ~$700 | ~$1,325 | $150 | **~$2,175/월** | $2.18 |

### YHAI 요금제

| 티어 | 가격 | DB | 배포 | 원가 | 마진 |
|------|------|-----|------|------|------|
| Free | $0 | 공유 RLS | 공유 | ~$0.50 | 획득 비용 |
| Starter | $19/월 | 공유 RLS | 공유 | ~$2.00 | ~89% |
| Pro | $49/월 | 전용 Supabase | 전용 도메인 | ~$28 | ~43% |
| Business | $149/월 | 전용 Team | 전용+도메인 | ~$50 | ~66% |
| Enterprise | 커스텀 | 전용+SLA | Enterprise | 커스텀 | 협상 |

---

## 5. 핵심 기술 결정

### 왜 Vercel인가?
1. Next.js 개발사 -- App Router, Server Actions, ISR 최적 지원
2. REST API로 Git 없이 직접 배포 가능 (YHAI 자동화에 적합)
3. 글로벌 Edge Network으로 빠른 정적 자산 전달
4. Pro → Enterprise 자연스러운 확장 경로

### 왜 Supabase인가?
1. DB + Auth + Storage + Realtime 올인원 (별도 구축 불필요)
2. 경쟁사 Lovable이 Supabase로 검증된 성공 사례
3. Management API로 프로젝트 자동 생성/관리
4. PostgreSQL 표준 -- Prisma ORM 호환, 이식성 확보
5. RLS로 멀티테넌트 데이터 격리

### 왜 하이브리드 멀티테넌트인가?
1. 공유 RLS: 단일 Supabase Pro ($25/월)로 수백 사용자 지원 (비용 효율)
2. 전용 프로젝트: 상위 티어 격리 요구 충족 (보안/성능)
3. 단계적 전환: 사용자 성장에 따라 유연하게 대응

---

## 6. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| Supabase Scale-to-Zero 미지원 | 비활성 앱도 비용 발생 | 공유 RLS로 비용 분산 |
| Vercel WebSocket 미지원 | 실시간 기능 제한 | Supabase Realtime / SSE 활용 |
| RLS 정책 버그 | 데이터 유출 위험 | 표준 템플릿 + 자동 테스트 |
| 벤더 종속 | 이중 종속 (Vercel + Supabase) | 표준 기술 사용 (Next.js, PostgreSQL, Prisma) |
| 서울 리전 없음 (Supabase) | 지연 증가 (~30-50ms) | 도쿄 리전 + Vercel Edge 캐시 |
| 일일 배포 제한 (Pro: 6,000) | 대규모 동시 배포 병목 | 배포 큐 관리, Enterprise 전환 |

---

## 7. 실행 로드맵

### 즉시 (MVP 개발 중)
- [ ] Vercel Pro 계정 생성 + REST API 토큰 발급
- [ ] Supabase Pro 프로젝트 생성 + Management API 토큰 발급
- [ ] 배포 자동화 프로토타입 (단일 앱 배포 테스트)
- [ ] 공유 멀티테넌트 RLS 스키마 설계

### Phase 1 (MVP 출시)
- [ ] 자동 배포 파이프라인 완성
- [ ] 공유 RLS 멀티테넌트 구현
- [ ] 표준 스키마 템플릿 3종 (쇼핑몰, 블로그, SaaS)
- [ ] Free/Starter 티어 구현
- [ ] Supabase Realtime 빌드 진행상황 스트리밍

### Phase 2 (성장기)
- [ ] 전용 Supabase 프로젝트 자동 프로비저닝 (Pro 티어)
- [ ] GitHub 연동 배포 옵션
- [ ] 커스텀 도메인 지원
- [ ] Pro/Business 티어 구현
- [ ] 비용 대시보드

### Phase 3 (확장기)
- [ ] Vercel Enterprise 전환
- [ ] Supabase Team 프로젝트 (SOC 2)
- [ ] 멀티리전 배포 옵션
- [ ] Enterprise 티어 + SLA
- [ ] 대안 인프라 옵션 (대규모 트래픽 앱)

---

## 8. 산출물 목록

| 문서 | 경로 | 설명 |
|------|------|------|
| 조사 리포트 (v1) | `docs/planning/research/deployment-infrastructure-analysis.md` | 전체 배포/DB 플랫폼 비교 조사 |
| 조사 리포트 (v2) | `docs/planning/research/vercel-supabase-integration.md` | Vercel + Supabase 상세 기술 조사 |
| 아키텍처 정의서 | `docs/planning/proposals/vercel-supabase-architecture.md` | 상세 아키텍처, 비용, 멀티테넌트 전략 |
| 전략 제안서 (본 문서) | `docs/planning/proposals/deployment-strategy.md` | 통합 전략 요약 (현재 문서) |
| 의사결정 로그 | `docs/planning/decisions.md` | D-008 ~ D-010 기록 |
