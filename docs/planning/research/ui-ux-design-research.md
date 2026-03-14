# UI/UX 디자인 가이드 조사 리포트

- 작성일: 2026-03-14
- 조사 목적: YHAI AI 웹사이트 빌드 플랫폼의 UI/UX 디자인 가이드 수립을 위한 경쟁사 분석 및 최신 트렌드 조사
- 대상 서비스: Bolt.new, Lovable, v0.dev, Cursor, Replit Agent

---

## 핵심 발견사항 (Executive Summary)

1. AI 빌더 서비스들은 2025-2026년 기준으로 **채팅 + 코드 + 라이브 프리뷰**의 3분할 레이아웃을 산업 표준으로 정착시켰다. Bolt.new의 StackBlitz WebContainer, Lovable의 전체 스택 통합 인터페이스, v0의 디자인 모드가 각각 차별화된 접근을 보여준다.
2. 멀티 에이전트 UI는 단순 채팅을 넘어 **투명한 에이전트 상태 표시 + 단계별 도구 사용 로그 + 사용자 승인 게이트** 패턴이 핵심 트렌드로 부상했다.
3. **TailwindCSS v4의 CSS-first 테마 시스템**과 shadcn/ui의 확장 레지스트리(Kibo UI 등)가 디자인 시스템 구성의 실질적 표준이 됐다.
4. Mission Control 스타일 대시보드는 WebSocket + SSE 실시간 업데이트, 카드 기반 패널 아키텍처, 사이버펑크/다크 테마 컬러 팔레트(cyan, violet, mint 계열)를 채택하는 추세다.
5. EU 접근성법(2025년 6월 시행)으로 WCAG 2.1 AA 이상 준수가 법적 의무화되어, 접근성이 선택이 아닌 필수 요건이 됐다.

---

## 상세 조사 결과

### 1. AI 빌더 서비스 UI/UX 트렌드 2025-2026

#### 1.1 주요 경쟁사 인터페이스 구조

**Bolt.new (StackBlitz)**
- 핵심 차별점: StackBlitz WebContainer 기술로 브라우저 내 실제 Node.js 환경 구동
- UI 구조: 좌측 파일 트리 + 중앙 코드 에디터 + 우측 라이브 프리뷰 (3패널)
- 채팅은 하단 또는 오버레이 방식으로 통합
- 복잡성을 숨기지 않고 실제 개발 환경을 직접 노출하는 철학
- 2026년 업데이트: 팀 템플릿, 협업 워크플로우, 디자인-to-코드 통합

**Lovable**
- 핵심 차별점: 프론트엔드 + 백엔드 + DB + 인증 + 파일 스토리지 + 호스팅을 단일 채팅 인터페이스로 처리
- UI 구조: 좌측 채팅 패널 + 우측 라이브 프리뷰 (기본 2패널, 코드 보기 토글 가능)
- **Chat Mode**: 코드 변경 없이 브레인스토밍, 디버깅, 계획 수립
- **Edit Mode**: 프롬프트 기반 코드 생성 및 수정
- **Visual Editor**: 포인트-앤-클릭 방식으로 spacing, color, layout 수정
- Lovable 2.0의 Chat Mode Agent: 다중 단계 추론, 프로젝트 파일 탐색, 로그 검사, DB 쿼리 수행 후 사용자 승인 시에만 코드 변경
- 일 10만+ 신규 프로젝트 생성, 총 2,500만+ 프로젝트 (2026 기준)

**v0.dev (Vercel)**
- 핵심 차별점: React + Tailwind CSS + shadcn/ui 기반으로 가장 프로덕션 레디한 프론트엔드 코드 생성
- UI 구조: 좌측 채팅/히스토리 + 우측 컴포넌트 프리뷰 + 코드 탭 전환
- **Design Mode**: 라이브 프리뷰로 UI 세부사항 시각적 수정 후 코드 생성
- 코드 품질: TypeScript 타입 완비, 모듈화된 컴포넌트, 시니어 개발자가 코드 리뷰를 통과시킬 수준
- 텍스트 설명 또는 스크린샷으로 UI 컴포넌트 생성

