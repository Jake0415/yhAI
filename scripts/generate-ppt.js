#!/usr/bin/env node
/**
 * YHAI 기획 요약 PPT 생성 스크립트
 * Usage: node scripts/generate-ppt.js [--output path/to/output.pptx]
 */

const PptxGenJS = require("pptxgenjs");
const path = require("path");

const OUTPUT = process.argv.includes("--output")
  ? process.argv[process.argv.indexOf("--output") + 1]
  : path.resolve(__dirname, "..", "docs", "planning", "YHAI-기획-요약.pptx");

// 색상 팔레트
const C = {
  primary: "1a56db",
  secondary: "6366f1",
  accent: "06b6d4",
  dark: "1e293b",
  light: "f8fafc",
  white: "ffffff",
  gray: "64748b",
  green: "22c55e",
  orange: "f59e0b",
  red: "ef4444",
};

function addSlide(pptx, { title, subtitle, body, notes }) {
  const slide = pptx.addSlide();

  // 상단 바
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: "100%", h: 0.08, fill: { color: C.primary },
  });

  // 제목
  slide.addText(title, {
    x: 0.5, y: 0.3, w: 9, h: 0.6,
    fontSize: 24, fontFace: "맑은 고딕", bold: true, color: C.dark,
  });

  // 부제
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5, y: 0.85, w: 9, h: 0.35,
      fontSize: 13, fontFace: "맑은 고딕", color: C.gray, italic: true,
    });
  }

  // 본문
  if (body) {
    const yStart = subtitle ? 1.3 : 1.0;
    slide.addText(body, {
      x: 0.5, y: yStart, w: 9, h: 5.7 - yStart,
      fontSize: 12, fontFace: "맑은 고딕", color: C.dark,
      valign: "top", lineSpacingMultiple: 1.3,
    });
  }

  // 페이지 번호
  slide.addText("YHAI 기획 요약", {
    x: 0.5, y: 7.0, w: 4, h: 0.3, fontSize: 8, color: C.gray,
  });

  if (notes) slide.addNotes(notes);
  return slide;
}

function addTableSlide(pptx, { title, subtitle, headers, rows, colW }) {
  const slide = pptx.addSlide();

  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: "100%", h: 0.08, fill: { color: C.primary },
  });

  slide.addText(title, {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: 22, fontFace: "맑은 고딕", bold: true, color: C.dark,
  });

  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5, y: 0.75, w: 9, h: 0.3,
      fontSize: 12, fontFace: "맑은 고딕", color: C.gray, italic: true,
    });
  }

  const yStart = subtitle ? 1.15 : 0.95;
  const tableRows = [
    headers.map((h) => ({
      text: h, options: { bold: true, color: C.white, fontSize: 11, fontFace: "맑은 고딕" },
    })),
    ...rows.map((row) =>
      row.map((cell) => ({
        text: cell, options: { fontSize: 10, fontFace: "맑은 고딕", color: C.dark },
      }))
    ),
  ];

  slide.addTable(tableRows, {
    x: 0.5, y: yStart, w: 9,
    colW: colW || undefined,
    border: { type: "solid", pt: 0.5, color: "cbd5e1" },
    rowH: 0.35,
    autoPage: false,
    headerRow: true,
    color: C.dark,
    fill: { color: C.light },
    altColor: C.white,
    headerFill: { color: C.primary },
  });

  slide.addText("YHAI 기획 요약", {
    x: 0.5, y: 7.0, w: 4, h: 0.3, fontSize: 8, color: C.gray,
  });

  return slide;
}

