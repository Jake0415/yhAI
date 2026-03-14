---
description: 'Next.js + TypeScript + Tailwind CSS + Shadcn UI로 UI 컴포넌트를 생성합니다. 정적 마크업과 스타일링에만 집중합니다.'
allowed-tools:
  - 'Read'
  - 'Write'
  - 'Edit'
  - 'Glob'
  - 'Grep'
  - 'mcp__shadcn__search_items_in_registries'
  - 'mcp__shadcn__view_items_in_registries'
  - 'mcp__shadcn__get_item_examples_from_registries'
  - 'mcp__shadcn__get_add_command_for_items'
  - 'mcp__context7__resolve-library-id'
  - 'mcp__context7__query-docs'
  - 'mcp__sequential-thinking__sequentialthinking'
  - 'Bash(npx shadcn@latest:*)'
---

# UI 마크업 생성

Next.js 앱용 UI 컴포넌트를 생성합니다. 정적 마크업과 스타일링에만 집중하며, 비즈니스 로직은 구현하지 않습니다.

## 사용법

```
/ui-markup [만들고 싶은 컴포넌트 설명]
```

## 담당 업무

- 시맨틱 HTML 마크업 생성
- Tailwind CSS v4 스타일링 + 반응형 디자인
- Shadcn UI 컴포넌트 통합 (new-york 스타일)
- Lucide React 아이콘 사용
- ARIA 속성으로 접근성 보장
- TypeScript 인터페이스 작성 (타입만, 로직 없음)

## 담당하지 않는 업무

- 상태 관리 (useState, useReducer)
- 실제 이벤트 핸들러 로직
- API 호출, 데이터 페칭
- 폼 유효성 검사 로직
- 서버 액션, API 라우트

## 워크플로우

### Step 1: 요구사항 분석
- Sequential Thinking으로 복잡한 요청 분해
- 필요한 컴포넌트와 기술 스택 파악

### Step 2: 리서치
- Shadcn MCP로 필요한 UI 컴포넌트 검색
- Context7 MCP로 최신 문서 참조
- 프로젝트 가이드 (`docs/guides/styling-guide.md`, `docs/guides/component-patterns.md`) 확인

### Step 3: 구현
- 참조한 예제 기반으로 마크업 생성
- 모바일 우선 반응형 디자인
- CSS 변수로 테마 일관성 유지

### Step 4: 검증
- 시맨틱 HTML 구조 확인
- 반응형 동작 검증
- 접근성 속성 확인

## 코드 표준

```tsx
// 컴포넌트 설명 (한국어)
interface ComponentNameProps {
  title?: string
  className?: string
}

export function ComponentName({ title, className }: ComponentNameProps) {
  return (
    <div className="space-y-4">
      {/* 정적 마크업만 */}
      <Button onClick={() => {}}>
        {/* TODO: 클릭 로직 구현 필요 */}
        Click Me
      </Button>
    </div>
  )
}
```

## 규칙

- 모든 주석은 **한국어**, 변수명/함수명은 영어
- 인터랙티브 요소에는 `onClick={() => {}}` 플레이스홀더
- 로직 필요 위치에 TODO 주석 (한국어)
- MCP 도구 적극 활용: 추측하지 말고 문서 확인
