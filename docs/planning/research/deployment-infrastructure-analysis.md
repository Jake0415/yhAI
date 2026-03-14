# 배포/인프라 전략 조사 리포트

> 조사일: 2026-03-14
> 조사 목적: YHAI 서비스의 사용자 앱 배포 및 DB 제공 전략 수립을 위한 기초 조사

---

## 1. 외부 솔루션 (SaaS) 분석

### 1.1 배포 플랫폼 비교

| 플랫폼 | 무료 티어 | 유료 시작가 | 대역폭 | 빌드 시간 | 서버리스 함수 | 특이사항 |
|--------|----------|------------|--------|----------|-------------|---------|
| **Vercel** | 100GB/월, 100만 함수 호출, 4시간 CPU | $20/user/월 (Pro) | 100GB (무료), 1TB (Pro) | 무제한 | 100만/월 (무료) | Next.js 최적화, Hobby는 비상업 전용 |
| **Netlify** | 100GB/월, 300분 빌드, 125K 함수 | $19/user/월 (Pro) | 100GB (무료), 1TB (Pro) | 300분 (무료), 25K분 (Pro) | 125K/월 | Edge Functions 지원 |
| **Cloudflare Pages** | 무제한 대역폭/요청 | $5/월 (Workers Paid) | 무제한 | 500회/월 | Workers 무료 10만 요청/일 | 가격 대비 성능 최고, 무제한 대역폭 |
| **Railway** | $5/월 포함 크레딧 | $5/월 (Hobby), $20/월 (Pro) | 사용량 기반 | 사용량 기반 | N/A (컨테이너) | 풀스택 지원, PostgreSQL 관리형 ~$92.5/월 |
| **Render** | 정적 사이트 무료, 750시간/월 | $7/월 (Individual) | 100GB (무료) | 500분/월 | N/A (컨테이너) | Heroku 대안, Docker 지원 |

#### 핵심 인사이트
- **프론트엔드 전용**: Cloudflare Pages가 가격 대비 성능 최고 (무제한 대역폭)
- **풀스택**: Railway/Render가 컨테이너 기반 백엔드 + DB 통합 제공
- **Next.js 특화**: Vercel이 최적이나, 상업용은 $20/user/월 필수
- **YHAI 관점**: 사용자별 앱 배포 시 Vercel/Netlify는 프로젝트 수 제한이 병목

### 1.2 데이터베이스 서비스 비교

| 서비스 | 무료 티어 | 유료 시작가 | DB 유형 | Scale-to-Zero | 특이사항 |
|--------|----------|------------|---------|-------------|---------|
| **Supabase** | 500MB DB, 1GB 스토리지, 프로젝트 2개 | $25/월 (Pro) | PostgreSQL | 미지원 (항상 ON) | Auth, Storage, Realtime, Edge Functions 통합 |
| **Neon** | 0.5GB/프로젝트 (5GB/10프로젝트), 100 CU-hours | $5/월 (사용량 기반) | Serverless PostgreSQL | 지원 (5분 유휴) | 브랜칭 지원, 스토리지 $0.35/GB-월 |
| **PlanetScale** | 없음 (2024.04 폐지) | $39/월 (Scaler Pro) | MySQL | 미지원 | Vitess 기반, 비용 부담 큼 |
| **Turso** | 5GB, 100 DB, 5억 row reads/월 | $4.99/월 (Developer) | libSQL (SQLite) | 지원 | Edge DB, 읽기 중심 워크로드 최적 |
| **Firebase** | Spark 무료 (1GB 스토리지, 50K reads/일) | $0.06/100K reads (Blaze) | NoSQL (Firestore) | N/A | Google 생태계, 실시간 DB |

#### 핵심 인사이트
- **Supabase**: Lovable이 채택한 표준. Auth+DB+Storage 올인원이 매력적이나, 무료 2프로젝트 제한
- **Neon**: Scale-to-zero로 비활성 DB 비용 절약 가능. YHAI 멀티테넌트에 유리
- **Turso**: 무료 100개 DB가 매력적. 경량 앱에 적합하나 PostgreSQL 아님
- **YHAI 관점**: 사용자별 독립 DB 필요 시 Neon(scale-to-zero)이나 Turso(100 DB 무료)가 비용 효율적

### 1.3 경쟁사 배포/DB 전략 분석

