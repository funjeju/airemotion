# ORCHESTRATOR — Driftroom 빌드 지침서

> **Driftroom** (작업용 코드네임 · 자유롭게 변경 가능): 사용자가 가진 사진·영상·음악을
> 자동으로 배열·전환·자막 처리해, 손대지 않아도 완성도 있는 영상을 빠르게 만들어 주는
> **편집 자동화 웹앱**. (영상을 새로 만드는 생성형 AI 아님 — 기존 소재를 조립·연출하는 도구.)
>
> 이 문서는 Claude Code가 **가장 먼저 읽는 진입점**입니다. 여기서 전체 그림과 규칙을 잡고,
> `docs/` 안의 세부 문서를 순서대로 참조해 단계별로 구축하세요.

---

## 0. 절대 규칙 (먼저 읽기)

1. **한 번에 전부 만들지 말 것.** `docs/06-build-phases.md`의 Phase 순서대로 구축하고,
   각 Phase의 "검증 기준"을 통과하면 다음으로 넘어간다.
2. **생성형 영상 AI를 만들지 말 것.** 픽셀을 새로 만들지 않는다. 사용자가 올린 소재만 편집한다.
3. **CapCut급 자유 타임라인 편집기를 만들지 말 것.** 범위는 "순서 + 자막 + 자동 효과"로 한정.
4. **효과는 최소·일관성.** 초기엔 전환 1~2종 + 애니메이션 3~4종만. 순수 랜덤 금지(규칙 기반 배정).
5. **API 키·시크릿은 절대 프론트엔드/깃에 노출하지 말 것.** 서버사이드 + 환경변수만.
6. **모든 사용자 문구는 i18n 메시지 카탈로그를 통할 것.** 하드코딩 텍스트 금지.
7. **다크/라이트 모드는 1급 시민.** 모든 컴포넌트는 두 테마에서 모두 검증한다.

## 1. 확정된 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | **Next.js (App Router)** | TypeScript |
| 호스팅·배포 | **Vercel** | 프리뷰/프로덕션 분리 |
| 인증 | **Firebase Auth — Google 로그인 기본** | 04, 03 문서 참조 |
| DB | **Firebase Firestore** | 프로젝트·클립·자막 메타데이터 |
| 스토리지 | **Firebase Storage** | 업로드 원본 미디어 |
| 영상 엔진 | **Remotion** (`@remotion/transitions`, `@remotion/captions`) | |
| 미디어 처리 | **FFmpeg** | 길이 정합·변환 |
| 자동 자막 | **Whisper** (클라우드 우선: OpenAI API) | 한국어=다국어 모델, 검수 필수 |
| 렌더링 | **Remotion Lambda(AWS)** 또는 전용 워커 | ⚠️ Vercel 함수에서 직접 렌더 금지(타임아웃) |
| 다국어 | **next-intl** | 한국어/영어 기본, 확장 가능 |
| 다크모드 | **next-themes** (class 전략) + Tailwind | 상단바 토글 스위치 |
| 스타일 | **Tailwind CSS** | 디자인 토큰은 05 문서 |

## 2. docs 읽는 순서

| # | 파일 | 무엇을 위한 문서인가 |
|---|---|---|
| 01 | `docs/01-overview.md` | 제품 정의·타깃·범위·비범위 |
| 02 | `docs/02-architecture.md` | 시스템 구조·환경변수·렌더 파이프라인 |
| 03 | `docs/03-auth-and-data.md` | Firebase 인증(구글)·Firestore 데이터 모델·보안 규칙 |
| 04 | `docs/04-features-and-flow.md` | 사용자 흐름·에디터·자동 자막·효과·i18n·다크모드 동작 |
| 05 | `docs/05-design-system.md` | 디자인 언어(토큰·타이포·레이아웃·시그니처·컴포넌트) |
| 06 | `docs/06-build-phases.md` | Phase별 구현 로드맵 + 검증 기준 |

## 3. 시작 방법 (Claude Code에게)

1. 이 ORCHESTRATOR와 `docs/` 6개 파일을 모두 읽는다.
2. `docs/06-build-phases.md`의 **Phase 0(프로젝트 셋업)**부터 시작한다.
3. 각 Phase 완료 시 검증 기준을 스스로 확인하고, 다음 Phase로 진행한다.
4. 불확실한 외부 사양(요금·라이선스·SDK 버전)은 추측하지 말고, 해당 시점 공식 문서를
   확인하도록 사용자에게 알린 뒤 진행한다.

## 4. 디렉터리 컨벤션 (권장)

```
/app                  # Next.js App Router (locale 세그먼트 포함)
  /[locale]
/components           # UI 컴포넌트 (디자인 토큰 기반)
/lib                  # firebase, i18n, render 클라이언트
/remotion             # Remotion 컴포지션·전환·자막
/messages             # i18n 카탈로그 (ko.json, en.json)
/docs                 # 이 명세 문서들
```

> 다음 단계: `docs/01-overview.md`부터 읽으세요.
