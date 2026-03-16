# 의사결정 로그

> 주요 의사결정과 그 근거를 기록합니다. 컨텍스트가 초기화되어도 이 파일을 읽으면 이전 결정을 복원할 수 있습니다.

## 2026-03-12

### D-001: 프로젝트 구조 — 프론트/백 분리
- **결정**: frontend/ 와 backend/ 폴더로 분리
- **근거**: 독립적 배포, 기술 스택 분리, 팀 작업 병렬화

### D-002: 백엔드 프레임워크 — FastAPI
- **결정**: FastAPI + TypeScript
- **근거**: 프론트엔드와 TypeScript 공유, WebSocket/SSE 내장 지원, 모듈 기반 아키텍처

### D-003: 결과물 범위 — 풀스택 + 자동 배포
- **결정**: 프론트엔드 + 백엔드 + DB 스키마 코드 생성, 자동 배포까지 포함
- **근거**: 사용자가 코딩 없이 완성된 서비스를 받을 수 있어야 함

### D-004: 접근 방식 — 기획 우선
- **결정**: 서비스 시나리오 → 설계 → 디자인 → 구현 순서
- **근거**: 기획 없이 구현하면 방향성 불일치 리스크 높음

### D-005: 도메인 전문가 시스템
- **결정**: 자동 감지 + 사용자 선택 혼합, 복수 전문가 동시 참여
- **근거**: 사용자 편의성(자동 추천) + 자율성(직접 선택/제거) 모두 보장

### D-006: 기획 팀 커뮤니케이션
- **결정**: Slack(중간 보고/질문) + Email(장문 기획 문서)
- **근거**: 빠른 확인은 Slack, 상세 문서는 Email로 채널 분리

### D-007: Gate Review 방식
- **결정**: 각 단계 완료 시 사용자 확인 필수, 미확인 시 다음 단계 진행 금지
- **근거**: 제한된 컨텍스트에서 실수 방지, 사용자 의사결정 보장

## 2026-03-14

### D-008: 배포/DB 전략 — Vercel + Supabase 확정
- **결정**: 기존 GCP Cloud Run + Neon 3단계 하이브리드 전략에서 **Vercel + Supabase** 조합으로 변경
- **근거**: 사용자 직접 결정. Vercel은 Next.js 개발사로 최적 배포 지원, Supabase는 DB + Auth + Storage + Realtime 올인원 제공
- **이전 제안 대비 장점**: 개발 속도 향상 (올인원), Next.js 네이티브 최적화, Auth/Storage/Realtime 별도 구축 불필요
- **이전 제안 대비 단점**: Supabase Scale-to-Zero 미지원 (비용 증가 가능), 벤더 종속도 증가
- **대응**: 공유 Supabase + RLS 멀티테넌트로 비용 절감, 표준 기술(PostgreSQL, Prisma) 사용으로 이식성 확보

### D-009: 멀티테넌트 전략 — 하이브리드 (공유 RLS + 전용 프로젝트)
- **결정**: Free/Starter는 공유 Supabase + RLS 격리, Pro 이상은 전용 Supabase 프로젝트
- **근거**: 비용 효율성 (공유 1프로젝트로 수백 사용자 지원) + 상위 티어 격리 요구 충족
- **비용 구조**: 공유 RLS 시 사용자당 ~$0.50-2.00, 전용 프로젝트 시 $25/월/사용자

### D-010: 배포 방식 — 파일 직접 업로드 (MVP) → GitHub 연동 (Pro)
- **결정**: MVP에서는 Vercel REST API 파일 인라인 업로드, Pro 이상에서 GitHub 연동 옵션 제공
- **근거**: 파일 업로드 방식이 가장 빠르고 Git 의존성 없음, Pro에서는 코드 소유권 보장

### D-011: AI 에이전트 팀 구성 — 복잡도별 동적 결정 방식
- **결정**: 프로젝트 복잡도에 따라 팀 구성을 동적으로 결정. YHAI는 SaaS(High complexity)이므로 기본 안 B(4인 Standard Team) 또는 안 C(Expert Team) 적용
- **근거**: 고정 팀 구성보다 프로젝트 특성에 맞는 유연한 팀 편성이 품질과 비용 효율 모두에 유리
- **팀 구성 옵션**:
  - 안 A (Minimal, 2인): 간단한 랜딩/포트폴리오 — Frontend + Fullstack
  - 안 B (Standard, 4인): 중간 복잡도 SaaS — PM + Frontend + Backend + DB/DevOps
  - 안 C (Expert, 5-6인): 고복잡도 — PM + Frontend + Backend + DB + DevOps + QA
- **YHAI 기본값**: 안 B(Standard 4인) 기본, 필요 시 안 C(Expert)로 확장
- **관련 산출물**: `docs/planning/proposals/team-composition-ideas.md`