#### Lovable
- **배포**: 자체 호스팅 + 원클릭 배포, GitHub 연동으로 Vercel/Netlify 배포 가능
- **DB**: **Supabase** 자동 프로비저닝 (테이블 생성, RLS 정책, Auth 설정 자동화)
- **특징**: SOC 2 Type 2, ISO 27001 인증, 코드 완전 소유권 보장
- **한계**: React + Supabase 고정, 프레임워크 선택지 없음

#### Bolt.new (StackBlitz)
- **배포**: **WebContainer** (브라우저 내 Node.js 런타임) → Bolt Cloud (2025~)
  - `.bolt.host` 도메인 제공, Pro에서 커스텀 도메인
  - 빌트인 DB, 호스팅, 인증, 분석, 파일 스토리지
- **DB**: Bolt Cloud에 내장 DB 제공 (2025 V2부터)
- **특징**: WebContainer로 서버 비용 없이 브라우저에서 실행. 4년간 개발한 독자 기술
- **한계**: WebContainer 기반이라 Node.js 외 백엔드 제한적

#### Replit
- **배포**: **GCP 기반** 자체 클라우드 인프라
  - Autoscale (0에서 자동 확장), Static, Reserved VM, Scheduled 배포
  - 원클릭 배포 + 커스텀 도메인 + Stripe 결제 통합
- **DB**: 내장 DB + Replit Auth + 시크릿 관리 자동화 (2025.12~)
- **특징**: 개발환경과 배포가 하나의 플랫폼, PageSpeed 85-92점
- **한계**: 중소규모 앱 적합 (10만 요청/일 이하)

#### v0.dev (Vercel)
- **배포**: 프론트엔드 코드만 생성 → 수동으로 Vercel 배포
- **DB**: 없음 (사용자가 직접 설정)
- **특징**: UI 컴포넌트 생성 특화, 풀스택 아님
- **한계**: 배포/DB 자동화 없음

#### 경쟁사 전략 요약

| 경쟁사 | 배포 방식 | DB 전략 | 자체 인프라 | 비용 모델 |
|--------|----------|---------|-----------|----------|
| Lovable | 자체 + Vercel/Netlify | Supabase 자동 프로비저닝 | 부분 자체 | 구독형 |
| Bolt.new | WebContainer + Bolt Cloud | Bolt Cloud 내장 | 자체 (WebContainer) | 구독형 |
| Replit | GCP 기반 자체 | 내장 DB | 자체 (GCP 위) | 구독 + 사용량 |
| v0.dev | 없음 (Vercel 수동) | 없음 | 없음 | 구독형 |

---

## 2. 내부 인프라 (클라우드 자체 구축) 분석

### 2.1 클라우드 컨테이너 서비스 비교

| 서비스 | 컨트롤 플레인 비용 | 컴퓨팅 비용 (예시) | Scale-to-Zero | 멀티테넌트 | 복잡도 |
|--------|------------------|-------------------|-------------|----------|--------|
| **AWS ECS Fargate** | $0 | ~$138/월 (3태스크) | 미지원 | 네임스페이스 | 낮음 |
| **AWS EKS** | $74/월/클러스터 | ~$210/월 (3태스크+Fargate) | 미지원 | 네임스페이스+RBAC | 높음 |
| **GCP Cloud Run** | $0 | 요청 기반 과금 | 지원 | 서비스별 격리 | 낮음 |
| **Azure Container Apps** | $0 | 사용량 기반 | 지원 | 환경 기반 | 중간 |

#### 비용 상세

**AWS ECS Fargate (3 태스크 기준)**
- 월 ~$138 (0.25 vCPU, 0.5GB RAM x 3)
- Fargate Spot 사용 시 70% 할인 가능 → ~$41/월

**AWS EKS + EC2**
- 컨트롤 플레인: $74/월
- 워커 노드: t3.medium 3대 ~$100/월
- 50개 이상 태스크 시 ECS Fargate 대비 비용 효율적

**GCP Cloud Run**
- 무료 티어: 180K CPU-초, 360K GiB-초/월
- Scale-to-zero로 비활성 앱 비용 $0
- 요청 당 과금: CPU $0.00002400/vCPU-초, 메모리 $0.00000250/GiB-초
- YHAI에 유리: 사용자 앱 대부분 비활성 → 비용 최소화

**Azure Container Apps**
- Consumption 플랜: vCPU $0.000024/초, 메모리 $0.000003/GiB-초
- Scale-to-zero 지원
- AWS Fargate 대비 2배 이상 비쌀 수 있음

### 2.2 Kubernetes 멀티테넌트 아키텍처

