# 항상 보존해야 할 파일

프로젝트 초기화 시 아래 파일들은 절대 삭제하지 않습니다.

## 설정 파일
- 핵심 Next.js 설정 파일 (next.config.ts 등)
- TypeScript 설정 (tsconfig.json)
- TailwindCSS 설정
- ESLint 및 Prettier 설정
- ShadcnUI 설정 (components.json)
- 환경 변수 템플릿 (.env.example)

## 핵심 코드
- 필수 레이아웃 컴포넌트 (layout.tsx)
- ShadcnUI 컴포넌트 (`src/components/ui/`)
- 인증 설정 (적절히 구현된 경우)
- 데이터베이스 설정 (필요한 경우)

## 문서
- docs/PRD.md (프로젝트 요구사항)
- docs/ROADMAP.md (개발 로드맵)
- CLAUDE.md (개발 지침)
- README.md (업데이트 대상이지만 삭제하지 않음)
