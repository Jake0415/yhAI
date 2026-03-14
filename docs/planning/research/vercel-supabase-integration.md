# Vercel + Supabase 통합 조사 리포트

> 조사일: 2026-03-14
> 조사 목적: YHAI 서비스의 Vercel 배포 + Supabase DB 연동 전략 수립을 위한 상세 기술 조사
> 이전 조사: `docs/planning/research/deployment-infrastructure-analysis.md` (GCP Cloud Run + Neon 기반)

---

## 1. Vercel 배포 자동화

### 1.1 REST API를 통한 프로젝트 생성

**엔드포인트**: `POST https://api.vercel.com/v11/projects`

**인증**: `Authorization: Bearer <ACCESS_TOKEN>`

**요청 본문 (주요 필드)**:
```json
{
  "name": "yhai-user-app-{userId}-{appId}",
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "installCommand": "npm install",
  "outputDirectory": ".next",
  "environmentVariables": [
    {
      "key": "NEXT_PUBLIC_SUPABASE_URL",
      "value": "https://xxx.supabase.co",
      "target": ["production", "preview"]
    },
    {
      "key": "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "value": "eyJ...",
      "target": ["production", "preview"]
    }
  ]
}
```

### 1.2 REST API를 통한 배포 (Git 없이)

**엔드포인트**: `POST https://api.vercel.com/v13/deployments`

**인증**: `Authorization: Bearer <ACCESS_TOKEN>`

**배포 방식 3가지**:

#### 방식 1: 인라인 파일 업로드 (Git 없이 직접 배포)
```json
{
  "name": "my-app",
  "files": [
    {
      "file": "package.json",
      "data": "{\"name\": \"my-app\", ...}",
      "encoding": "utf-8"
    },
    {
      "file": "src/app/page.tsx",
      "data": "export default function Home() { ... }",
      "encoding": "utf-8"
    }
  ],
  "projectSettings": {
    "framework": "nextjs",
    "nodeVersion": "22.x"
  },
  "target": "production"
}
```

- Claude Code가 생성한 파일을 직접 API로 전송 가능
- GitHub 연동 불필요
- 파일 크기 제한: Hobby 100MB, Pro 1GB
- 최대 파일 수: 15,000개

#### 방식 2: Pre-built 배포 (로컬 빌드 후 배포)
```bash
# 1. 로컬 빌드
npm run build

# 2. Vercel 출력 형식으로 변환
vercel build --prod

# 3. Pre-built 결과 배포
vercel deploy --prebuilt --prod
```

- 빌드를 YHAI 서버에서 수행하고 결과만 Vercel에 배포
- Vercel 빌드 시간/자원 절약
- YHAI 측에서 빌드 품질 제어 가능

#### 방식 3: GitHub 연동 배포
```json
{
  "name": "my-app",
  "gitSource": {
    "type": "github",
    "ref": "main",
    "repoId": 123456
  }
}
```

- GitHub Push 시 자동 배포
- Preview 배포 (PR별)
- 가장 안정적이나 GitHub 계정 관리 필요

### 1.3 Vercel 가격 정책 상세 (2026년 기준)

| 항목 | Hobby (무료) | Pro ($20/seat/월) | Enterprise (커스텀) |
|------|-------------|-------------------|-------------------|
| **프로젝트 수** | 200 | 무제한 | 무제한 |
| **일일 배포** | 100 | 6,000 | 24,000 |
| **시간당 배포** | 100 | 450 | 1,800 |
| **동시 빌드** | 1 | 12 | 커스텀 |
| **Fast Data Transfer** | 100 GB | 1 TB (초과: $0.15/GB) | 커스텀 |
| **함수 호출** | 100만/월 | 100만 포함 (초과: $0.60/100만) | 커스텀 |
| **빌드 시간** | 최대 45분/배포 | 최대 45분/배포 | 45분 |
| **파일 업로드 크기** | 100 MB | 1 GB | N/A |
| **도메인/프로젝트** | 50 | 무제한 (소프트 10만) | 무제한 (소프트 100만) |
| **환경변수** | 1,000/환경 | 1,000/환경 | 1,000/환경 |
| **Edge Requests** | - | 1,000만 포함 | 커스텀 |
| **런타임 로그** | 1시간 | 1일 | 3일 |
| **디스크 크기** | 23 GB | 최대 64 GB | 최대 64 GB |
| **상업적 사용** | 불가 | 가능 | 가능 |