#### 격리 수준별 접근

| 접근 | 격리 수준 | 비용 | 복잡도 | 적합 상황 |
|------|----------|------|--------|----------|
| **네임스페이스 격리** | 논리적 | 낮음 | 낮음 | 일반 SaaS, 비규제 산업 |
| **가상 컨트롤 플레인 (vCluster)** | 강화된 논리적 | 중간 | 중간 | 테넌트별 k8s API 필요 시 |
| **전용 노드 (Node Affinity)** | 물리적 | 높음 | 높음 | 규제 산업 (HIPAA/SOC2) |
| **전용 클러스터** | 완전 격리 | 매우 높음 | 높음 | 엔터프라이즈 고객 |

#### 핵심 기술 요소
- **네트워크 정책**: Cilium/Calico로 테넌트 간 네트워크 격리
- **Pod 샌드박싱**: gVisor/Kata Containers로 컨테이너 런타임 격리
- **리소스 쿼터**: CPU/메모리 제한으로 Noisy Neighbor 방지
- **RBAC**: 역할 기반 접근 제어로 테넌트별 권한 관리

### 2.3 Docker 컨테이너 사용자별 격리

#### 리소스 소비 기준
- 유휴 컨테이너: 200-300MB RAM
- 활성 컨테이너: 400-600MB RAM
- 오버커밋 비율: 1.5x 안전 범위

#### 비용 시뮬레이션 (사용자별 컨테이너)

| 사용자 수 | 활성 비율 | 필요 RAM | 서버 비용 (AWS) | 월 비용/사용자 |
|----------|----------|---------|---------------|-------------|
| 100명 | 10% | 10 x 500MB + 90 x 200MB = 23GB | t3.2xlarge 1대 ~$245/월 | ~$2.45 |
| 1,000명 | 10% | 100 x 500MB + 900 x 200MB = 230GB | c5.18xlarge 2대 ~$3,500/월 | ~$3.50 |
| 10,000명 | 10% | 1,000 x 500MB + 9,000 x 200MB = 2.3TB | 클러스터 필요 ~$20,000/월 | ~$2.00 |

### 2.4 관리형 DB (클라우드)

| 서비스 | 최소 비용 | 스토리지 | 다중 DB | 특이사항 |
|--------|----------|---------|--------|---------|
| **AWS RDS PostgreSQL** | ~$15/월 (db.t4g.micro) | $0.115/GB-월 | 인스턴스별 | 안정적, 운영 검증됨 |
| **AWS Aurora Serverless v2** | $0.12/ACU-시간 | $0.10/GB-월 | 클러스터 내 | Scale-to-zero(v2), 비용 예측 어려움 |
| **GCP Cloud SQL** | ~$10/월 (db-f1-micro) | $0.170/GB-월 | 인스턴스별 | 무료 마이크로 인스턴스 |
| **GCP AlloyDB** | $0.26/ACU-시간 | $0.0005/IO | 클러스터 내 | PostgreSQL 호환, 고성능 |

---

## 3. 하이브리드 접근 분석

### 3.1 SaaS에서 자체 인프라 전환 사례

#### 전환 시점 (Breakeven Point)
- **월 SaaS 비용 $5,000-6,000 이상**: 자체 인프라 전환 시 12개월 내 손익분기
- **Dropbox 사례**: 퍼블릭 클라우드 → 프라이빗 인프라 전환으로 매출 총이익 2배 증가, IPO 성공
- **일반 SaaS 기업**: 서버 50대 기준 SaaS $6,000-8,000/년 vs 자체 호스팅 $15,000-25,000/년
  - 500대 이상: SaaS $50,000-150,000/년 vs 자체 호스팅 $150,000-300,000/년 (1/3~1/2 수준)

#### YHAI 맥락 전환 시점 추정

| 사용자 수 | SaaS 예상 비용 (월) | 자체 인프라 비용 (월) | 추천 |
|----------|---------------------|---------------------|------|
| ~100 | $500-1,000 | $2,000-3,000 | SaaS |
| ~1,000 | $5,000-10,000 | $4,000-6,000 | 하이브리드/전환 검토 |
| ~5,000 | $25,000-50,000 | $10,000-15,000 | 자체 인프라 |
| ~10,000 | $50,000-100,000 | $15,000-25,000 | 자체 인프라 (필수) |

### 3.2 단계적 전환 전략