**Cursor (Visual Editor, Dec 2025 출시)**
- **통합 워크스페이스**: 렌더링된 웹앱 + 코드베이스 + 비주얼 에디팅 툴을 단일 창에 통합
- 사이드바 컨트롤: 슬라이더, 색상 팔레트(실시간 미리보기), 커스텀 컬러 토큰, React props 검사
- 직접 조작: DOM 트리에서 렌더링된 요소 드래그, flexbox/그리드 레이아웃 즉시 테스트
- "포인트 앤 프롬프트": 요소 클릭 후 자연어 변경 기술 → 에이전트가 병렬 실행 → 수 초 내 결과 반영
- 철학: 디자인과 코드 작업을 통합하여 즉각적이고 직관적인 인터페이스 수정

#### 1.2 공통 UI 트렌드

| 트렌드 | 설명 |
|--------|------|
| 채팅-to-코드 파이프라인 | 자연어 입력 → 실시간 코드 생성 → 즉시 프리뷰 |
| 스크린샷-to-코드 | 이미지/스크린샷 업로드로 UI 재현 |
| Visual Editor 통합 | 코드 없이 포인트-앤-클릭 UI 수정 |
| 에이전트 승인 게이트 | 코드 변경 전 사용자 확인 단계 |
| 전체 스택 추상화 | 백엔드/DB/인증 설정을 UI가 자동 처리 |

---

### 2. 채팅 UI 디자인 패턴

#### 2.1 핵심 채팅 UI 컴포넌트

**입력 영역 (Prompt Input)**
- 다중 줄 텍스트 입력 지원
- 파일 첨부 및 이미지 드래그&드롭
- 키보드 단축키 최적화 (Shift+Enter 줄바꿈, Enter 전송)
- 자동 완성 및 명령어 팔레트 (`/` 트리거)
- 커스텀 액션 버튼 (파일 업로드, 음성 입력 등)

**메시지 표시**
- 역할별 시각적 구분: 사용자(우측 정렬, 강조 배경) vs AI(좌측 정렬, 중립 배경)
- 아바타 시스템: 전문가 에이전트별 고유 아이콘/색상으로 구분
- 마크다운 렌더링: 헤딩, 볼드, 이탤릭, 링크
- 코드 블록: 구문 하이라이팅 + 복사 버튼 + 언어 레이블
- 타임스탬프 및 메시지 그루핑

**멀티 에이전트 시각화**
- 에이전트별 고유 색상 코딩 (예: Architect=파란색, Developer=녹색, Reviewer=주황색)
- 에이전트 아바타 또는 아이콘으로 발화자 즉시 식별
- 에이전트 전환 시 시각적 핸드오프 표시 ("Handing off to Developer Agent...")
- 도구 사용 인라인 표시 (Chainlit 패턴): "Searched database", "Called API" 등 중간 단계 카드

**프리셋 및 예시 칩 (Suggestion Chips)**
- 빠른 액션 버튼: "예", "아니오", "계속" 등 원터치 응답
- 예시 프롬프트 칩: 첫 화면에 8-12개 추천 프롬프트 표시
- 컨텍스트 인식 제안: 대화 맥락에 따른 동적 추천 버튼
- 카테고리 필터 칩: "웹사이트", "대시보드", "랜딩 페이지" 등

**로딩 및 스트리밍 상태**
- Thinking 인디케이터: 300ms 이내에 즉시 표시 (첫 토큰 도착 전)
- 목표: Time-to-First-Token (TTFT) 800ms 이하 유지
- 스트리밍 텍스트: 레이아웃 안정성 유지하며 점진적 업데이트
- 타이핑 인디케이터: 3개 점 애니메이션 (2초 간격 이벤트 발화)
- 에이전트 상태 표시: "Thinking...", "Searching...", "Writing code..." 등
- 에러 상태: 구체적 실패 원인 + 다음 단계 제안

#### 2.2 2025년 채팅 UI 설계 원칙

