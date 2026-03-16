# 🤖 Claude Code 개발 지침

**YHAI**는 AI 전문가 대화 기반 웹 서비스 자동 생성 플랫폼입니다.

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
- **Queue**: Celery + Redis (비동기 빌드 작업)
- **AI**: Claude API (Anthropic SDK)
- **Docs**: Swagger/OpenAPI (FastAPI 내장)

## 📚 개발 가이드

- **🔧 ECC Tools**: `@/.claude/ECC_TOOLS.md`
- **🗺️ 개발 로드맵**: `@/docs/ROADMAP.md`
- **📋 프로젝트 요구사항**: `@/docs/PRD.md`
- **📁 프로젝트 구조**: `@/docs/guides/project-structure.md`
- **🎨 스타일링 가이드**: `@/docs/guides/styling-guide.md`
- **🧩 컴포넌트 패턴**: `@/docs/guides/component-patterns.md`
- **⚡ Next.js 15.5.3 전문 가이드**: `@/docs/guides/nextjs-15.md`
- **📝 폼 처리 완전 가이드**: `@/docs/guides/forms-react-hook-form.md`

## 📂 프로젝트 구조

```
yhai/
├── frontend/     # Next.js 15.5.3 프론트엔드
├── backend/      # FastAPI 백엔드 서버
├── docs/         # 프로젝트 문서
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

💡 **상세 규칙은 위 개발 가이드 문서들을 참조하세요**
