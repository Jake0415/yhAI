# 🤖 Claude Code 개발 지침

**YHAI**는 AI 전문가 팀 기반 종합 창업 지원 플랫폼입니다.

> 창업 아이템을 입력하면, AI 전문가 팀(창업전략, 법률, 세무, 상권, 마케팅, 자금)이 단계적으로 가이드해주는 서비스

## 🛠️ 핵심 기술 스택

### Frontend (`frontend/`)

- **Framework**: Next.js 15.5.3 (App Router + Turbopack)
- **Runtime**: React 19.1.0 + TypeScript 5
- **Styling**: TailwindCSS v4 + shadcn/ui (new-york style)
- **Forms**: React Hook Form + Zod + Server Actions
- **UI Components**: Radix UI + Lucide Icons
- **Development**: ESLint + Prettier + Husky + lint-staged

### Backend (`backend/`)

- **Framework**: FastAPI (Python 3.11+)
- **ORM**: SQLAlchemy + Alembic (마이그레이션)
- **DB**: Supabase PostgreSQL
- **Auth**: Supabase Auth (JWT)
- **Queue**: Celery + Redis (비동기 작업)
- **AI**: Claude API (Anthropic SDK)
- **Docs**: Swagger/OpenAPI (FastAPI 내장)

## 📚 개발 가이드

- **🔧 ECC Tools**: `@/.claude/ECC_TOOLS.md`
- **📋 PRD**: `@/docs/planning/prd.md`
- **📝 의사결정 로그**: `@/docs/planning/decisions.md`

## 📂 프로젝트 구조

```
yhai/
├── frontend/     # Next.js 15.5.3 프론트엔드
├── backend/      # FastAPI 백엔드 서버
├── docs/         # 프로젝트 문서
│   └── planning/ # 기획 문서 (PRD, 조사, 제안)
└── CLAUDE.md     # 개발 지침
```

## ⚡ 자주 사용하는 명령어

```bash
# 프론트엔드 (frontend/ 디렉토리에서 실행)
cd frontend
npm run dev         # 개발 서버 실행 (Turbopack)
npm run build       # 프로덕션 빌드
npm run check-all   # 모든 검사 통합 실행 (권장)

# 백엔드 (backend/ 디렉토리에서 실행)
cd backend
pip install -r requirements.txt  # 의존성 설치
uvicorn app.main:app --reload    # 개발 서버 실행
alembic upgrade head             # DB 마이그레이션 적용

# UI 컴포넌트
npx shadcn@latest add button    # 새 컴포넌트 추가
```

## ✅ 작업 완료 체크리스트

```bash
# 프론트엔드
cd frontend
npm run check-all   # 모든 검사 통과 확인
npm run build       # 빌드 성공 확인

# 백엔드
cd backend
pytest              # 테스트 실행
```