1. **투명성(Transparency)**: 에이전트가 무엇을 하는지 실시간 표시 → 신뢰 구축
2. **사용자 제어**: 취소 버튼, 수정 기능, 일시 정지 옵션 항상 제공
3. **프로그레시브 디스클로저**: 관련 단계에서만 관련 정보 노출
4. **AI-Second 철학**: AI는 기존 작업 흐름을 강화하는 도구, 채팅이 전부가 아님
5. **애니메이션 효과**: 대기 시간을 20% 짧게 느끼게 하는 로딩 애니메이션 활용

#### 2.3 prompt-kit 라이브러리 (shadcn/ui 기반 채팅 UI)

```bash
# 컴포넌트 설치
npx shadcn@latest add "https://prompt-kit.com/c/[COMPONENT].json"
```

제공 컴포넌트:
- `PromptInput`: 다중 줄 입력, 커스텀 액션, 자동 완성
- `MessageList`: 역할 기반, 아바타, 스크롤 동작
- `ConversationLayout`: 사이드바 히스토리 + 메인 채팅
- `StreamingMessage`: 점진적 업데이트, 레이아웃 안정성 유지
- `ChatSidebar`: 대화 히스토리 + 검색

---

### 3. 실시간 대시보드 UI (Mission Control)

#### 3.1 아키텍처 패턴

**레이아웃 구조**
- 그리드 기반 멀티 패널 아키텍처 (28-31개 모듈화 패널)
- 카드 컴포넌트 기반 모듈 시스템
- 반응형: 단일 컬럼(모바일) → 다중 컬럼(데스크탑) Tailwind 브레이크포인트

**패널 카테고리**
1. **Overview**: 에이전트 상태 요약, 활성 태스크 카운터, 비용 현황
2. **Agent Monitor**: 에이전트별 상태(등록/활성/유휴/완료), 하트비트, 라이프사이클
3. **Task Board**: 칸반 보드 (inbox → assigned → in-progress → review → done)
4. **Activity Log**: 실시간 이벤트 피드, 레벨별 필터(info/warn/error), 세션 검사기
5. **Token/Cost**: 모델별 토큰 사용량, 트렌드 차트, 비용 분석, 예산 알림
6. **Pipeline**: 워크플로우 단계 시각화, 의존성 그래프

**실시간 업데이트 기술**
- WebSocket + SSE(Server-Sent Events) 푸시 업데이트
- 비활성 탭 감지 시 스마트 폴링으로 전환 (리소스 절약)
- 모든 변경사항(태스크 이동, 에이전트 업데이트, 댓글, 로그)이 연결된 모든 클라이언트에 즉시 반영
- 재연결 로직: 네트워크 불안정 시 자동 재연결 + 미스된 이벤트 재전송

#### 3.2 시각적 디자인 패턴

**컬러 시스템 (다크 테마 기반)**
```css
/* Mission Control 스타일 컬러 팔레트 */
--void-cyan: #00D4FF;      /* 주요 액션, 활성 상태 */
--void-mint: #00FF9F;      /* 성공, 완료 상태 */
--void-violet: #9B59FF;    /* 보조 액션, 에이전트 구분 */
--void-amber: #FFB800;     /* 경고, 검토 필요 */
--void-red: #FF4757;       /* 에러, 실패 상태 */

/* 배경 레이어 */
--bg-primary: #0A0A0F;     /* 최심층 배경 */
--bg-secondary: #12121A;   /* 카드 배경 */
--bg-tertiary: #1A1A26;    /* 호버 상태 */

/* 텍스트 */
--text-primary: #E2E8F0;   /* 주요 텍스트 */
--text-muted: #94A3B8;     /* 보조 텍스트 */
--text-mono: font-mono;    /* 타임스탬프, 코드, 기술 레이블 */
```

**상태 인디케이터**
- 라이브 도트: 실시간 연결 상태 (녹색 펄스 애니메이션)
- 연결 상태 뱃지: connected/disconnected/reconnecting
- 에이전트 상태 뱃지: active/idle/error/completed
- 진행률 바: 선형 그라디언트 (cyan-to-violet)

**카드 디자인**
```css
/* 카드 기본 스타일 */
border: 1px solid hsl(var(--border) / 0.7);
border-radius: var(--radius-lg);
background: hsl(var(--secondary) / 0.3);

/* 주요 컨트롤 표면 글로우 효과 */
box-shadow: 0 0 20px hsl(var(--void-cyan) / 0.15);
```