function buildPresentation() {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "YHAI 기획팀";
  pptx.title = "YHAI - AI 웹사이트 자동 빌드 플랫폼 기획 요약";

  // ===== 1. 타이틀 슬라이드 =====
  const s1 = pptx.addSlide();
  s1.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: "100%", h: "100%", fill: { color: C.primary },
  });
  s1.addText("YHAI", {
    x: 1, y: 1.5, w: 8, h: 1.2,
    fontSize: 54, fontFace: "맑은 고딕", bold: true, color: C.white,
  });
  s1.addText("AI 웹사이트 자동 빌드 플랫폼", {
    x: 1, y: 2.6, w: 8, h: 0.7,
    fontSize: 28, fontFace: "맑은 고딕", color: "93c5fd",
  });
  s1.addText("기획 요약 보고서", {
    x: 1, y: 3.3, w: 8, h: 0.5,
    fontSize: 18, fontFace: "맑은 고딕", color: "bfdbfe",
  });
  s1.addText("2026년 3월 14일 | YHAI 기획팀", {
    x: 1, y: 5.5, w: 8, h: 0.4,
    fontSize: 14, fontFace: "맑은 고딕", color: "93c5fd",
  });

  // ===== 2. 서비스 개요 =====
  addSlide(pptx, {
    title: "서비스 개요",
    subtitle: "YHAI가 해결하는 문제와 핵심 가치",
    body: [
      { text: "비전\n", options: { bold: true, fontSize: 14, color: C.primary } },
      { text: "사용자가 AI와 대화하며 원하는 서비스를 설명하면,\n요구사항 자동 정리 → AI 에이전트 팀 자동 생성 → 풀스택 코드 + 자동 배포\n\n", options: {} },
      { text: "핵심 차별화\n", options: { bold: true, fontSize: 14, color: C.primary } },
      { text: "• 도메인 전문가 시스템: AI 전문가가 자동 초빙되어 함께 대화\n", options: {} },
      { text: "• PM Agent 동적 팀 생성: 복잡도에 맞는 에이전트 팀 자동 구성\n", options: {} },
      { text: "• 코파일럿 빌드: 빌드 중 실시간 개입 가능\n", options: {} },
      { text: "• 사고 과정 스트리밍: AI 팀의 의사결정 과정을 투명하게 공개\n\n", options: {} },
      { text: "타겟 사용자\n", options: { bold: true, fontSize: 14, color: C.primary } },
      { text: "• 창업 기획자 (비개발 직군, MVP 빌드)\n", options: {} },
      { text: "• 1인 개발자 (보일러플레이트 자동화)\n", options: {} },
      { text: "• 소상공인 (IT 비전문가, 쉬운 웹사이트 구축)", options: {} },
    ],
  });

  // ===== 3. 전체 서비스 흐름 =====
  addSlide(pptx, {
    title: "전체 서비스 흐름",
    subtitle: "사용자 대화 → AI 팀 빌드 → 자동 배포",
    body: [
      { text: "① 온보딩\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: '   "무엇을 만들고 싶으세요?" → 유사 사례 카드 제시 → 초기 컨텍스트 강화\n\n', options: {} },
      { text: "② 전문가 대화 (티키타카)\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "   도메인 자동 감지 → 전문가 추천 → 멀티 전문가 동시 참여 대화\n\n", options: {} },
      { text: "③ 요구사항 자동 추출\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "   대화에서 기능/디자인/기술 요구사항 자동 정리 → 사용자 확인/수정\n\n", options: {} },
      { text: "④ AI 팀 자동 생성 (PM Agent)\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "   복잡도 분석 → 적정 팀 규모 결정 → 역할 배정 → Phase 분해\n\n", options: {} },
      { text: "⑤ 병렬 빌드 실행\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "   Git Worktree 격리 → Frontend + Backend 병렬 → QA 테스트\n\n", options: {} },
      { text: "⑥ 미리보기 + 배포\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "   3-패널 미리보기 → 포인트&토크 수정 → Vercel 자동 배포 (2-8분)", options: {} },
    ],
  });

  // ===== 4. 기술 스택 =====
  addTableSlide(pptx, {
    title: "기술 스택",
    subtitle: "확정된 기술 선택과 근거",
    headers: ["영역", "기술", "선택 근거"],
    colW: [1.5, 3.5, 4],
    rows: [
      ["Frontend", "Next.js 15.5 + React 19 + TailwindCSS v4 + shadcn/ui", "App Router, Turbopack, 최신 React 기능"],
      ["Backend", "NestJS + TypeScript", "프론트와 TS 공유, WebSocket/SSE 내장"],
      ["DB", "Supabase (PostgreSQL + Auth + Storage + Realtime)", "올인원 BaaS, RLS 멀티테넌트"],
      ["배포", "Vercel (REST API 파일 업로드)", "Next.js 네이티브 배포, Git 불필요"],
      ["AI 엔진", "Claude API + Claude Agent SDK", "채팅(Haiku) + 오케스트레이션(Opus+Sonnet)"],
      ["실시간", "SSE (채팅) + Supabase Realtime (빌드)", "하이브리드: 스트리밍 + 이벤트"],
      ["개발 자동화", "Claude Code Agent Teams + Git Worktree", "에이전트 병렬 실행, 파일 격리"],
    ],
  });

  // ===== 5. 사용자 시나리오 요약 =====
  addTableSlide(pptx, {
    title: "사용자 시나리오 (Plan 1)",
    subtitle: "5개 핵심 시나리오 + 차별화 아이디어",
    headers: ["#", "시나리오", "페르소나", "핵심 흐름"],
    colW: [0.5, 2.5, 1.5, 4.5],
    rows: [
      ["1", "첫 프로젝트 온보딩", "창업 기획자", "인텐트 캡처 → 전문가 자동 초빙 → 가이디드 대화"],
      ["2", "전문가 대화 & 요구사항 정리", "창업 기획자", "멀티 전문가 동시 참여 → 요구사항 카드 자동 정리"],
      ["3", "AI 팀 빌드 & 코파일럿", "1인 개발자", "PM Agent 동적 팀 → Phase 빌드 → 실시간 개입"],
      ["4", "미리보기 & 수정", "소상공인", "3-패널 미리보기 → 포인트&토크 수정 → 즉시 반영"],
      ["5", "배포 & 후속 관리", "전체", "원클릭 배포 → 커스텀 도메인 → 코드 다운로드"],
    ],
  });

  // ===== 6. 차별화 아이디어 =====
  addSlide(pptx, {
    title: "창의적 차별화 아이디어 (7개)",
    subtitle: "경쟁사 대비 YHAI만의 독창적 기능",
    body: [
      { text: "1. 코파일럿 빌드", options: { bold: true, color: C.secondary } },
      { text: " — 빌드 중 실시간 방향 전환 가능\n", options: {} },
      { text: "2. 사고 과정 스트리밍", options: { bold: true, color: C.secondary } },
      { text: " — AI 팀의 의사결정 과정 투명 공개\n", options: {} },
      { text: "3. 전문가 디베이트", options: { bold: true, color: C.secondary } },
      { text: " — 서로 다른 관점의 전문가가 토론 → 최적 설계\n", options: {} },
      { text: "4. 브랜치 빌드", options: { bold: true, color: C.secondary } },
      { text: " — 두 가지 방향을 동시에 빌드 → 비교 선택\n", options: {} },
      { text: "5. A/B 빌드", options: { bold: true, color: C.secondary } },
      { text: " — 디자인 시안 2개를 동시 생성 → A/B 테스트\n", options: {} },
      { text: "6. 빌드 리플레이", options: { bold: true, color: C.secondary } },
      { text: " — 빌드 과정을 타임라인으로 재생 (마케팅 활용)\n", options: {} },
      { text: "7. 스냅샷 포크", options: { bold: true, color: C.secondary } },
      { text: " — 갤러리에서 다른 프로젝트를 포크하여 커스터마이징\n", options: {} },
    ],
  });

  // ===== 7. 정보 아키텍처 요약 =====
  addSlide(pptx, {
    title: "정보 아키텍처 (Plan 2)",
    subtitle: "사이트맵, 화면 구조, 데이터 모델",
    body: [
      { text: "사이트맵 (4개 영역, 25+ 페이지)\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "• 퍼블릭: 랜딩, 요금제, 갤러리, 도움말\n", options: {} },
      { text: "• 인증: 로그인, 회원가입, OAuth, 비밀번호 찾기\n", options: {} },
      { text: "• 포탈: 대시보드, 프로젝트(7개 탭), 설정\n", options: {} },
      { text: "• 관리자: 사용자/프로젝트/전문가/통계\n\n", options: {} },
      { text: "프로젝트 7개 탭 (핵심 화면)\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "채팅 → 요구사항 → AI 팀 → 빌드(Mission Control) → 미리보기 → 배포 → 설정\n\n", options: {} },
      { text: "데이터 모델\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "• 20+ 테이블 (User, Project, Conversation, Message, Agent, Task, Phase 등)\n", options: {} },
      { text: "• 프로젝트 상태 머신 8단계: CREATED → CHATTING → REQUIREMENTS → TEAM_READY → BUILDING → PREVIEW → DEPLOYED → ARCHIVED\n\n", options: {} },
      { text: "API 엔드포인트\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "• 10개 카테고리, 50+ 엔드포인트 (인증, 프로젝트, 채팅, 전문가, 빌드, 배포 등)", options: {} },
    ],
  });

  // ===== 8. 배포/인프라 전략 =====
  addSlide(pptx, {
    title: "배포/인프라 전략",
    subtitle: "Vercel + Supabase 하이브리드 멀티테넌트",
    body: [
      { text: "배포 아키텍처\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "• Vercel REST API 파일 인라인 업로드 (Git 불필요, 2-8분)\n", options: {} },
      { text: "• Supabase: DB + Auth + Storage + Realtime 올인원\n\n", options: {} },
      { text: "멀티테넌트 전략\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "• Free/Starter: 공유 Supabase + RLS 격리 (사용자당 ~$0.50-2.00)\n", options: {} },
      { text: "• Pro 이상: 전용 Supabase 프로젝트 ($25/월/사용자)\n\n", options: {} },
      { text: "비용 구조\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "• 100명: ~$295/월  |  500명: ~$920/월  |  1,000명: ~$2,175/월\n\n", options: {} },
      { text: "요금제\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "• Free($0) / Starter($19) / Pro($49) / Business($149) / Enterprise(커스텀)\n\n", options: {} },
      { text: "주요 리스크 대응\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "• Scale-to-Zero 미지원 → 공유 RLS로 비용 분산\n", options: {} },
      { text: "• WebSocket 미지원 → Supabase Realtime + SSE\n", options: {} },
      { text: "• 서울 리전 없음 → 도쿄 리전 + Vercel Edge 캐시", options: {} },
    ],
  });

  // ===== 9. AI 에이전트 팀 구성 =====
  addSlide(pptx, {
    title: "AI 에이전트 팀 구성",
    subtitle: "Claude Code 자동화 개발 — 복잡도별 동적 팀 결정",
    body: [
      { text: "팀 구성 원칙\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: '• PM Agent = "Coordinator, Never Coder" (조율만, 코드 작성 금지)\n', options: {} },
      { text: "• Opus(리드) + Sonnet(실행) 조합 → 단일 Opus 대비 90.2% 성능 향상\n", options: {} },
      { text: "• Contract-First: TypeScript 타입 정의로 API 계약 → FE/BE 병렬 구현\n\n", options: {} },
      { text: "안 A: 3인 Lean (Low 복잡도)\n", options: { bold: true, fontSize: 12, color: C.green } },
      { text: "  PM(Opus) + Fullstack(Sonnet) + Foundation(Sonnet)\n\n", options: {} },
      { text: "안 B: 4인 Standard (Medium 복잡도) ← YHAI 기본\n", options: { bold: true, fontSize: 12, color: C.orange } },
      { text: "  PM(Opus) + Frontend(Sonnet) + Backend(Sonnet) + Quality(Sonnet)\n\n", options: {} },
      { text: "안 C: 5인 Expert (High 복잡도)\n", options: { bold: true, fontSize: 12, color: C.red } },
      { text: "  PM(Opus) + Frontend + Backend + Data + Guardian(Sonnet)\n\n", options: {} },
      { text: "빌드 파이프라인\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "Phase 0(초기화) → Phase 1(DB 스키마) → Phase 2(FE+BE 병렬)\n→ Phase 3(외부 API) → Phase 4(QA) → Phase 5(배포)", options: {} },
    ],
  });

  // ===== 10. 시스템 아키텍처 (Plan 3) =====
  addSlide(pptx, {
    title: "시스템 아키텍처 (Plan 3)",
    subtitle: "프론트엔드 / 백엔드 / AI 오케스트레이션 / 데이터베이스",
    body: [
      { text: "프론트엔드\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "• Next.js 15 App Router: Server Components(목록/레이아웃) + Client Components(채팅/빌드)\n", options: {} },
      { text: "• 상태: TanStack Query(서버) + Zustand(클라이언트) + Supabase Realtime(실시간)\n\n", options: {} },
      { text: "백엔드\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "• NestJS 모듈: auth, projects, chat, experts, team, build, deploy, billing\n", options: {} },
      { text: "• BullMQ + Upstash Redis: 에이전트 작업 큐, 위상 정렬 기반 의존성 실행\n\n", options: {} },
      { text: "AI 오케스트레이션\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "• PM Agent(Opus) → 팀 구성 → Phase 분해 → BullMQ 큐 → 에이전트(Sonnet) 병렬 실행\n", options: {} },
      { text: "• Git Worktree 파일 격리 + 메시지박스 에이전트 간 통신\n\n", options: {} },
      { text: "실시간 통신\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "• SSE: 채팅 스트리밍, PM 분석, 사고 과정\n", options: {} },
      { text: "• Supabase Realtime: 빌드 이벤트, 배포 상태, 알림\n\n", options: {} },
      { text: "보안\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "• Supabase Auth(JWT) + RLS + Rate Limiting(Upstash) + AES-256 키 암호화", options: {} },
    ],
  });

  // ===== 11. UI/UX 디자인 (Plan 4) =====
  addSlide(pptx, {
    title: "UI/UX 디자인 가이드 (Plan 4)",
    subtitle: "디자인 원칙, 핵심 화면, 인터랙션 패턴",
    body: [
      { text: "디자인 원칙 5가지\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "① 투명성 (AI 의사결정 공개) ② 점진적 공개 ③ 실시간 피드백\n④ 사용자 주도 제어 ⑤ 접근성 우선 (WCAG 2.1 AA)\n\n", options: {} },
      { text: "디자인 시스템\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "• 컬러: Indigo(Primary) + Slate(Secondary) + 전문가별 9색\n", options: {} },
      { text: "• 타이포: Pretendard + Inter | shadcn/ui (new-york style) + Radix + Lucide\n\n", options: {} },
      { text: "핵심 화면 와이어프레임 8개\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "• 랜딩(P1), 대시보드(D1), 새 프로젝트(D2), 채팅(PJ1)\n", options: {} },
      { text: "• 요구사항(PJ2), AI팀(PJ3), Mission Control(PJ4), 미리보기(PJ5)\n\n", options: {} },
      { text: "인터랙션 패턴 6가지\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "채팅 스트리밍 | 전문가 초빙 트랜지션 | 빌드 진행 애니메이션\n포인트&토크 수정 | 드래그&드롭 | 실시간 비용 카운터\n\n", options: {} },
      { text: "반응형: ", options: { bold: true, fontSize: 12, color: C.accent } },
      { text: "3-패널→2-패널→탭 전환 | 사이드바→바텀네비 | 채팅 풀스크린(모바일)", options: {} },
    ],
  });

  // ===== 12. PRD 요약 (Plan 5) =====
  addTableSlide(pptx, {
    title: "PRD 기능 요구사항 (Plan 5)",
    subtitle: "MoSCoW 분류 — Must/Should/Could/Won't Have",
    headers: ["분류", "개수", "핵심 기능"],
    colW: [1.5, 1, 6.5],
    rows: [
      ["Must Have\n(MVP)", "11개", "인증(OAuth), 프로젝트 생성, 전문가 추천/초빙, 멀티 전문가 채팅,\n요구사항 추출, PM Agent 팀 구성, AI 빌드, 미리보기, 수정, 배포, 대시보드"],
      ["Should Have\n(V1)", "6개", "코파일럿 빌드, 사고 과정 스트리밍, 비용 대시보드,\n프로젝트 재방문, 요금제(Free/Pro/Business), Stripe 결제"],
      ["Could Have\n(V2)", "5개", "전문가 디베이트, 브랜치 빌드(A/B), 빌드 리플레이,\n스냅샷 포크 갤러리, 커스텀 도메인"],
      ["Won't Have", "6개", "모바일 앱, 자체 호스팅, 코드 에디터, 팀 협업,\n백엔드 전용 생성, 기존 코드 임포트"],
    ],
  });

  // ===== 13. ROADMAP (Plan 5) =====
  addTableSlide(pptx, {
    title: "구현 로드맵 (Plan 5)",
    subtitle: "12주 타임라인 — 5 Phase + V2",
    headers: ["Phase", "기간", "핵심 내용", "완료 기준"],
    colW: [1.2, 1.2, 4, 2.6],
    rows: [
      ["Phase 0", "W1\n(1주)", "모노레포, Next.js Route Group,\nNestJS, Supabase DB, CI/CD", "npm run build 성공\nDB 마이그레이션 완료"],
      ["Phase 1\n(MVP)", "W2-W5\n(4주)", "인증, 대시보드, 전문가 채팅,\n요구사항 추출, 단일 에이전트 빌드", "전문가 대화→빌드→미리보기\nE2E 플로우 동작"],
      ["Phase 2", "W6-W8\n(3주)", "PM Agent, 동적 팀 구성,\nPhase 빌드, Git Worktree", "멀티 에이전트 빌드 성공\nMission Control UI"],
      ["Phase 3\n(V1)", "W9-W10\n(2주)", "Vercel 배포, 포인트&토크,\n프로젝트 재방문, 랜딩 페이지", "자동 배포 파이프라인\nLighthouse 90+"],
      ["Phase 4", "W11-W12\n(2주)", "요금제, Stripe 결제,\n비용 대시보드, 최종 QA", "결제 플로우 E2E\n프로덕션 배포 준비"],
      ["V2", "W13+", "빌드 리플레이, 스냅샷 포크,\n전문가 디베이트, A/B 빌드", "성장 기능 9개"],
    ],
  });

  // ===== 14. 전체 기획 완료 상태 =====
  addTableSlide(pptx, {
    title: "기획 완료 현황",
    subtitle: "Plan 1~5 전체 완료 — 총 20+ 산출물",
    headers: ["Plan", "단계", "상태", "주요 산출물"],
    colW: [0.8, 2.5, 1.5, 4.2],
    rows: [
      ["1", "서비스 시나리오 v2", "완료", "페르소나 3명, 시나리오 5개, 차별화 12개"],
      ["-", "추가 조사 3건", "완료", "Vercel+Supabase, Claude Code 자동화, 팀 구성"],
      ["2", "정보 아키텍처", "완료", "사이트맵 25+, ERD 20+, API 50+, URL 구조"],
      ["3", "시스템 아키텍처", "완료", "10개 섹션, 1,400줄 (FE/BE/AI/DB/배포/보안)"],
      ["4", "UI/UX 디자인", "완료", "와이어프레임 8개, 디자인 시스템, 인터랙션 6개"],
      ["5", "PRD + ROADMAP", "완료", "MoSCoW 28기능, 12주 로드맵, KPI 5개"],
    ],
  });

  // ===== 15. 비기능 요구사항 + KPI =====
  addSlide(pptx, {
    title: "비기능 요구사항 + 성공 지표",
    subtitle: "성능, 보안, 확장성 요구사항 및 KPI",
    body: [
      { text: "성능 요구사항\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "• 채팅 응답 첫 토큰: < 500ms | 빌드 시작: < 3초\n", options: {} },
      { text: "• API P99: < 600ms | AI 코드 생성: < 30초\n\n", options: {} },
      { text: "확장성\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "• MVP: 동시 100명 → V1: 1,000명 → V2: 10,000명\n\n", options: {} },
      { text: "보안\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "• OAuth 2.0, RLS 행 수준 격리, Rate Limiting, AES-256 키 암호화\n\n", options: {} },
      { text: "성공 지표 (KPIs)\n", options: { bold: true, fontSize: 13, color: C.primary } },
      { text: "• 프로젝트 완성률: > 60% (빌드 시작 → 배포)\n", options: {} },
      { text: "• 평균 빌드 시간: MVP < 10분, V1 < 5분\n", options: {} },
      { text: "• 유료 전환율: > 5%\n", options: {} },
      { text: "• NPS: > 30\n", options: {} },
      { text: "• MRR: V1 기준 $2,000 목표", options: {} },
    ],
  });

  // ===== 16. 다음 단계 =====
  addSlide(pptx, {
    title: "다음 단계: 구현 시작",
    subtitle: "기획 완료 → 개발 착수",
    body: [
      { text: "기획 리뷰 요청\n", options: { bold: true, fontSize: 14, color: C.primary } },
      { text: "• 본 PPT의 Plan 1~5 내용을 검토해주세요\n", options: {} },
      { text: "• 수정/보완이 필요한 부분을 알려주시면 즉시 반영하겠습니다\n\n", options: {} },
      { text: "리뷰 확인 후 구현 착수\n", options: { bold: true, fontSize: 14, color: C.green } },
      { text: "• Phase 0 (1주): 모노레포 구조, DB 스키마, CI/CD 세팅\n", options: {} },
      { text: "• Phase 1 (4주): MVP 핵심 기능 구현\n", options: {} },
      { text: "• Claude Code Agent Teams로 자동 개발 파이프라인 가동\n\n", options: {} },
      { text: "산출물 전체 목록\n", options: { bold: true, fontSize: 14, color: C.primary } },
      { text: "• docs/planning/user-scenarios.md — 서비스 시나리오\n", options: {} },
      { text: "• docs/planning/information-architecture.md — 정보 아키텍처\n", options: {} },
      { text: "• docs/planning/system-architecture.md — 시스템 아키텍처\n", options: {} },
      { text: "• docs/planning/ui-ux-design-guide.md — UI/UX 가이드\n", options: {} },
      { text: "• docs/planning/prd.md — 제품 요구사항\n", options: {} },
      { text: "• docs/planning/roadmap.md — 구현 로드맵", options: {} },
    ],
  });

  return pptx;
}

async function main() {
  console.log("PPT 생성 중...");
  const pptx = buildPresentation();
  await pptx.writeFile({ fileName: OUTPUT });
  console.log(`PPT 생성 완료: ${OUTPUT}`);
}

main().catch((err) => {
  console.error("PPT 생성 실패:", err.message);
  process.exit(1);
});
