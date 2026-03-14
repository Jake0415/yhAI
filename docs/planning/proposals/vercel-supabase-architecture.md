# YHAI Vercel + Supabase 배포 아키텍처 정의서

> 작성일: 2026-03-14
> 근거 자료: `docs/planning/research/vercel-supabase-integration.md`
> 이전 제안: `docs/planning/proposals/deployment-strategy.md` (GCP Cloud Run + Neon)
> 목적: 사용자 결정에 따라 Vercel + Supabase 기반 YHAI 배포/DB 아키텍처 상세 정의

---

## 1. 아키텍처 총괄

### 1.1 전체 시스템 구조

```
┌──────────────────────────────────────────────────────────────┐
│                    YHAI 플랫폼 (관리 영역)                     │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │ YHAI 프론트  │  │ YHAI 백엔드   │  │ AI 에이전트 시스템    │ │
│  │ (Vercel)    │  │ (Vercel/별도) │  │ (PM + 전문가 팀)    │ │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬──────────┘ │
│         │                │                      │            │
│  ┌──────┴────────────────┴──────────────────────┴──────┐    │
│  │              YHAI 메인 Supabase 프로젝트              │    │
│  │  ├─ 사용자 계정 DB (users, teams, subscriptions)     │    │
│  │  ├─ 프로젝트 메타 DB (projects, deployments, logs)   │    │
│  │  ├─ Supabase Auth (YHAI 플랫폼 인증)                │    │
│  │  ├─ Supabase Storage (템플릿, 에셋)                  │    │
│  │  └─ Realtime (빌드 진행상황 스트리밍)                  │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              배포 오케스트레이터                        │    │
│  │  ├─ Supabase Management API 클라이언트               │    │
│  │  ├─ Vercel REST API 클라이언트                       │    │
│  │  ├─ 배포 큐 (BullMQ / Supabase Queue)               │    │
│  │  └─ 상태 모니터링                                    │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ↓               ↓               ↓
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ 사용자 A의 앱    │ │ 사용자 B의 앱    │ │ 사용자 C의 앱    │
│ ┌─────────────┐ │ │ ┌─────────────┐ │ │ ┌─────────────┐ │
│ │ Vercel 배포  │ │ │ │ Vercel 배포  │ │ │ │ Vercel 배포  │ │
│ │ (Next.js)   │ │ │ │ (Next.js)   │ │ │ │ (Next.js)   │ │
│ └──────┬──────┘ │ │ └──────┬──────┘ │ │ └──────┬──────┘ │
│        ↓        │ │        ↓        │ │        ↓        │
│ ┌─────────────┐ │ │ ┌─────────────┐ │ │ ┌─────────────┐ │
│ │ 공유 Supa DB │ │ │ │ 공유 Supa DB │ │ │ │ 전용 Supa DB │ │
│ │ (RLS 격리)  │ │ │ │ (RLS 격리)  │ │ │ │ (Pro 이상)  │ │
│ └─────────────┘ │ │ └─────────────┘ │ │ └─────────────┘ │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### 1.2 핵심 설계 원칙

1. **Vercel-Native 배포**: Next.js의 개발사인 Vercel에서 최적화된 배포
2. **Supabase 올인원**: DB + Auth + Storage + Realtime을 단일 서비스로 통합
3. **비용 효율적 멀티테넌트**: 공유 Supabase + RLS를 기본, 상위 티어에 전용 프로젝트
4. **자동화 우선**: API 기반 프로비저닝으로 사람 개입 최소화
5. **점진적 확장**: MVP는 최소 구성, 성장에 따라 인프라 확장

---

## 2. 사용자별 앱 배포 흐름

### 2.1 전체 배포 시퀀스

```
사용자: "쇼핑몰을 만들어줘"
    │
    ↓ (1) 요구사항 분석 [PM Agent]
    │
    ├─ 기능 목록 도출
    ├─ DB 스키마 설계
    ├─ 기술 스택 결정 (Next.js 15 + Supabase)
    └─ 작업 분해 (Phase별)
    │
    ↓ (2) 인프라 프로비저닝 [배포 오케스트레이터]
    │
    ├─ 2a. 멀티테넌트 전략 결정
    │   ├─ Free/Starter → 공유 Supabase + RLS
    │   └─ Pro/Business → 전용 Supabase 프로젝트
    │
    ├─ 2b. Supabase 설정
    │   ├─ [공유] tenant_id 기반 스키마 + RLS 정책 생성
    │   └─ [전용] Management API로 프로젝트 생성
    │
    ├─ 2c. Vercel 프로젝트 생성
    │   ├─ REST API로 프로젝트 생성
    │   ├─ 환경변수 설정 (Supabase URL, Keys)
    │   └─ 커스텀 도메인 설정 (Pro 이상)
    │
    └─ 2d. 연결 정보 저장
        └─ YHAI 메인 DB에 프로젝트 메타 기록
    │
    ↓ (3) 코드 생성 [전문가 Agent 팀]
    │
    ├─ Next.js 프로젝트 스캐폴딩
    ├─ Supabase 클라이언트 설정
    ├─ 페이지/컴포넌트 생성
    ├─ API Routes / Server Actions
    └─ 타입 정의 (Supabase 타입 자동 생성)
    │
    ↓ (4) 빌드 + 배포 [배포 오케스트레이터]
    │
    ├─ 4a. 코드 품질 검증
    │   ├─ TypeScript 타입 체크
    │   ├─ ESLint 검사
    │   └─ 빌드 테스트 (next build)
    │
    ├─ 4b. Vercel 배포
    │   ├─ 방법 A: 파일 인라인 업로드 (Git 없이)
    │   └─ 방법 B: GitHub Repo 생성 → 연동 배포
    │
    ├─ 4c. DB 마이그레이션
    │   ├─ Supabase SQL API로 스키마 적용
    │   ├─ RLS 정책 적용
    │   ├─ 시드 데이터 삽입
    │   └─ 연결 테스트
    │
    └─ 4d. 검증
        ├─ 헬스체크 (HTTP 200 확인)
        ├─ DB 연결 테스트
        └─ Auth 흐름 테스트
    │
    ↓ (5) 완료 알림
    │
    ├─ 프리뷰 URL 전달: https://app-name.vercel.app
    ├─ Supabase 대시보드 링크
    ├─ 빌드 로그 요약
    └─ 실시간 진행상황 스트리밍 (Supabase Realtime)