**타이포그래피 계층**
- 섹션 레이블: 대문자 + 자간 넓게 (`uppercase tracking-wider`)
- 세미볼드 헤딩 → 일반 본문 → 연한 보조 텍스트
- 기술 데이터(타임스탬프, 토큰 수, 비용): 모노스페이스 폰트

#### 3.3 비용/토큰 모니터링 UI

**표시 항목**
- 실시간 토큰 소비량 (입력/출력 분리 표시)
- 모델별 단가 계산 → 현재 세션 비용
- 번 레이트 (초당 토큰): 현재 속도 시각화
- 예산 임계값 알림: 50%/80%/100% 단계별 경고
- 트렌드 차트: 시간대별 사용량 히스토그램

**구현 레퍼런스**
- Claude Code Usage Monitor: Rich UI, WCAG 준수 컬러 프로그레스 바, 멀티 레벨 알림
- OpenCode Monitor: 모델별 가격 실시간 계산, 인터랙티브 CLI UI

---

### 4. 3-패널 코드 에디터 레이아웃

#### 4.1 표준 3-패널 구조

```
┌─────────────────────────────────────────────────────┐
│  Header: 프로젝트명 | 상태 | 배포 | 설정             │
├────────────┬──────────────────────┬──────────────────┤
│            │                      │                  │
│  File Tree │    Code Editor       │   Live Preview   │
│  (20%)     │    (40%)             │   (40%)          │
│            │                      │                  │
│  - 폴더    │  Monaco Editor       │  iframe/         │
│  - 파일    │  구문 하이라이팅      │  WebContainer    │
│  - 탭      │  AI 인라인 제안      │                  │
│            │                      │  디바이스 토글   │
├────────────┴──────────────────────┴──────────────────┤
│  Chat Input / Command Bar                           │
└─────────────────────────────────────────────────────┘
```

#### 4.2 패널 리사이즈 메커니즘

**드래그 핸들**
- 패널 간 경계에 4-8px 드래그 영역
- 호버 시 시각적 강조 (배경색 변화 + 커서 변경 `col-resize`)
- 더블클릭: 패널 최대화/복원
- 최소 너비: 파일 트리 160px, 에디터 280px, 프리뷰 300px

**상태 저장**
- localStorage에 패널 비율 저장 → 세션 복원
- URL 파라미터로 특정 레이아웃 공유 가능

**반응형 동작**
- 1280px 이상: 3패널 풀 레이아웃
- 768px-1280px: 파일 트리 접기 (토글 버튼), 에디터+프리뷰 2패널
- 768px 미만: 탭 기반 단일 패널 (File/Code/Preview 탭 전환)

#### 4.3 라이브 프리뷰 기능

**디바이스 시뮬레이션**
- 데스크탑 (기본) / 태블릿 / 모바일 프리셋
- 커스텀 해상도 입력
- 가로/세로 방향 전환

**인터랙션 모드**
- 프리뷰 내 요소 클릭 → 해당 소스 코드로 에디터 포커스
- 비주얼 편집 모드: 프리뷰 요소 선택 → 사이드바에서 속성 수정 (Cursor 패턴)
- 콘솔 로그 하단 패널 표시

**프레임워크 통합**
- Next.js: Hot Module Replacement (HMR)으로 저장 즉시 반영
- Bolt.new: StackBlitz WebContainer로 실제 빌드 환경 구동

#### 4.4 파일 트리 디자인

```
src/
├── app/
│   ├── page.tsx          [수정됨] ●
│   └── layout.tsx
├── components/
│   ├── ui/               [shadcn]
│   └── custom/
└── lib/
    └── utils.ts
```

- 파일 상태 뱃지: 수정됨(●), 새 파일(+), 삭제(─)
- 검색 바: Ctrl+P 단축키 퀵 오픈
- 컨텍스트 메뉴: 우클릭 → 이름변경/삭제/복사경로
- shadcn/ui 컴포넌트 디렉토리 시각적 구분

---

### 5. 디자인 시스템 구성