**중요 제한사항**:
- Hobby 플랜은 **비상업 전용** -- YHAI 사용자 앱에 사용 불가
- Pro 플랜 기본 $20/seat/월 + 사용량 기반 초과 과금
- 기본 온디맨드 예산: $200 (커스터마이징 가능)
- WebSocket **미지원** (Vercel Functions) -- 실시간 기능은 별도 서비스 필요
- Enterprise: 최소 $1,500-3,000/월, SSO, 전용 인프라, SLA 포함

### 1.4 Vercel API Rate Limits

| 작업 | Hobby | Pro | Enterprise |
|------|-------|-----|-----------|
| 배포/일 | 100 | 6,000 | 24,000 |
| 배포/시간 | 100 | 450 | 1,800 |
| 배포/5분 | 60 | 120 | 300 |
| 업로드/일 | 5,000 | 40,000 | 80,000 |
| 프로젝트 환경변수 생성/분 | 120 | 120 | 120 |
| 프로젝트 도메인 생성/분 | 100 | 100 | 100 |

---

## 2. Supabase DB 자동 프로비저닝

### 2.1 Management API를 통한 프로젝트 생성

**엔드포인트**: `POST https://api.supabase.com/v1/projects`

**인증**: `Authorization: Bearer <ACCESS_TOKEN>`

**요청 본문**:
```json
{
  "name": "yhai-user-{userId}-{appId}",
  "organization_id": "org_xxx",
  "plan": "free",
  "region": "ap-northeast-1",
  "db_pass": "auto-generated-secure-password",
  "kps_enabled": false
}
```

**응답 (주요 필드)**:
```json
{
  "id": "project-id",
  "name": "yhai-user-xxx",
  "organization_id": "org_xxx",
  "region": "ap-northeast-1",
  "status": "ACTIVE_HEALTHY",
  "database": {
    "host": "db.xxx.supabase.co",
    "version": "15.6.1.159"
  },
  "endpoint": "https://xxx.supabase.co",
  "anon_key": "eyJ...",
  "service_role_key": "eyJ..."
}
```

**프로비저닝 시 자동 생성되는 것들**:
- PostgreSQL 데이터베이스 (v15+)
- RESTful API (PostgREST)
- 인증 서비스 (GoTrue)
- 스토리지 버킷
- 실시간 서버
- Edge Functions 런타임

### 2.2 DB 스키마 자동 적용

**방법 1: SQL API를 통한 직접 실행**
```bash
curl -X POST 'https://xxx.supabase.co/rest/v1/rpc/exec_sql' \
  -H 'Authorization: Bearer SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"query": "CREATE TABLE users (id uuid PRIMARY KEY, ...)"}'
```

**방법 2: Supabase CLI 마이그레이션**
```bash
# 마이그레이션 파일 생성
supabase migration new create_users_table

# 원격 DB에 마이그레이션 적용
supabase db push --db-url postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
```

**방법 3: Prisma ORM 연동**
```bash
# Prisma 스키마 기반 마이그레이션
DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres" \
npx prisma migrate deploy
```

### 2.3 Row Level Security (RLS) 자동화

**자동 RLS 활성화 이벤트 트리거**:
```sql
-- 새 테이블 생성 시 자동으로 RLS 활성화
CREATE OR REPLACE FUNCTION auto_enable_rls()
RETURNS event_trigger AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands()
  WHERE command_tag = 'CREATE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', obj.object_identity);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE EVENT TRIGGER auto_enable_rls_trigger
ON ddl_command_end
WHEN TAG IN ('CREATE TABLE')
EXECUTE FUNCTION auto_enable_rls();
```