#### Phase 1: SaaS 스택 (0-1,000 사용자)
```
배포: Vercel (프론트) + Railway/Render (백엔드)
DB: Neon (scale-to-zero PostgreSQL)
스토리지: Cloudflare R2
CI/CD: GitHub Actions
```
- 장점: 초기 비용 최소, 빠른 출시, 운영 부담 없음
- 비용: ~$500-2,000/월

#### Phase 2: 하이브리드 (1,000-5,000 사용자)
```
배포: 핵심 서비스 → GCP Cloud Run으로 이전
DB: Neon (소규모) + Cloud SQL (대규모 테넌트)
스토리지: GCS/S3
CI/CD: GitHub Actions + Cloud Build
```
- 장점: 비용 절감 시작, 대규모 테넌트 격리
- 비용: ~$4,000-8,000/월

#### Phase 3: 자체 인프라 (5,000+ 사용자)
```
배포: GKE/EKS + Cloud Run (서버리스 하이브리드)
DB: Cloud SQL + 자체 PostgreSQL 클러스터
스토리지: S3/GCS
CI/CD: ArgoCD + GitHub Actions
모니터링: Prometheus + Grafana
```
- 장점: 완전한 제어, 비용 최적화, 커스터마이징
- 비용: ~$10,000-20,000/월

### 3.3 경쟁사 인프라 전략 변천

| 경쟁사 | 초기 | 현재 | 전환 동기 |
|--------|------|------|----------|
| **Replit** | 순수 클라우드 (GCP) | GCP 기반 자체 인프라 | 배포 자동화 내재화 필요 |
| **Bolt.new** | 클라이언트(WebContainer) | Bolt Cloud (자체) | 호스팅 수익화, UX 통합 |
| **Vercel** | AWS 기반 | 자체 Edge Network | 성능 차별화, 비용 제어 |
| **Supabase** | AWS | 자체 관리 인프라 (Fly.io 등) | 비용 최적화, 글로벌 확장 |

---

## 4. YHAI 특수 요구사항 분석

### 4.1 사용자별 독립 앱 배포 (멀티테넌트)

**도전 과제:**
- 각 사용자가 생성한 앱은 독립적으로 배포/운영되어야 함
- 앱 간 격리 (보안, 리소스)
- 대부분의 앱은 비활성 (Scale-to-zero 필수)

**적합한 접근:**
1. **GCP Cloud Run**: Scale-to-zero, 서비스 격리, 자동 스케일링
2. **Neon DB**: Scale-to-zero PostgreSQL, 브랜칭으로 개발/프로덕션 분리
3. **Cloudflare Workers**: 엣지 배포, 글로벌 저지연

### 4.2 DB 프로비저닝 자동화

**요구사항:**
- 사용자 앱 생성 시 DB 자동 생성
- 스키마 마이그레이션 자동 실행
- 비활성 DB 비용 최소화

**솔루션 비교:**
| 솔루션 | 자동 프로비저닝 | Scale-to-Zero | API 제공 | 비용/DB |
|--------|---------------|-------------|---------|--------|
| Neon | API로 DB 생성 | 지원 | REST API | ~$0 (유휴), $0.35/GB |
| Supabase | API로 프로젝트 생성 | 미지원 | Management API | $25/월/프로젝트 |
| Turso | API로 DB 생성 | 지원 | REST API | ~$0 (유휴) |
| Cloud SQL | Terraform/API | 미지원 | gcloud API | $10+/월/인스턴스 |

### 4.3 Claude Code 생성 코드 자동 빌드/배포 CI/CD

**파이프라인 설계:**
```
Claude Code 생성 → Git Push → CI/CD 트리거
      ↓
[빌드 단계]
- npm install / pip install
- 린트 + 타입 체크
- 빌드 (Next.js build 등)
- Docker 이미지 생성
      ↓
[배포 단계]
- 컨테이너 레지스트리 push
- Cloud Run / ECS 서비스 업데이트
- DB 마이그레이션 실행
- 헬스체크 확인
      ↓
[미리보기]
- 프리뷰 URL 생성
- 사용자에게 알림
```

### 4.4 비용 모델 비교

| 모델 | 설명 | 장점 | 단점 |
|------|------|------|------|
| **플랫폼 흡수** | YHAI가 인프라 비용 부담, 구독료에 포함 | 사용자 경험 단순 | 마진 압박, 비용 예측 어려움 |
| **사용자 전가** | 사용자가 자체 Vercel/Supabase 계정 연결 | 인프라 비용 0 | 설정 복잡, 이탈 위험 |
| **하이브리드** | 기본 호스팅은 YHAI 제공 + 초과 사용량 과금 | 밸런스 | 과금 시스템 구축 필요 |
| **티어별 차등** | 무료(공유)/Pro(전용)/Enterprise(격리) | 업셀 경로 명확 | 티어별 인프라 분리 필요 |

