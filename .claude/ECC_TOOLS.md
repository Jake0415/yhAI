# ECC Tools Reference

> [everything-claude-code](https://github.com/affaan-m/everything-claude-code) 에서 선택적으로 가져온 도구 카탈로그

---

## 에이전트 팀 구조

### 개발팀 (`.claude/agents/dev/`)

| Agent | Role | Model |
|-------|------|-------|
| `dev-lead` | **팀 리더** — 작업 분석, 위임, 검토 | opus |
| `nextjs-app-developer` | 프론트엔드 구현 (App Router) | sonnet |
| `ui-markup-specialist` | UI 마크업 및 스타일링 | sonnet |
| `development-planner` | 로드맵/태스크 기획 지원 | sonnet |

### 기획팀 (`.claude/agents/planning/`)

| Agent | Role | Model |
|-------|------|-------|
| `team-leader` | **팀 리더** — 기획 워크플로우 총괄 | opus |
| `web-researcher` | 웹 리서치 및 분석 | sonnet |
| `service-planner` | 서비스 전략 및 개선안 | opus |

### 품질팀 (`.claude/agents/quality/`)

| Agent | Role | Model |
|-------|------|-------|
| `quality-lead` | **팀 리더** — 품질 트리아지, 리뷰 통합 | opus |
| `code-reviewer` | 일반 코드 품질 리뷰 | sonnet |
| `python-reviewer` | Python/FastAPI 코드 리뷰 | sonnet |
| `database-reviewer` | PostgreSQL/Supabase 리뷰 | sonnet |
| `security-reviewer` | 보안 취약점 탐지 | sonnet |
| `e2e-runner` | E2E 테스트 실행 | sonnet |
| `tdd-guide` | 테스트 주도 개발 가이드 | sonnet |

### 자문 (Advisory)

| Agent | Role | Model |
|-------|------|-------|
| `architect` | 시스템 설계 의사결정 자문 | opus |
| `planner` | 구현 계획 수립 자문 | opus |

## Skills (`.claude/skills/`)

### Python/Backend

| Skill | Description |
|-------|-------------|
| `python-patterns` | Pythonic idioms, PEP 8, type hints |
| `python-testing` | pytest, TDD, fixtures, mocking |
| `api-design` | RESTful API design patterns |
| `database-migrations` | Alembic migration best practices |
| `postgres-patterns` | PostgreSQL query optimization |

### Frontend

| Skill | Description |
|-------|-------------|
| `frontend-patterns` | React/Next.js patterns |
| `e2e-testing` | Playwright E2E testing |
| `coding-standards` | Universal coding standards |

### DevOps/Security

| Skill | Description |
|-------|-------------|
| `docker-patterns` | Docker containerization |
| `deployment-patterns` | CI/CD, rollback strategies |
| `security-review` | Security review workflow |
| `security-scan` | Automated security scanning |

### Workflow

| Skill | Description |
|-------|-------------|
| `tdd-workflow` | TDD workflow enforcement |
| `verification-loop` | Build/test/lint verification |
| `deep-research` | Multi-source deep research |
| `search-first` | Search-before-code approach |

## Dev Commands (`.claude/commands/dev/`)

| Command | Usage | Description |
|---------|-------|-------------|
| `/dev:plan` | Planning | Implementation plan with risk assessment |
| `/dev:code-review` | Review | Trigger code review agent |
| `/dev:tdd` | Testing | TDD workflow enforcement |
| `/dev:verify` | Verification | Build/type/lint/test check |
| `/dev:build-fix` | Debug | Build error resolution |
| `/dev:quality-gate` | Quality | Quality gate checks |
| `/dev:test-coverage` | Testing | Coverage analysis |
| `/dev:e2e` | Testing | E2E test with Playwright |
| `/dev:python-review` | Review | Python/FastAPI code review |
| `/dev:checkpoint` | Workflow | Progress checkpoint |
| `/dev:update-docs` | Docs | Documentation updates |
| `/dev:refactor-clean` | Refactor | Refactoring workflow |

## Rules (`.claude/rules/`)

- `common/` - Universal coding principles (9 files)
- `typescript/` - TypeScript/Next.js guidelines (5 files)
- `python/` - Python/FastAPI guidelines (5 files)

## Contexts (`.claude/contexts/`)

- `dev.md` - Development mode context
- `review.md` - Code review context
- `research.md` - Research context

## PostToolUse Hooks

| Hook | Trigger | Description |
|------|---------|-------------|
| `quality-gate.js` | Edit/Write | Async quality checks |
| `post-edit-format.js` | Edit | Auto-format (Prettier/Biome) |
| `post-edit-typecheck.js` | Edit | TypeScript type checking |
| `post-edit-console-warn.js` | Edit | console.log detection |
