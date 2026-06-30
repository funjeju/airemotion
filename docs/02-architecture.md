# 02 · ARCHITECTURE — 시스템 구조

## 전체 구성

```
[ 브라우저 (Next.js / Vercel) ]
      │  업로드·편집·미리보기 (클라이언트)
      ▼
[ Firebase ]
  ├─ Auth        : 구글 로그인
  ├─ Firestore   : 프로젝트·클립·자막 메타데이터
  └─ Storage     : 업로드 원본 미디어
      │
      ▼  렌더 요청 (서버 액션/API Route → 렌더 워커)
[ 렌더 파이프라인 ]
  ├─ Whisper(STT): 음성 → 자막 초안 (OpenAI API 또는 워커 내 실행)
  ├─ FFmpeg      : 오디오/영상 길이 정합·변환
  └─ Remotion    : 합성 → MP4
      │
      ▼  결과 저장
[ Firebase Storage / Firestore: 출력 URL·상태 ]
```

## 역할 분담

- **Vercel(Next.js)**: UI 호스팅, 인증 연동, 업로드 UI, 에디터, 미리보기, 렌더 요청 트리거.
- **Firebase**: 인증·데이터·파일 저장 (자세한 모델은 03 문서).
- **렌더 워커**: 실제 영상 합성. **Vercel 함수에서 직접 돌리지 않는다.**

## ⚠️ 렌더링 위치에 대한 핵심 결정

Vercel 서버리스 함수는 **실행 시간 제한**이 있어 긴 영상 렌더에 부적합하다.
따라서 렌더링은 다음 중 하나로 분리한다:

- **권장:** **Remotion Lambda(AWS)** — 분산 병렬 렌더, 빠름. Vercel 앱이 렌더 잡을 트리거.
- **대안:** 전용 렌더 서버 / Cloud Run — 단일 머신, 저렴하지만 느림.
- Phase 1(웹 미리보기)은 **브라우저 내 재생**이라 서버 렌더가 필요 없다(시간 절약).

Whisper도 동일: Vercel 함수에서 로컬 whisper.cpp 실행은 부적합 →
**OpenAI Whisper API(클라우드)** 또는 **렌더 워커 안에서 STT 처리**로 간다.

## 환경변수 (`.env.local` + Vercel 대시보드)

```bash
# Firebase (클라이언트 — NEXT_PUBLIC_ 접두어는 공개돼도 되는 설정값만)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (서버 전용 — 절대 NEXT_PUBLIC_ 금지)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Whisper (클라우드 STT, 서버 전용)
OPENAI_API_KEY=

# 렌더링 (Remotion Lambda, 서버 전용)
REMOTION_AWS_ACCESS_KEY_ID=
REMOTION_AWS_SECRET_ACCESS_KEY=
AWS_REGION=
```

> 규칙: `NEXT_PUBLIC_` 이 붙은 값만 브라우저로 나간다. 시크릿(Admin 키, OPENAI_API_KEY,
> AWS 키)은 절대 `NEXT_PUBLIC_` 을 붙이지 않는다. `.env*` 는 `.gitignore` 에 포함.

## 라우팅 (App Router + i18n)

```
/app/[locale]/                # ko | en
  /(auth)/login               # 구글 로그인
  /(app)/dashboard            # 내 프로젝트 목록
  /(app)/editor/[projectId]   # 에디터(업로드·배열·자막·미리보기)
/app/api/                     # 렌더 트리거, STT 트리거 (서버)
```

## 외부 의존성 — 확인 필요(추측 금지)

- **Remotion 라이선스**: 개인·소규모 무료, 회사 규모는 유료. 구축 시 공식 라이선스 확인.
- **클라우드 렌더 비용/AWS 요금**: 변동됨. 렌더 전 `estimatePrice`로 표시 + 짧은 테스트로 실측.
- **STT 정확도(한국어)**: 다국어 모델 사용, 검수 단계 필수. 필요 시 한국어 특화 STT 비교.

> 다음: `docs/03-auth-and-data.md`