#### 5.1 TailwindCSS v4 + shadcn/ui 아키텍처

**TailwindCSS v4 핵심 변화**
- CSS-first 설정: `tailwind.config.js` 대신 `globals.css`의 `@theme` 디렉티브
- 모든 디자인 토큰이 CSS 변수로 자동 노출
- `@theme` vs `:root` 구분: `@theme`는 유틸리티 클래스 생성, `:root`는 일반 CSS 변수

```css
/* globals.css - TailwindCSS v4 테마 구조 */
@theme {
  /* YHAI 프라이머리 컬러 */
  --color-primary: oklch(0.65 0.22 250);
  --color-primary-foreground: oklch(0.99 0 0);

  /* 에이전트별 색상 */
  --color-agent-architect: oklch(0.65 0.22 250);  /* 파랑 */
  --color-agent-developer: oklch(0.65 0.22 145);  /* 초록 */
  --color-agent-reviewer: oklch(0.65 0.22 50);    /* 주황 */
  --color-agent-designer: oklch(0.65 0.22 320);   /* 분홍 */

  /* 시맨틱 컬러 */
  --color-success: oklch(0.65 0.22 145);
  --color-warning: oklch(0.75 0.18 80);
  --color-destructive: oklch(0.55 0.25 20);

  /* 스페이싱 스케일 */
  --spacing-chat-input: 4rem;
  --spacing-panel-min: 10rem;
}

/* 라이트/다크 테마 전환 */
:root { --bg-base: oklch(0.99 0 0); }
.dark { --bg-base: oklch(0.09 0.01 250); }
```

**shadcn/ui new-york 스타일 확장**
- Base Color: Zinc (YHAI의 중성 배경에 적합)
- 커스텀 컴포넌트 레지스트리 활용 (Kibo UI, prompt-kit 등)
- 컴포넌트 추가: `npx shadcn@latest add [component]`
- 60+ 커뮤니티 테마 활용 가능 (tweakcn.com, shadcnstudio.com)

#### 5.2 컬러 팔레트

**라이트 모드**
```
Background:  #FFFFFF / #F8FAFC
Surface:     #F1F5F9 / #E2E8F0
Border:      #CBD5E1
Text:        #0F172A / #475569 / #94A3B8
Primary:     #6366F1 (Indigo 500)  ← YHAI 브랜드 제안
```

**다크 모드 (권장 - AI 빌더 산업 표준)**
```
Background:  #0A0A0F / #12121A
Surface:     #1A1A26 / #1E1E2E
Border:      rgba(255,255,255,0.1)
Text:        #E2E8F0 / #94A3B8 / #475569
Primary:     #818CF8 (Indigo 400 - 다크모드 밝기 조정)
Accent:      #00D4FF (Cyan - Mission Control 강조)
```

**에이전트 색상 시스템**
| 에이전트 역할 | 라이트 | 다크 | 용도 |
|------------|--------|------|------|
| Architect | #3B82F6 | #60A5FA | 기획/설계 에이전트 |
| Developer | #10B981 | #34D399 | 코드 생성 에이전트 |
| Designer | #EC4899 | #F472B6 | UI/디자인 에이전트 |
| Reviewer | #F59E0B | #FBBF24 | 검토/QA 에이전트 |
| DevOps | #8B5CF6 | #A78BFA | 배포/인프라 에이전트 |

#### 5.3 타이포그래피

```css
@theme {
  /* 폰트 패밀리 */
  --font-sans: 'Geist', 'Inter', system-ui, sans-serif;
  --font-mono: 'Geist Mono', 'JetBrains Mono', monospace;

  /* 스케일 */
  --text-xs: 0.75rem;      /* 뱃지, 타임스탬프 */
  --text-sm: 0.875rem;     /* 보조 텍스트, 코드 */
  --text-base: 1rem;       /* 본문, 채팅 메시지 */
  --text-lg: 1.125rem;     /* 서브헤딩 */
  --text-xl: 1.25rem;      /* 섹션 제목 */
  --text-2xl: 1.5rem;      /* 페이지 제목 */
}
```