**사용자별 RLS 정책 템플릿**:
```sql
-- 인증된 사용자만 자신의 데이터 접근
CREATE POLICY "Users can view own data"
ON public.user_data
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data"
ON public.user_data
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
ON public.user_data
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

**Dashboard에서 생성한 테이블**: RLS 자동 활성화 (기본값)
**SQL/마이그레이션으로 생성한 테이블**: RLS 수동 활성화 필요

### 2.4 Supabase 가격 정책 상세 (2026년 기준)

| 항목 | Free ($0) | Pro ($25/월/프로젝트) | Team ($599/월) | Enterprise (커스텀) |
|------|-----------|---------------------|---------------|-------------------|
| **프로젝트 수** | 2개 | 무제한 | 무제한 | 무제한 |
| **DB 크기** | 500 MB | 8 GB 포함 (초과: $0.125/GB) | 8 GB 포함 | 커스텀 |
| **최대 디스크** | 500 MB | 60 TB | 60 TB | 커스텀 |
| **DB Egress** | 2 GB | 250 GB 포함 | 250 GB 포함 | 커스텀 |
| **MAU (인증)** | 50,000 | 100,000 포함 | 100,000 포함 | 커스텀 |
| **파일 스토리지** | 1 GB | 100 GB 포함 | 100 GB 포함 | 커스텀 |
| **스토리지 Egress** | 2 GB | 200 GB 포함 | 200 GB 포함 | 커스텀 |
| **Edge Functions** | 50만 호출/월 | 200만 호출 포함 | 200만 호출 포함 | 커스텀 |
| **Realtime 동시 연결** | 200 | 500 포함 | 500 포함 | 커스텀 |
| **Realtime 메시지/월** | 200만 | 500만 포함 | 500만 포함 | 커스텀 |
| **비활성 프로젝트** | 1주 미사용 시 일시정지 | 일시정지 없음 | 일시정지 없음 | 일시정지 없음 |
| **백업** | 없음 | 7일 | 14일 | 커스텀 |
| **SOC 2** | 미지원 | 미지원 | 지원 | 지원 |
| **SSO/SAML** | 미지원 | 미지원 | 지원 | 지원 |

**중요 제한사항**:
- Free 플랜: **2개 프로젝트**로 제한, 1주 미사용 시 자동 일시정지
- Pro 플랜: 프로젝트당 $25/월 -- 사용자 수에 비례하여 비용 증가
- **Scale-to-Zero 미지원** -- Neon과 달리 항상 실행 상태
- 서울 리전 없음: 가장 가까운 리전은 `ap-northeast-1` (도쿄) 또는 `ap-southeast-1` (싱가포르)

---

## 3. Vercel + Supabase 연동

### 3.1 공식 연동 (Vercel Marketplace)

Vercel Marketplace에서 Supabase 통합을 설치하면:
1. Supabase 프로젝트의 환경변수가 Vercel 프로젝트에 **자동 설정**
2. 주요 환경변수:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (또는 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Preview, Production 환경 모두에 자동 적용

### 3.2 Supabase Auth + Vercel 미들웨어 연동

**Next.js App Router + Supabase Auth 설정**:

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

**Vercel Preview + Supabase Auth 이슈**:
- Preview 배포마다 URL이 다르므로 Supabase Auth redirect URL 설정 필요
- 해결: Supabase wildcard URL 지원 -- `*.vercel.app` 패턴 사용 가능

### 3.3 환경변수 자동 설정 파이프라인

```
YHAI 백엔드
    ↓
1. Supabase Management API → 프로젝트 생성
    ↓ (supabase_url, anon_key, service_role_key 획득)
2. Vercel REST API → 프로젝트 생성 + 환경변수 설정
    ↓
3. Claude Code → 코드 생성 (Supabase 클라이언트 설정 포함)
    ↓
4. Vercel REST API → 코드 배포
    ↓
5. Supabase SQL API → DB 스키마 + RLS 적용
    ↓
사용자 앱 라이브!
```

---

## 4. YHAI 자동 배포 CI/CD 파이프라인

### 4.1 전체 흐름

```
사용자 요청 (자연어)
    ↓