```

### 2.2 배포 방식별 비교

| 항목 | 방식 A: 파일 직접 업로드 | 방식 B: GitHub 연동 |
|------|----------------------|-------------------|
| **Git 필요** | 불필요 | GitHub Repo 자동 생성 |
| **배포 속도** | 빠름 (2-5분) | 중간 (3-7분) |
| **코드 소유권** | YHAI 관리 | 사용자 GitHub에 소유 |
| **버전 관리** | YHAI 내부 관리 | Git 히스토리 |
| **코드 Export** | 다운로드 제공 | GitHub에서 직접 |
| **Preview 배포** | 수동 생성 | PR별 자동 생성 |
| **추천 대상** | Free/Starter (빠른 체험) | Pro/Business (코드 소유권) |

**YHAI 추천**: MVP에서는 방식 A(파일 직접 업로드)로 시작, Pro 이상에서 방식 B(GitHub 연동) 제공

---

## 3. 멀티테넌트 관리 방안

### 3.1 두 가지 전략 비교

#### 전략 1: 공유 Supabase + RLS (추천: Free/Starter)

```
┌─────────────────────────────────────────┐
│  공유 Supabase 프로젝트                   │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  public.products                │    │
│  │  ├─ id (uuid)                  │    │
│  │  ├─ tenant_id (uuid) ← RLS    │    │
│  │  ├─ name (text)               │    │
│  │  └─ price (numeric)           │    │
│  └─────────────────────────────────┘    │
│                                         │
│  RLS Policy:                            │
│  auth.uid()::text IN (                  │
│    SELECT user_id FROM tenant_members   │
│    WHERE tenant_id = products.tenant_id │
│  )                                      │
│                                         │
│  사용자 A: tenant_id = 'aaa' → A 데이터만 │
│  사용자 B: tenant_id = 'bbb' → B 데이터만 │
│  사용자 C: tenant_id = 'ccc' → C 데이터만 │
└─────────────────────────────────────────┘
```

**장점**:
- 비용 절감: 단일 Supabase Pro 프로젝트 ($25/월)로 수백 명 사용자 지원
- 관리 용이: 스키마 변경, 마이그레이션을 한 번에 적용
- 빠른 프로비저닝: 테이블 + RLS 정책만 추가 (프로젝트 생성 불필요)

**단점**:
- RLS 버그 시 데이터 유출 위험
- 사용자별 스키마 커스터마이징 제한
- 대규모 시 단일 DB 성능 병목 가능

**적용 대상**: Free, Starter 티어 (비용 민감, 표준 스키마 사용)

#### 전략 2: 전용 Supabase 프로젝트 (Pro/Business)

```
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ Supabase       │  │ Supabase       │  │ Supabase       │
│ Project A      │  │ Project B      │  │ Project C      │
│ ($25/월)       │  │ ($25/월)       │  │ ($25/월)       │
│                │  │                │  │                │
│ ├─ DB (8GB)   │  │ ├─ DB (8GB)   │  │ ├─ DB (8GB)   │
│ ├─ Auth       │  │ ├─ Auth       │  │ ├─ Auth       │
│ ├─ Storage    │  │ ├─ Storage    │  │ ├─ Storage    │
│ └─ Realtime   │  │ └─ Realtime   │  │ └─ Realtime   │
└───────────────┘  └───────────────┘  └───────────────┘
```

**장점**:
- 완전한 데이터 격리
- 사용자별 독립 스키마, Auth 설정
- 독립적 백업/복원
- 성능 격리 (noisy neighbor 없음)

**단점**:
- 비용 증가: 사용자당 $25/월 (Supabase Pro)
- 관리 복잡: 프로젝트별 마이그레이션 필요
- Free 플랜 제한: 2개 프로젝트만 가능

**적용 대상**: Pro, Business 티어 (격리 필요, 커스텀 스키마)

### 3.2 하이브리드 멀티테넌트 전략 (최종 추천)

```
┌─────────────────────────────────────────────────┐
│                YHAI 멀티테넌트 전략               │
│                                                 │
│  Free/Starter 사용자 (다수)                      │
│  └─ 공유 Supabase Pro 프로젝트                   │
│     ├─ 리전별 1-3개 프로젝트 (도쿄, 싱가포르 등)   │
│     ├─ tenant_id 기반 RLS 격리                   │
│     ├─ 표준 스키마 템플릿 사용                     │
│     └─ 비용: $25-75/월 (수백 사용자)              │
│                                                 │
│  Pro 사용자 (소수)                               │
│  └─ 전용 Supabase Pro 프로젝트                   │
│     ├─ 독립 DB + Auth + Storage                  │
│     ├─ 커스텀 스키마 지원                         │
│     ├─ 커스텀 도메인                             │
│     └─ 비용: $25/월/사용자                       │
│                                                 │
│  Business/Enterprise 사용자 (극소수)              │
│  └─ 전용 Supabase Pro/Team 프로젝트              │
│     ├─ 완전 격리 + SOC 2 (Team)                  │
│     ├─ 전용 커스텀 도메인                         │
│     ├─ SSO/SAML 지원 (Team)                      │
│     └─ 비용: $25-599/월/사용자                    │
└─────────────────────────────────────────────────┘
```

---

## 4. 비용 구조

### 4.1 YHAI 플랫폼 자체 비용

| 구성 요소 | 서비스 | 월 비용 |
|----------|--------|--------|
| YHAI 프론트엔드 | Vercel Pro | $20 |
| YHAI 백엔드 API | Vercel Pro (추가 프로젝트) 또는 별도 서버 | $20-50 |
| YHAI 메인 DB | Supabase Pro | $25 |
| 큐/캐시 | Upstash Redis | $10-30 |
| AI API | Anthropic Claude | 사용량 기반 |
| **플랫폼 기본 비용** | | **$75-125/월** |

### 4.2 사용자 앱 비용 (규모별)

#### 100 사용자 (150개 앱)

| 항목 | 공유 RLS 전략 | 전용 프로젝트 전략 | 하이브리드 (추천) |
|------|-------------|------------------|----------------|
| **YHAI 플랫폼** | $95 | $95 | $95 |
| **사용자 앱 Vercel** | | | |
| Vercel Pro (1팀) | $20 | $20 | $20 |
| 추가 사용량 (대역폭) | ~$30 | ~$30 | ~$30 |
| **사용자 앱 DB** | | | |
| 공유 Supabase | $25 (1프로젝트) | - | $25 (Free/Starter) |
| 전용 Supabase | - | $25 x 100 = $2,500 | $25 x 5 (Pro만) = $125 |
| **총 월 비용** | **~$170** | **~$2,645** | **~$295** |
| **사용자당 비용** | **$1.70** | **$26.45** | **$2.95** |

#### 500 사용자 (750개 앱)

| 항목 | 공유 RLS | 전용 프로젝트 | 하이브리드 (추천) |
|------|---------|-------------|----------------|
| YHAI 플랫폼 | $125 | $125 | $125 |
| Vercel Pro | $20 | $20 | $20 |
| 추가 사용량 | ~$100 | ~$100 | ~$100 |
| 공유 Supabase | $50 (2프로젝트) | - | $50 |
| 전용 Supabase | - | $25 x 500 = $12,500 | $25 x 25 = $625 |
| **총 월 비용** | **~$295** | **~$12,745** | **~$920** |
| **사용자당 비용** | **$0.59** | **$25.49** | **$1.84** |

#### 1,000 사용자 (1,500개 앱)

| 항목 | 공유 RLS | 전용 프로젝트 | 하이브리드 (추천) |
|------|---------|-------------|----------------|
| YHAI 플랫폼 | $150 | $150 | $150 |
| Vercel Pro/Enterprise | $20-1,500 | $20-1,500 | $500 |
| 추가 사용량 | ~$200 | ~$200 | ~$200 |
| 공유 Supabase | $75 (3프로젝트) | - | $75 |
| 전용 Supabase | - | $25,000 | $25 x 50 = $1,250 |
| **총 월 비용** | **~$445** | **~$26,850** | **~$2,175** |
| **사용자당 비용** | **$0.45** | **$26.85** | **$2.18** |

### 4.3 이전 전략(Cloud Run + Neon) 대비 비용 비교

| 규모 | Cloud Run + Neon (하이브리드) | Vercel + Supabase (하이브리드) | 차이 |
|------|---------------------------|------------------------------|------|
| 100 사용자 | ~$215/월 | ~$295/월 | +37% |
| 500 사용자 | ~$750/월 | ~$920/월 | +23% |
| 1,000 사용자 | ~$1,470/월 | ~$2,175/월 | +48% |

**비용이 더 높은 이유**:
- Supabase Pro 프로젝트당 $25/월 (Neon은 Scale-to-Zero로 비활성 시 $0)
- Vercel Pro 기본 $20/seat/월 + 사용량 초과

**비용이 정당화되는 이유**:
- Auth, Storage, Realtime이 **포함** (별도 구축 비용 절감)
- 개발 속도 향상 (올인원 플랫폼)
- Next.js 최적 성능 (Vercel 네이티브)
- 운영 인력 절감 (관리형 서비스)

### 4.4 YHAI 요금제와 원가 매핑

| YHAI 티어 | 월 가격 | DB 전략 | Vercel | 원가/사용자 | 마진 |
|----------|--------|---------|--------|-----------|------|
| **Free** | $0 | 공유 RLS | 공유 프로젝트 | ~$0.50 | -$0.50 (획득 비용) |
| **Starter** | $19/월 | 공유 RLS | 공유 프로젝트 | ~$2.00 | ~89% |
| **Pro** | $49/월 | 전용 Supabase | 전용 Vercel 프로젝트 | ~$28.00 | ~43% |
| **Business** | $149/월 | 전용 Supabase Team | 전용 + 커스텀 도메인 | ~$50.00 | ~66% |
| **Enterprise** | 커스텀 | 전용 + SLA | Enterprise | 커스텀 | 협상 |

---

## 5. 제한사항과 대응 방안

### 5.1 Vercel 제한사항

| 제한사항 | 영향 | 대응 방안 |
|---------|------|----------|
| **WebSocket 미지원** | 실시간 빌드 진행상황 전송 불가 | SSE(Server-Sent Events) 사용 또는 Supabase Realtime 활용 |
| **Hobby 상업용 불가** | 무료 배포로 상업 앱 배포 불가 | 모든 사용자 앱은 Pro 이상에서 배포 |
| **서버리스 함수 타임아웃 (120초)** | 장시간 처리 불가 | 비동기 작업은 별도 서버 또는 Vercel Queue 사용 |
| **일일 배포 제한 (Pro: 6,000)** | 대규모 동시 배포 시 병목 | 배포 큐로 Rate Limit 관리, Enterprise 전환 |
| **빌드 시간 45분 제한** | 대규모 앱 빌드 시 초과 가능 | Pre-built 배포로 YHAI 서버에서 빌드 |
| **Cold Start** | 비활성 서버리스 함수 지연 | Vercel Fluid Compute / Edge Functions 활용 |

### 5.2 Supabase 제한사항

| 제한사항 | 영향 | 대응 방안 |
|---------|------|----------|
| **Free 2프로젝트 제한** | 전용 프로젝트 전략 시 비용 급증 | 공유 RLS 전략 기본, 상위 티어만 전용 |
| **Scale-to-Zero 미지원** | 비활성 프로젝트도 $25/월 | 공유 프로젝트 + RLS로 비용 분산 |
| **1주 미사용 시 일시정지 (Free)** | Free 사용자 앱 접속 불가 | Free 사용자는 공유 Pro 프로젝트 사용 |
| **서울 리전 없음** | 지연 시간 증가 (~30-50ms) | 도쿄 리전 사용 (ap-northeast-1), Vercel Edge로 정적 캐시 |
| **RLS 정책 복잡성** | 잘못된 정책 시 데이터 유출 | 표준 RLS 템플릿 + 자동 테스트 |
| **DB 크기 제한 (Free: 500MB)** | Free 사용자 데이터 제한 | 공유 Pro 프로젝트로 8GB 공유 |

### 5.3 연동 관련 제한사항

| 제한사항 | 영향 | 대응 방안 |
|---------|------|----------|
| **Preview 배포 Auth URL** | Preview 마다 다른 URL로 Auth 실패 | Supabase wildcard redirect URL 설정 (*.vercel.app) |
| **미들웨어 환경변수 이슈** | 일부 환경에서 변수 미로딩 | Edge Runtime 대신 Node.js Runtime 사용 |
| **벤더 종속** | Vercel + Supabase 이중 종속 | 표준 기술 (Next.js, PostgreSQL, Prisma) 사용으로 이식성 확보 |

---

## 6. 구현 로드맵

### Phase 1: MVP (0-3개월, ~100 사용자)

**목표**: 핵심 배포 파이프라인 구축, 제품-시장 적합성 검증

```
인프라 구성:
├─ YHAI 플랫폼: Vercel Pro (1팀) + Supabase Pro (1프로젝트)
├─ 사용자 앱: Vercel Pro (같은 팀) + 공유 Supabase (RLS)
├─ 캐시/큐: Upstash Redis
└─ 예상 비용: $150-300/월
```

**핵심 작업**:
- [ ] Vercel REST API 기반 자동 배포 파이프라인 구축
- [ ] Supabase 공유 프로젝트 + RLS 멀티테넌트 구현
- [ ] 표준 스키마 템플릿 (쇼핑몰, 블로그, SaaS) 개발
- [ ] 배포 상태 모니터링 + Supabase Realtime 연동
- [ ] Free/Starter 티어 구현

### Phase 2: 성장 (3-12개월, ~500 사용자)

**목표**: 상위 티어 구현, 비용 최적화, 안정성 강화

```
인프라 구성:
├─ YHAI 플랫폼: Vercel Pro + Supabase Pro (확장)
├─ Free/Starter 사용자: 공유 Supabase (리전별 2-3개)
├─ Pro 사용자: 전용 Supabase Pro 프로젝트
├─ 모니터링: Vercel Analytics + Supabase Dashboard
└─ 예상 비용: $500-1,500/월
```

**핵심 작업**:
- [ ] 전용 Supabase 프로젝트 자동 프로비저닝 (Pro 티어)
- [ ] GitHub 연동 배포 옵션 (코드 소유권)
- [ ] 커스텀 도메인 지원 (Vercel API)
- [ ] Pro/Business 티어 구현
- [ ] 비용 대시보드 구축

### Phase 3: 확장 (12개월+, ~1,000+ 사용자)

**목표**: Enterprise 대응, 글로벌 확장

```
인프라 구성:
├─ YHAI 플랫폼: Vercel Enterprise + Supabase Team
├─ 대규모 트래픽 앱: 별도 인프라 (GCP Cloud Run 등) 옵션
├─ 모니터링: 통합 대시보드 + 알림 시스템
└─ 예상 비용: $2,000-5,000/월
```

**핵심 작업**:
- [ ] Vercel Enterprise 전환 (SLA, SSO)
- [ ] Supabase Team 프로젝트 (SOC 2, SAML)
- [ ] 멀티리전 배포 옵션
- [ ] Enterprise 티어 + 커스텀 SLA
- [ ] 대안 인프라 옵션 (Cloud Run) 제공 (대규모 트래픽)

---

## 7. 핵심 기술 결정 요약

### 7.1 왜 Vercel인가?

| 근거 | 상세 |
|------|------|
| Next.js 최적화 | Vercel은 Next.js 개발사 -- App Router, Server Actions, ISR 등 최적 지원 |
| 배포 API | REST API로 Git 없이 직접 배포 가능 -- YHAI 자동화에 적합 |
| Edge Network | 글로벌 CDN으로 정적 자산 빠른 전달 |
| DX | 프리뷰 배포, 환경변수 관리, 로그 등 개발자 경험 우수 |
| 확장성 | Pro → Enterprise 자연스러운 전환 경로 |

### 7.2 왜 Supabase인가?

| 근거 | 상세 |
|------|------|
| 올인원 | DB + Auth + Storage + Realtime + Edge Functions 통합 |
| Lovable 검증 | 경쟁사 Lovable이 Supabase로 성공적 운영 중 |
| Management API | 프로그래밍으로 프로젝트 자동 생성/관리 |
| PostgreSQL | 표준 SQL, Prisma ORM 완전 호환, 이식성 확보 |
| RLS | Row Level Security로 멀티테넌트 데이터 격리 |
| 실시간 | Supabase Realtime으로 빌드 진행상황 스트리밍 가능 |

### 7.3 변경된 전략 (이전 대비)

| 항목 | 이전 (Cloud Run + Neon) | 현재 (Vercel + Supabase) |
|------|----------------------|--------------------------|
| 앱 호스팅 | GCP Cloud Run (Docker) | Vercel (Next.js 네이티브) |
| 앱 DB | Neon (Scale-to-Zero PG) | Supabase (올인원 PG) |
| 인증 | 별도 구축 필요 | Supabase Auth (내장) |
| 스토리지 | Cloudflare R2 | Supabase Storage (내장) |
| 실시간 | 별도 구축 (WebSocket) | Supabase Realtime (내장) |
| 비용 모델 | 사용량 기반 (Scale-to-Zero) | 프로젝트 기반 (고정+사용량) |
| 벤더 종속도 | 중간 | 높음 (Vercel + Supabase) |
| 개발 속도 | 중간 | 빠름 (올인원) |

---

## 8. 결론

### 최종 추천 스택

| 계층 | Phase 1 (MVP) | Phase 2 (성장) | Phase 3 (확장) |
|------|-------------|--------------|-------------|
| YHAI 프론트 | Vercel Pro | Vercel Pro | Vercel Enterprise |
| YHAI 백엔드 | Vercel Pro / 별도 서버 | Vercel Pro + 워커 | 별도 서버 (필요 시) |
| YHAI DB | Supabase Pro | Supabase Pro | Supabase Team |
| 사용자 앱 호스팅 | Vercel (공유 팀) | Vercel (공유 + 전용) | Vercel + Cloud Run 옵션 |
| 사용자 앱 DB | 공유 Supabase (RLS) | 공유 + 전용 Supabase | 전용 Supabase + 대안 옵션 |
| 캐시/큐 | Upstash Redis | Upstash Redis | Upstash / 자체 Redis |
| 모니터링 | Vercel Analytics | Vercel + Supabase Dashboard | 통합 대시보드 |

### 한 줄 요약

> **Vercel (Next.js 네이티브 배포) + Supabase (DB/Auth/Storage 올인원)을 기반으로, 공유 RLS 멀티테넌트에서 시작하여 상위 티어에 전용 프로젝트를 제공하는 비용 효율적 배포 전략**