- 코드/기술 데이터: 모노스페이스 폰트 일관 적용
- 에이전트 로그, 타임스탬프, 토큰 카운트: `font-mono text-xs`
- 채팅 메시지: `font-sans text-base leading-relaxed`

#### 5.4 컴포넌트 패턴

**핵심 컴포넌트 목록**
```
shadcn/ui 기본:
- Button, Input, Textarea, Badge, Card
- Dialog, Sheet (모바일 채팅 패널)
- Separator, ScrollArea, Avatar
- Tooltip, Popover, DropdownMenu
- Progress, Skeleton (로딩 상태)
- Tabs (에디터/프리뷰 전환)

YHAI 커스텀:
- AgentAvatar (에이전트별 색상 + 아이콘)
- StreamingMessage (실시간 텍스트 렌더링)
- BuildProgressBar (단계별 진행률)
- TokenCounter (실시간 비용 표시)
- PanelResizer (드래그 핸들)
- FileTree (파일 탐색기)
- LivePreview (iframe + 디바이스 시뮬레이터)
```

---

### 6. 접근성 + 반응형 디자인

#### 6.1 WCAG 2.1 AA 준수 요구사항

**법적 의무 (2025-2026)**
- EU 접근성법(European Accessibility Act): 2025년 6월 28일 발효
- EU에서 제품/서비스 제공 시 WCAG 2.1 AA 이상 의무화
- ADA, Section 508도 WCAG 2.2 권장

**핵심 준수 항목**

| 기준 | 요구사항 | YHAI 적용 |
|------|---------|-----------|
| 색상 대비 | 일반 텍스트 4.5:1, 큰 텍스트 3:1 | 다크 테마 컬러 토큰 검증 필수 |
| 키보드 탐색 | 모든 UI 컨트롤 키보드만으로 조작 가능 | Tab 포커스 트랩 방지, Escape 닫기 |
| 포커스 표시 | 명확한 포커스 링 (2px 이상) | shadcn/ui 기본 focus-visible 링 유지 |
| 타겟 크기 | 최소 24×24px (WCAG 2.2: 24×24px) | 터치 타겟 44×44px 권장 |
| 대체 텍스트 | 이미지에 alt 속성 필수 | 에이전트 아바타, 상태 아이콘 모두 |
| 화면 확대 | 400% 확대 시 가로 스크롤 없이 읽기 가능 | 반응형 레이아웃 필수 |
| 오류 식별 | 에러 메시지에 텍스트로 설명 | 폼 검증 에러, API 실패 메시지 |
| 언어 선언 | `<html lang="ko">` 명시 | HTML 레이아웃에 적용 |

**WCAG 2.2 추가 기준 (권장)**
- 드래그 동작 대안: 드래그로만 수행 가능한 기능에 키보드 대안 제공
- 반복 입력 최소화: 동일 정보 재입력 방지 (자동완성, 히스토리 활용)
- 포커스 외관: 포커스 인디케이터가 배경과 3:1 이상 대비

#### 6.2 키보드 내비게이션 구조

```
전역 단축키:
  Ctrl+K         → 명령어 팔레트 (Quick Open)
  Ctrl+P         → 파일 빠른 열기
  Ctrl+Enter     → 채팅 전송
  Escape         → 모달/패널 닫기
  Tab/Shift+Tab  → 포커스 순환

에디터 단축키:
  Ctrl+S         → 저장 + 프리뷰 갱신
  Ctrl+Z/Y       → 실행취소/재실행
  Ctrl+/         → 라인 주석 토글

채팅 단축키:
  ↑/↓           → 이전/다음 메시지 히스토리
  Ctrl+L         → 채팅 초기화
```

**포커스 관리**
- 모달 열릴 때 첫 번째 인터랙티브 요소로 포커스 이동
- 모달 닫힐 때 트리거 요소로 포커스 복귀
- 무한 스크롤/가상 리스트: ARIA 라이브 리전으로 새 메시지 알림

#### 6.3 반응형 브레이크포인트 전략