---

## 5. 조사 결론

### 핵심 발견사항

1. **경쟁사 트렌드**: Lovable(Supabase), Bolt(자체 Cloud), Replit(GCP 자체) 모두 자체 인프라로 수렴
2. **Scale-to-Zero가 핵심**: YHAI처럼 대부분 비활성인 멀티테넌트에서 GCP Cloud Run + Neon 조합이 가장 비용 효율적
3. **초기엔 SaaS**: 1,000 사용자 이하에서는 SaaS가 비용/운영 모두 유리
4. **전환 시점**: 월 SaaS 비용 $5,000-6,000 초과 시 (약 1,000-2,000 사용자) 자체 인프라 검토
5. **DB 자동화**: Neon API가 현시점 최적 (scale-to-zero + REST API 프로비저닝 + PostgreSQL)

### 추천 방향 (조사 기반)

**단기 (MVP ~ 1,000 사용자)**: SaaS 스택
- 배포: Cloudflare Pages (프론트) + Railway/Cloud Run (백엔드+사용자 앱)
- DB: Neon (scale-to-zero PostgreSQL)
- 이유: 최소 비용, 빠른 출시, 운영 부담 없음

**중장기 (1,000+ 사용자)**: 자체 인프라 전환
- 배포: GCP Cloud Run → GKE 하이브리드
- DB: Cloud SQL + Neon (용도별 분리)
- 이유: 비용 절감, 커스터마이징, 격리 강화

---

## Sources

### 배포 플랫폼
- [Vercel Pricing](https://vercel.com/pricing)
- [Vercel Limits](https://vercel.com/docs/limits)
- [Cloudflare Pages 2026 Guide](https://hostmeloud.com/cloudflare-pages-2026-guide/)
- [Railway vs Render 2026](https://thesoftwarescout.com/railway-vs-render-2026-best-platform-for-deploying-apps/)
- [Deploying Full Stack Apps in 2026](https://www.nucamp.co/blog/deploying-full-stack-apps-in-2026-vercel-netlify-railway-and-cloud-options)

### DB 서비스
- [Best Database Software for Startups 2026](https://makerkit.dev/blog/tutorials/best-database-software-startups)
- [Neon Serverless Postgres Pricing 2026](https://vela.simplyblock.io/articles/neon-serverless-postgres-pricing-2026/)
- [6 Best Serverless SQL Databases 2026](https://www.devtoolsacademy.com/blog/serverless-sql-databases/)
- [PlanetScale Alternatives 2026](https://www.buildmvpfast.com/alternatives/planetscale)

### 경쟁사 분석
- [Lovable vs Bolt vs V0](https://lovable.dev/guides/lovable-vs-bolt-vs-v0)
- [AI App Builders Comparison 2026](https://freeacademy.ai/blog/v0-vs-bolt-vs-lovable-ai-app-builders-comparison-2026)
- [Bolt.new Infrastructure](https://aitoolsinsights.com/articles/stackblitz-bolt-new-infrastructure-explained)
- [Replit 2025 Review](https://blog.replit.com/2025-replit-in-review)

### 클라우드 인프라
- [EKS vs ECS 2026](https://squareops.com/eks-vs-ecs/)
- [ECS Fargate Cost Analysis](https://medium.com/@inboryn/cost-optimization-why-ecs-fargate-costs-3x-more-than-kubernetes-2026-reality-check-f9a2bb726f00)
- [Cloud Run Pricing](https://cloud.google.com/run/pricing)
- [Kubernetes Multi-Tenancy](https://kubernetes.io/docs/concepts/security/multi-tenancy/)

### 비용 분석
- [Infrastructure Monitoring: Self-Hosted vs SaaS](https://www.metricfire.com/blog/infrastructure-monitoring-costs-self-hosted-vs-saas/)
- [Multi-Tenant Docker Architecture 2026](https://oneuptime.com/blog/post/2026-02-08-how-to-design-a-multi-tenant-docker-architecture/view)
- [Per-User Docker Container Isolation](https://dev.to/reeddev42/per-user-docker-container-isolation-a-pattern-for-multi-tenant-ai-agents-8eb)
