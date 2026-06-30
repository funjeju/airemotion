# 03 · AUTH & DATA — 인증·데이터 모델

## 인증: Firebase Auth (Google 로그인 기본)

- **기본이자 1차 제공 수단은 Google 로그인** (`GoogleAuthProvider`, popup 또는 redirect).
- 초기엔 다른 제공자(이메일/애플 등)는 넣지 않는다. 필요 시 후속.
- 로그인 후 `users/{uid}` 문서가 없으면 생성(최초 로그인 시 프로비저닝).
- 보호 라우트: `dashboard`, `editor/*` 는 인증 필수. 미인증 시 `login`으로 리다이렉트.

### 클라이언트 흐름
1. 로그인 버튼 → `signInWithPopup(auth, googleProvider)`
2. 성공 → `users/{uid}` 확인/생성 → `dashboard`로 이동
3. 상단바에 아바타 + 로그아웃

### 서버 검증
- 서버 액션/API Route는 클라이언트가 보낸 **Firebase ID 토큰을 Admin SDK로 검증**한다.
- 검증된 `uid`로만 해당 사용자 데이터에 접근.

## Firestore 데이터 모델

```
users/{uid}
  displayName: string
  email: string
  photoURL: string
  locale: "ko" | "en"          # 선호 언어 (i18n 초기값)
  theme: "light" | "dark" | "system"
  createdAt: timestamp

projects/{projectId}
  ownerUid: string
  title: string
  intentPrompt: string          # "잔잔한 가족 영상" 등 대략 의도
  status: "draft" | "rendering" | "done" | "error"
  effectTheme: "calm" | "lively"  # 프롬프트에서 매핑된 효과 톤
  createdAt: timestamp
  updatedAt: timestamp

projects/{projectId}/clips/{clipId}
  order: number                 # 타임라인 순서 (드래그로 변경)
  type: "image" | "video" | "audio"
  storagePath: string           # Firebase Storage 경로
  durationSec: number           # 사진 기본 4초, 영상은 원본 길이
  animation: "zoomIn" | "zoomOut" | "pan" | null   # 사진용, 자동 배정
  caption: {
    text: string
    overrides: {                # 전역 기본값을 덮어쓸 때만 채움
      color?: string
      bgColor?: string
      fontSize?: number
      position?: "top" | "center" | "bottom"
    } | null
  }

projects/{projectId}/captions/{captionId}   # Whisper 자동 자막
  start: number                 # 초
  end: number
  text: string
  source: "auto" | "edited"     # 검수로 수정되면 edited
```

## Firebase Storage 구조

```
users/{uid}/projects/{projectId}/uploads/{filename}
users/{uid}/projects/{projectId}/renders/{outputId}.mp4
```

## 보안 규칙 (요지 — 구현 시 정식 작성)

- **소유자 격리**: 사용자는 `ownerUid == request.auth.uid` 인 프로젝트만 read/write.
- `users/{uid}` 는 본인만 read/write.
- Storage 도 동일하게 `uid` 경로 기준으로 본인만 접근.
- 미인증 요청은 전부 거부.

```
// Firestore (개념)
match /projects/{projectId} {
  allow read, write: if request.auth != null
    && resource.data.ownerUid == request.auth.uid;
  allow create: if request.auth != null
    && request.resource.data.ownerUid == request.auth.uid;
}
```

## 금지 사항

- 시크릿(Admin 키 등)을 클라이언트 코드/깃에 두지 않는다.
- 권한·공유 설정 변경, 영구 삭제 같은 위험 동작은 명시적 사용자 확인 후에만.

> 다음: `docs/04-features-and-flow.md`