**YHAI 브레이크포인트 (TailwindCSS v4)**
```css
@theme {
  --breakpoint-sm: 640px;   /* 모바일 가로 */
  --breakpoint-md: 768px;   /* 태블릿 세로 */
  --breakpoint-lg: 1024px;  /* 태블릿 가로 */
  --breakpoint-xl: 1280px;  /* 데스크탑 */
  --breakpoint-2xl: 1536px; /* 대형 모니터 */
}
```

**화면 크기별 레이아웃**

| 화면 크기 | 레이아웃 | 핵심 변경사항 |
|----------|---------|-------------|
| < 640px (모바일) | 단일 패널 | 탭으로 Chat/Preview 전환, 하단 입력 바 고정 |
| 640-1024px (태블릿) | 2패널 | 채팅+프리뷰, 파일 트리 사이드 서랍 |
| > 1024px (데스크탑) | 3패널 | 파일트리+에디터+프리뷰 풀 레이아웃 |
| > 1536px (와이드) | 3패널+ | 추가 패널 또는 넓어진 프리뷰 |

**모바일 최적화 패턴**
- 채팅 입력: `position: fixed; bottom: 0` + safe-area-inset 대응 (iOS 노치)
- 터치 스크롤: `overflow-scroll; -webkit-overflow-scrolling: touch`
- 스와이프 제스처: 좌우 스와이프로 패널 전환
- 프리뷰 모드: 모바일에서는 기본 모바일 뷰포트로 표시

---

## 경쟁사 UI/UX 비교표

| 서비스 | 레이아웃 구조 | 채팅 UI | 코드 에디터 | 프리뷰 | 디자인 품질 | 차별점 |
|--------|-------------|--------|------------|--------|-----------|--------|
| **Bolt.new** | 3패널 (파일트리+에디터+프리뷰) | 하단 입력 바 | Monaco Editor, 전체 IDE | WebContainer 실시간 | 보통 (불일관) | 실제 Node.js 환경 |
| **Lovable** | 2패널 (채팅+프리뷰, 코드 토글) | 좌측 사이드바 채팅 | 코드 보기 토글 | React 앱 프리뷰 | 높음 (일관된 컴포넌트) | 풀스택 자동화 |
| **v0.dev** | 채팅+컴포넌트 프리뷰 | 상단 채팅 입력 | 코드 탭 전환 | shadcn/ui 렌더링 | 최상 (프로덕션 레디) | 컴포넌트 단위 생성 |
| **Cursor** | IDE + 브라우저 통합 | 사이드바 AI 채팅 | VSCode 기반 전체 IDE | 내장 브라우저 | 최상 (코드 품질) | 비주얼 에디터 통합 |
| **Replit Agent** | 파일트리+에디터+채팅 | 채팅 패널 | 코드 에디터 | 웹 프리뷰 | 보통 | 다언어 지원 |
| **YHAI (목표)** | 3패널 + Mission Control | 멀티에이전트 채팅 | 코드 뷰 | 라이브 프리뷰 | 최상 | 전문가 에이전트 협업 |

---

## YHAI에 대한 시사점

### 디자인 전략

1. **산업 표준 3패널 채택 필수**: 파일 트리 + 코드/에디터 + 라이브 프리뷰 구조는 AI 빌더 산업 표준으로 확립됐다. 사용자 학습 곡선 최소화를 위해 이 패턴을 기본으로 채택해야 한다.

2. **멀티 에이전트 시각화는 YHAI의 핵심 차별점**: 경쟁사는 단일 AI 채팅 인터페이스인 반면, YHAI는 여러 전문가 에이전트가 협업하는 구조다. 에이전트별 고유 색상/아바타, 실시간 상태 표시, 에이전트 간 핸드오프 시각화가 핵심 UX가 되어야 한다.

3. **Mission Control은 YHAI만의 독보적 UI**: 빌드 진행률, 에이전트 활동 로그, 실시간 비용 모니터링을 통합한 Mission Control 화면은 경쟁사에 없는 강력한 차별점이다. 사이버펑크/다크 테마 + 실시간 업데이트로 전문적 이미지를 강화해야 한다.

4. **다크 테마 우선 + 라이트 토글**: AI 빌더 산업에서 다크 테마가 사실상 기본값이다. YHAI도 다크 테마를 기본으로 하되, 라이트 테마를 완전히 지원해야 한다.

