# 환각 방지 태깅 시스템

모든 기술적 진술에 다음 태그를 사용합니다.

## 태그 정의

| 태그 | 의미 | 사용 조건 |
|------|------|----------|
| `[FACT]` | 공식 문서로 확인된 사실 | 공식 문서, GitHub 리포, 릴리즈 노트에서 직접 확인 |
| `[INFERENCE]` | 사실 기반 추론 | FACT에서 논리적으로 도출한 결론 |
| `[UNCERTAIN]` | 검증 필요한 추측 | 확인할 수 없거나 문서가 불명확한 경우 |
| `[ASSUMPTION]` | 가정 (명시적 표시) | 검증 없이 전제로 사용하는 조건 |
| `[VERIFIED]` | 직접 검증 완료 | WebFetch/Context7로 공식 문서 확인 |
| `[ALTERNATIVE]` | 발견된 대안 기술/방법 | 문제 해결을 위한 대안 제시 |
| `[LIMITATION]` | 확인된 제약사항 | 공식 문서에서 확인된 한계 |

## 사용 예시

```
[FACT] Next.js 15는 Server Actions를 지원함
[INFERENCE] 따라서 폼 처리가 서버사이드에서 가능함
[UNCERTAIN] Instagram API의 업로드 기능 범위 (검증 필요)
[ASSUMPTION] 사용자가 OAuth 인증을 완료했다고 가정
[ALTERNATIVE] Instagram API 대신 Cloudinary를 이미지 관리에 사용 가능
```

## 금지 표현

- "아마", "보통", "일반적으로" 등 애매한 표현 금지
- 확인 없이 "지원 안 함" 또는 "지원함" 단언 금지
- 추측을 확정적 사실로 표현 금지
