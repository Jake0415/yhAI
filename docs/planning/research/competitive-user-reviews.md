# 경쟁사 실제 사용자 리뷰 및 불만 분석

> 조사일: 2026-03-14
> 조사자: 웹 검색 전문가 (2차 조사)

---

## 1. Lovable.dev 사용자 불만 포인트

### 1.1 "70% 문제" — 완성도의 벽
- "Lovable은 기껏해야 70%까지만 데려다 준다" — 나머지 30%에 상당한 시간 소요
- 비즈니스 로직 실패 사례: 더치페이 앱의 "정산" 버튼 잔액 계산 오류 → 수동 코드 수정 필요
- 복잡한 멀티스텝 워크플로우에서 취약

### 1.2 디버깅 지옥 루프
- AI가 버그 수정 시도 → 새로운 버그 유발 → 반복 → 크레딧 소진
- "반복적 에러 루프"와 "좌절스러운 프롬프팅 루프"에 갇히는 사용자 다수
- 사소한 코드 변경이 예상치 못한 파일에 연쇄 수정 유발 → 에러 추적 곤란

### 1.3 크레딧 비용 문제
- 크레딧이 "어떤 작업에 얼마나 들지 모르는 슬롯머신" 같다는 사용자 평가
- 무료 티어 (일 5크레딧, 월 30크레딧): 소규모 프로젝트 2-3회 반복만에 소진
- 복잡한 프롬프트가 단순 요청보다 크레딧을 훨씬 많이 소비 → 예측 불가
- AI가 "해결했다"고 한 이슈를 다시 수정하느라 크레딧 추가 소비

### 1.4 기술 종속성
- React + Supabase 고정 — Vue, Angular, 대안 백엔드 지원 없음
- 디자인이 "안전하고 표준적인 레이아웃"으로 기본 설정 → 시각적으로 독특한 앱 부적합

### 1.5 보안/데이터 미성숙
- 보안 및 데이터 처리가 "미성숙" 하다는 평가
- 민감 데이터, 결제, 규제 워크로드에 부적합

---

## 2. Bolt.new 사용자 불만 포인트

### 2.1 백엔드 부재
- 데이터베이스 미포함 — 외부 서비스 직접 연결 필요
- "프론트엔드만 있고 영속 데이터가 없는 건 제품이 아니라 데모"

### 2.2 컨텍스트 윈도우 한계
- 15개 이상 컴포넌트에서 성능 저하
- 토큰 소비 심각, 한 버그 수정이 다른 버그 유발

### 2.3 UX 미흡
- 인터페이스가 "다소 거친" 편
- 가격 대비 가치 의문 제기 사용자 존재

---

## 3. v0.dev 사용자 불만 포인트

### 3.1 프론트엔드 전용
- 백엔드/DB 생성 없음 → "아름다운 레이아웃이지만 혼자서는 아무것도 안 됨"
- 실제 로직 연결, 외부 API 연동, 백엔드 별도 배포 필요

### 3.2 가격 정책 변경 논란
- 2025년 5월 무제한 → 종량제 전환 → 개발자 커뮤니티 반발
- 크레딧 빠른 소진 불만

---

## 4. 공통 불만 패턴 (YHAI 기회 영역)

| # | 공통 불만 | 빈도 | YHAI 해결 전략 |
|---|----------|------|---------------|
| 1 | **프롬프트 품질 의존** — "거의 맞지만 정확하지 않은" 결과물 | 매우 높음 (66% 개발자) | 전문가 대화로 요구사항 정밀화 → 프롬프트 품질 격차 해소 |
| 2 | **디버깅 루프 + 크레딧 소진** | 높음 | 요구사항 사전 정의 → 첫 빌드 품질 향상 → 수정 반복 감소 |
| 3 | **블랙박스 과정** — 무슨 일이 벌어지는지 모름 | 중간 | Mission Control 대시보드 → 투명한 빌드 과정 |
| 4 | **기술 스택 종속** | 중간 | 다양한 스택 지원 (향후 확장) |
| 5 | **비즈니스 로직 실패** | 높음 | 도메인 전문가가 비즈니스 규칙 사전 검증 |
| 6 | **보안/데이터 미성숙** | 중간 | 기술 아키텍트 전문가가 보안 요구사항 사전 정의 |

---

## 5. 바이브 코딩(Vibe Coding)의 구조적 문제

### 5.1 코드 품질
- AI 공동 작성 코드에 "주요" 이슈가 인간 작성 코드 대비 **1.7배** 더 많음
- 에러 핸들링 없음, 낮은 성능, 의문스러운 보안 관행, 논리적으로 취약한 코드
- "AI 스파게티" — 기능은 하지만 구조 불량, 유지보수 불가

### 5.2 보안 취약점
- AI 생성 쿼리의 **40%**가 SQL 인젝션 공격에 취약
- 보안 체크를 서버가 아닌 클라이언트에 구현하는 경향
- 하드코딩된 API 키와 시크릿이 빈번하게 생성 코드에 포함

### 5.3 기술 부채
- 2027년까지 구조 불량 AI 생성 코드로 인한 기술 부채 **$1.5조** 예상
- 팀의 스프린트 시간 70%를 유지보수에 사용 (신규 기능 개발 아님)

### 5.4 개발자 신뢰 하락
- Stack Overflow 2025 서베이 (49,000명):
  - AI 도구 긍정 감정: 60% (2023-24년 70%+ 대비 하락)
  - AI 출력을 "매우 신뢰": **3%**
  - 적극적 불신: **46%**
  - 최대 불만 (66%): "거의 맞지만 정확하지 않은 AI 솔루션 다루기"

---

## 6. 출처

- [My Lovable.dev Review in 2026: Worth It or Credit Trap?](https://www.superblocks.com/blog/lovable-dev-review)
- [Lovable vs Bolt vs V0 (2025) honest review](https://techpoint.africa/guide/lovable-vs-bolt-vs-v0-review/)
- [Vibe Coding is not an excuse for low-quality work](https://addyo.substack.com/p/vibe-coding-is-not-an-excuse-for)
- [Why Vibe Coding Fails](https://www.ksred.com/the-vibe-coding-paradox-why-you-need-to-be-a-better-developer-not-worse/)
- [Top 5 problems with vibe coding](https://www.glideapps.com/blog/vibe-coding-risks)
- [Stack Overflow Developer Survey 2025](https://stackoverflow.blog/2025/12/29/developers-remain-willing-but-reluctant-to-use-ai-the-2025-developer-survey-results-are-here/)
- [AI Website Building: Hype vs Reality](https://wordpress.com/blog/2025/12/08/ai-website-building-hype-vs-reality/)
- [The Truth About AI Website Builders in 2026](https://www.arcticleaf.com/blog/learning-center/the-truth-about-ai-website-builders-in-2026/)