5. **TailwindCSS v4 CSS 변수 아키텍처 활용**: `@theme` 디렉티브 + CSS 변수로 에이전트별 색상, 빌드 상태 색상 등을 토큰화하면 일관된 테마 시스템과 런타임 테마 전환이 용이하다.

### 즉시 적용 권장사항

- **prompt-kit 라이브러리 도입**: shadcn/ui 기반 채팅 컴포넌트 세트로 개발 속도를 높인다
- **streamed 응답 UI**: TTFT 800ms 이하 목표로 `thinking...` 인디케이터 즉시 표시 (300ms 이내)
- **에이전트 색상 시스템**: 5개 에이전트 역할별 색상 토큰을 CSS 변수로 정의하고 전역 적용
- **패널 리사이저 구현**: `react-resizable-panels` 라이브러리 활용 (shadcn/ui 권장 패턴)
- **EU 접근성법 준수**: 컬러 대비 4.5:1 이상, 키보드 탐색, ARIA 레이블 처음부터 적용

### 위험 요소

- **복잡한 3패널 레이아웃의 모바일 대응**: 모바일에서 기능 저하 없는 UX 설계에 추가 공수 필요
- **실시간 업데이트 + 스트리밍 동시 처리**: WebSocket + SSE + 스트리밍 텍스트를 동시 렌더링할 때 성능 이슈 가능성
- **에이전트 색상 과다 사용**: 5개 이상 에이전트가 동시에 표시될 때 색상 혼돈 방지 필요

---

## 참고 자료

- [Lovable vs Bolt.new vs v0: Best AI App Builder in 2026 - Particula Tech](https://particula.tech/blog/lovable-vs-bolt-vs-v0-ai-app-builders)
- [Bolt.new - AI Web App Builder Review - Refine](https://refine.dev/blog/bolt-new-ai/)
- [Design Patterns For AI Interfaces - Smashing Magazine](https://www.smashingmagazine.com/2025/07/design-patterns-ai-interfaces/)
- [UI/UX & Human-AI Interaction Patterns - Agentic Design](https://agentic-design.ai/patterns/ui-ux-patterns)
- [UI Design for AI Agents - Fuselab Creative](https://fuselabcreative.com/ui-design-for-ai-agents/)
- [Agentic Chat UI - CopilotKit Docs](https://docs.copilotkit.ai/agentic-chat-ui)
- [Chat UI Components for AI Apps - prompt-kit](https://www.prompt-kit.com/chat-ui)
- [A Visual Editor for the Cursor Browser - Cursor Blog](https://cursor.com/blog/browser-visual-editor)
- [Mission Control - Open-Source Agent Orchestration Dashboard](https://mc.builderz.dev/)
- [GitHub: builderz-labs/mission-control](https://github.com/builderz-labs/mission-control)
- [Theming - shadcn/ui Official Docs](https://ui.shadcn.com/docs/theming)
- [TailwindCSS v4.0 Release Notes](https://tailwindcss.com/blog/tailwindcss-v4)
- [Design Tokens That Scale in 2026 (Tailwind v4) - Mavik Labs](https://www.maviklabs.com/blog/design-tokens-tailwind-v4-2026)
- [WCAG 2.2 Complete Compliance Guide 2025 - AllAccessible](https://www.allaccessible.org/blog/wcag-22-complete-guide-2025)
- [16 Chat UI Design Patterns That Work in 2025 - Bricx Labs](https://bricxlabs.com/blogs/message-screen-ui-deisgn)
- [7 Best UI Frameworks for AI Agents 2026 - Fast.io](https://fast.io/resources/best-ui-frameworks-ai-agents/)
- [Introducing A2UI: Agent-Driven Interfaces - Google Developers Blog](https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/)
- [Lovable vs Bolt vs V0: Which AI App Builder Wins in 2026 - Tooljet Blog](https://blog.tooljet.com/lovable-vs-bolt-vs-v0/)
- [Cursor Launches Visual Editor - Humai Blog](https://www.humai.blog/cursor-launches-visual-editor-a-game-changer-for-design-to-code-workflows/)