PM Agent → 요구사항 분석 → 기술 스택 결정
    ↓
코드 생성 Agent → Next.js + Supabase 코드 생성
    ↓
┌─────────────────────────────────────────────┐
│  YHAI 배포 파이프라인                         │
│                                             │
│  Phase 1: 인프라 프로비저닝                   │
│  ├─ Supabase 프로젝트 생성 (Management API)  │
│  ├─ DB 스키마 적용 (SQL API)                 │
│  ├─ RLS 정책 적용                            │
│  └─ Vercel 프로젝트 생성 + 환경변수 설정       │
│                                             │
│  Phase 2: 코드 배포                          │
│  ├─ 코드 품질 검증 (lint, type-check)        │
│  ├─ 빌드 테스트 (next build)                 │
│  ├─ Vercel API로 파일 업로드 + 배포           │
│  └─ 배포 상태 모니터링                        │
│                                             │
│  Phase 3: 검증                               │
│  ├─ 헬스체크 (HTTP probe)                    │
│  ├─ DB 연결 확인                             │
│  ├─ 프리뷰 URL 생성                          │
│  └─ 사용자에게 알림                           │
└─────────────────────────────────────────────┘
    ↓
사용자에게 프리뷰 URL 전달
(WebSocket/SSE로 실시간 진행상황 스트리밍)
```

### 4.2 예상 소요 시간

| 단계 | 도구 | 소요 시간 | 실패 시 |
|------|------|----------|--------|
| Supabase 프로젝트 생성 | Management API | 30초-2분 | 자동 재시도 |
| DB 스키마 적용 | SQL API / Prisma | 10-30초 | 에러 → Agent 수정 |
| Vercel 프로젝트 생성 | REST API | 5-10초 | 자동 재시도 |
| 환경변수 설정 | REST API | 5초 | 자동 재시도 |
| 코드 배포 (파일 업로드) | REST API v13 | 30초-2분 | 자동 재시도 |
| Vercel 빌드 | Vercel 인프라 | 1-3분 | 에러 → Agent 수정 |
| 헬스체크 | HTTP probe | 10-30초 | 롤백 |
| **총 소요** | | **2-8분** | |

### 4.3 에러 자동 복구 루프

```
빌드 실패
    ↓
Vercel 빌드 로그 API로 에러 추출
    ↓
Claude Code Agent에 에러 로그 전달
    ↓
코드 수정 생성
    ↓
재배포 (최대 3회)
    ↓
