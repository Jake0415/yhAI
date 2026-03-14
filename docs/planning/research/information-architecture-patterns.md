# 정보 아키텍처(IA) 설계 패턴 조사 리포트

> 조사일: 2026-03-14
> 목적: Plan 2 (정보 아키텍처 설계)를 위한 SaaS IA 패턴, 네비게이션 구조, URL 설계, API 패턴 조사

---

## 1. SaaS 네비게이션 패턴

### 1.1 사이드바 네비게이션 (주류)
- SaaS 대시보드의 표준 패턴
- 프로젝트 관리, 개발자 도구, 분석 대시보드에서 가장 많이 사용
- 접근 패턴: 고정 사이드바 + 아이콘 + 텍스트 + 접기/펼치기
- 컨텍스트 인식 디자인 -- 현재 페이지/사용자 역할에 따라 메뉴 변경

### 1.2 워크스페이스 기반 아키텍처
- 하나의 계정으로 여러 프로젝트/팀 관리
- Slack, Notion, Linear 등이 채택한 패턴
- YHAI에 적합: 사용자 -> 프로젝트(워크스페이스) 구조

### 1.3 탭 + 브레드크럼 보조 네비게이션
- 프로젝트 내부에서 채팅/요구사항/팀/빌드/미리보기 간 전환에 탭 사용
- 깊은 계층에서 브레드크럼으로 현재 위치 표시

## 2. Next.js App Router URL 구조 Best Practices

### 2.1 핵심 원칙
- 폴더 = URL 세그먼트, 중첩 폴더 = 중첩 세그먼트
- `layout.tsx` -- 하위 세그먼트 공유 UI (리렌더링 없는 partial rendering)
- 동적 라우트: `[id]`, catch-all: `[...slug]`, optional: `[[...slug]]`
- Route Groups: `(group)` -- URL 변경 없이 코드 조직
- Private folders: `_folder` -- 라우팅에서 제외

### 2.2 레이아웃 전략
- Root Layout (필수): HTML 스캐폴드 + 글로벌 스타일/프로바이더
- Nested Layouts: 섹션별 셸 (예: 대시보드 사이드바)
- 레이아웃은 persistent UI만 담당 (헤더, 푸터, 네비게이션)

## 3. SaaS API 설계 패턴

### 3.1 RESTful 설계 원칙
- 리소스 기반 URL (명사): `/projects`, `/conversations`, `/agents`
- 관계 반영: `/projects/:id/conversations/:convId/messages`
- 페이지네이션: `?page=2&size=20&sort=createdAt`
- 필터링: `?status=active&domain=ecommerce`

### 3.2 AI 시스템 특화 패턴
- SSE 스트리밍: `/api/chat/stream` (채팅 응답)
- WebSocket: 빌드 진행상황 실시간 전송
- 비동기 작업: 큐 기반 + 상태 폴링 또는 Realtime 구독

## 4. Supabase 멀티테넌트 설계

### 4.1 공유 테이블 + RLS (YHAI 기본 전략)
- 모든 테넌트가 동일 테이블 공유
- `tenant_id` (또는 `user_id`) 컬럼으로 데이터 격리
- RLS 정책이 인증된 사용자의 tenant 컨텍스트 기반 자동 필터링
- 사용자 `app_metadata`에 `tenant_id` 저장하여 추가 DB 쿼리 불필요

### 4.2 설계 주의사항
- 크로스 스키마 FK 제약 회피 (성능 저하)
- 민감 데이터 테이블은 private 스키마로 이동
- 프론트엔드에서 불필요한 테이블 접근 차단

## 5. YHAI에 적용할 핵심 인사이트

1. **사이드바 + 프로젝트 탭**: 메인 네비게이션은 사이드바, 프로젝트 내부는 탭 기반
2. **Next.js Nested Layouts**: 인증/대시보드/프로젝트별 레이아웃 3단계 중첩
3. **RESTful + SSE 하이브리드**: CRUD는 REST, 실시간은 SSE/WebSocket/Supabase Realtime
4. **RLS 기반 멀티테넌트**: 공유 테이블 + user_id 기반 RLS로 시작

---

## Sources

- [SaaS Navigation UX Guide](https://www.merveilleux.design/en/blog/article/comprehensive-guide-for-saas-products-on-ux-navigation-types)
- [SaaS Navigation Menu Design](https://lollypop.design/blog/2025/december/saas-navigation-menu-design/)
- [Best Sidebar Menu Design Examples 2025](https://www.navbar.gallery/blog/best-side-bar-navigation-menu-design-examples)
- [Next.js Layouts and Pages](https://nextjs.org/docs/app/getting-started/layouts-and-pages)
- [Next.js App Router Best Practices 2025](https://medium.com/better-dev-nextjs-react/inside-the-app-router-best-practices-for-next-js-file-and-directory-structure-2025-edition-ed6bc14a8da3)
- [Web API Design Best Practices (Microsoft)](https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design)
- [Supabase Multi-Tenant Discussion](https://github.com/orgs/supabase/discussions/1615)
- [Supabase Multi-Tenancy with RLS](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/)
- [Information Architecture for Web Design](https://www.altexsoft.com/blog/uxdesign/information-architecture/)
- [Flowmapp Website Planning Tool](https://www.flowmapp.com)