3회 실패 시 → 사용자에게 알림 + 수동 개입 요청
```

---

## 5. 경쟁사 Vercel + Supabase 사용 사례

### 5.1 Lovable (핵심 참고 사례)

- **배포**: 자체 호스팅 + Vercel/Netlify 연동 옵션
- **DB**: **Supabase 자동 프로비저닝** 사용
  - 테이블 생성 자동화
  - RLS 정책 자동 설정
  - Auth 설정 자동화
- **연동 방식**: 사용자의 Supabase 계정 연결 → 프로젝트 자동 생성
- **한계**: React + Supabase 고정, 프레임워크 선택지 없음

### 5.2 YHAI vs Lovable 차별점

| 항목 | Lovable | YHAI (계획) |
|------|---------|-----------|
| 배포 | 자체 + 외부 옵션 | Vercel 직접 통합 |
| DB | Supabase (사용자 계정) | Supabase (YHAI 관리 or 사용자 계정) |
| 스택 유연성 | React 고정 | Next.js + 다양한 스택 |
| 멀티에이전트 | 단일 AI | PM + 전문가 팀 |
| 비용 | 사용자 Supabase 비용 별도 | YHAI 플랜에 포함 옵션 |

---

## 6. 조사 결론

### 핵심 발견사항

1. **Vercel REST API가 YHAI 자동 배포에 적합**: 파일 인라인 업로드로 Git 없이 직접 배포 가능
2. **Supabase Management API로 프로젝트 자동 생성 가능**: DB + Auth + Storage 올인원 프로비저닝
3. **Vercel + Supabase 공식 연동 지원**: 환경변수 자동 설정, Auth 미들웨어 템플릿 제공
4. **비용 구조 주의점**: Supabase Pro는 프로젝트당 $25/월 (Scale-to-Zero 미지원)
5. **멀티테넌트 전략**: 공유 프로젝트 + RLS가 비용 효율적 (프로젝트별 분리는 비용 폭발)

### 이전 전략(Cloud Run + Neon) 대비 장단점

| 항목 | Cloud Run + Neon | Vercel + Supabase |
|------|-----------------|-------------------|
| 배포 편의성 | Docker 빌드 필요 | 파일 업로드만으로 배포 |
| Scale-to-Zero | 지원 (두 서비스 모두) | 미지원 (Supabase 항상 ON) |
| 올인원 제공 | 배포/DB 분리 관리 | DB + Auth + Storage + Realtime 통합 |
| 비용 (100 사용자) | ~$215/월 | ~$170-350/월 (전략에 따라) |
| 비용 (1,000 사용자) | ~$1,470/월 | ~$500-2,500/월 (전략에 따라) |
| Next.js 최적화 | 일반적 | Vercel이 Next.js 개발사 -- 최고 최적화 |
| 실시간 기능 | 별도 구축 필요 | Supabase Realtime 내장 |
| 인증 | 별도 구축 필요 | Supabase Auth 내장 |
| 벤더 종속 | 중간 (Docker 표준) | 높음 (Vercel + Supabase 생태계) |
| 서울 리전 | GCP 서울 지원 | Vercel Edge (글로벌) + Supabase 도쿄 |

---

## Sources

### Vercel
- [Vercel Pricing](https://vercel.com/pricing)
- [Vercel Limits](https://vercel.com/docs/limits)
- [Vercel REST API - Create Deployment](https://vercel.com/docs/rest-api/reference/endpoints/deployments/create-a-new-deployment)
- [Vercel CLI Deploy](https://vercel.com/docs/cli/deploying-from-cli)
- [Vercel Managing Projects](https://vercel.com/docs/projects/managing-projects)
- [Deploying to Vercel](https://vercel.com/docs/deployments)
- [Pre-Built Deploys to Vercel](https://www.buildwithmatija.com/blog/prebuilt-deploy-to-vercel-nextjs)
- [Vercel App Guide 2026](https://kuberns.com/blogs/post/vercel-app-guide/)
- [Vercel Pricing Explained: Hidden Costs 2026](https://servercompass.app/blog/vercel-pricing-explained-hidden-costs)

### Supabase
- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase Management API](https://supabase.com/features/management-api)
- [Supabase API - Create Project](https://supabase.com/docs/reference/api/v1-create-a-project)
- [Supabase RLS Complete Guide 2026](https://designrevision.com/blog/supabase-row-level-security)
- [Supabase Pricing Breakdown 2026](https://uibakery.io/blog/supabase-pricing)
- [Supabase True Cost Guide 2026](https://www.metacto.com/blogs/the-true-cost-of-supabase-a-comprehensive-guide-to-pricing-integration-and-maintenance)
- [Supabase Production Checklist](https://supabase.com/docs/guides/deployment/going-into-prod)

### Vercel + Supabase 연동
- [Supabase for Vercel (Marketplace)](https://vercel.com/marketplace/supabase)
- [Supabase & Next.js Auth Starter](https://vercel.com/templates/next.js/supabase)
- [Vercel Works With Supabase](https://supabase.com/partners/integrations/vercel)
- [Vercel Academy - Supabase Setup](https://vercel.com/academy/subscription-store/supabase-project-setup)

### 멀티테넌트
- [Multi-Tenant with RLS on Supabase](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/)
- [Supabase Multi-Tenancy Guide 2026](https://medium.com/@itsuki.enjoy/supabase-support-multi-tenancy-with-detail-template-project-34f3a3d97ee4)
- [Efficient Multi-Tenancy with Supabase](https://arda.beyazoglu.com/supabase-multi-tenancy)
- [Supabase Multi-Tenancy Discussion](https://github.com/orgs/supabase/discussions/1615)
