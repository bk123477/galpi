# 갈피 (GALPI) — 개인 독서 아카이브 PWA 개발 명세서

> **한 문장 소개:** 읽었던 이야기를, 잊지 않도록.
>
> **문서 버전:** 1.0 · **작성일:** 2026-10-18 · **대상:** Coding Agent (Codex / Claude Code / Cursor 등)
>
> **최상위 원칙:** 기능은 가볍게, 표지 중심 UI는 아름답게, 데이터는 안전하게. 과도한 기능과 기술을 만들지 않는다.

---

## 1. 프로젝트 목적

### 1.1 배경
- 개인이 읽은 **웹소설과 일반 도서**를 짧게 기록하는 모바일 중심 PWA를 개발한다.
- 긴 독후감 대신 **제목 / 작가 / 짧은 내용·감상 메모 / 표지 이미지**만 남기는 것이 핵심이다.
- 읽었던 작품을 잊지 않고 다시 찾아보며, 현재 읽는 작품과 다음에 읽을 작품을 파악한다.
- 기록이 쌓일수록 **표지들이 모인 나만의 서재**가 완성되는 감각이 중요하다.

### 1.2 주요 이용 환경
- 개인 전용, 단일 소유자 계정. 불특정 사용자 대상 서비스가 아니다.
- iPhone의 Safari 및 홈 화면에 추가한 PWA, MacBook의 Chrome/Safari 지원.
- 같은 계정으로 접속하면 Firebase를 통해 기록이 동기화된다.
- UI 및 안내 문구는 **한국어**를 기본으로 한다.

### 1.3 성공 기준
1. 휴대폰에서 작품 등록을 **30초 안팎**에 끝낼 수 있다(사진 선택 시간 제외).
2. 기존 작품을 제목 또는 작가로 즉시 찾을 수 있다.
3. 홈 화면에서 **읽는 중 / 읽을 예정 / 읽음** 상태를 구분할 수 있다.
4. 표지 그리드가 자연스럽고 예쁘며 오랫동안 사용해도 질리지 않는다.
5. 소유자 외에는 작품 데이터와 표지에 접근할 수 없다.
6. 작품 수정·삭제·이미지 교체 및 실패 복구가 안전하게 동작한다.

---

## 2. 범위 및 우선순위

### P0 — 최초 배포에 반드시 포함
- 소유자 전용 로그인 및 로그인 상태 유지.
- 작품 등록 / 조회 / 수정 / 삭제.
- 필드: **제목(필수), 작가(선택), 메모(선택), 표지(선택)**.
- 작품 유형: **웹소설 / 일반 도서 / 기타** (작은 선택 UI, 기본 웹소설).
- 독서 상태: **읽을 예정 / 읽는 중 / 읽음**.
- 표지 이미지 업로드, 미리보기, 교체, 삭제, 기본 플레이스홀더.
- 표지 중심 서재 화면, 상태별 필터, 제목/작가 검색, 최근 등록순 정렬.
- 작품 상세 화면, 친절한 빈 화면·에러·로딩 상태.
- 반응형 모바일 우선 디자인, PWA 설치 가능, Firebase 배포.
- Firebase Authentication, Cloud Firestore, Cloud Storage Security Rules.

### P1 — 안정화 후 추가(초기 MVP보다 우선하지 않음)
- **완전한 백업/복원**: 도서 메타데이터 + 표지 이미지를 ZIP으로 내보내고 복원. 장기 보존을 위해 중요함.
- '다음에 읽을 한 권' 지정 또는 읽을 예정 리스트 순서 조정.
- 읽은 날짜 직접 변경(기본값은 상태를 '읽음'으로 바꾼 날짜).
- 표지 이미지 클립보드 붙여넣기(데스크톱), 이미지 드래그 앤 드롭.
- 작품 출처/플랫폼 링크(선택), 연재 상태 등 웹소설 보조 필드.
- 다크 모드 및 연도별 모아보기.

### 명시적 제외
- 긴 독후감 에디터, 별점·랭킹·추천 알고리즘.
- 독서량 목표, 출석/스트릭, 독서 시간 추적.
- SNS, 공개 프로필, 팔로우, 댓글 공유.
- 서점 API 자동 검색, ISBN 스캐너, 자동 표지 수집.
- 서버 사이드 렌더링, 별도 API 서버, Cloud Functions, 푸시 알림.
- 오프라인에서의 데이터 **작성·동기화 보장** (후속 과제).

**설계 원칙:** 추가 요구가 없으면 P0에 새 기능을 임의로 더하지 말 것.

---

## 3. 추천 기술 스택

| 영역 | 선택 | 이유 |
|---|---|---|
| Frontend | React + TypeScript + Vite | 작고 빠른 SPA / 유지보수 쉬움 |
| Styling | Tailwind CSS + CSS variables | 디자인 토큰 적용과 반응형 구현 |
| Icons | lucide-react | 미니멀한 아이콘 일관성 |
| Backend/DB | Firebase Cloud Firestore | 서버 없이 작품 데이터 저장·동기화 |
| Authentication | Firebase Authentication (이메일/비밀번호) | 개인 계정에 단순하고 PWA에서 안정적인 로그인 흐름 |
| Cover images | Cloud Storage for Firebase | 사용자 업로드 표지 저장 |
| Hosting | Firebase Hosting | HTTPS, 정적 파일 호스팅 및 배포 |
| PWA | vite-plugin-pwa | manifest / service worker 관리 |
| Validation | Zod 또는 동등한 경량 유효성 검사 | 입력값 검사와 데이터 형태 일관성 |
| Testing | Vitest + React Testing Library, Firebase Emulator Suite | 주요 비즈니스 로직과 보안 규칙 테스트 |

- Firebase **모듈형 Web SDK**를 사용한다.
- 별도 상태 관리 라이브러리는 필요할 때만 추가한다. 기본은 React hooks + 작은 서비스 계층으로 구현한다.
- Cloud Firestore와 Firebase Storage를 사용한다. Realtime Database는 사용하지 않는다.
- PWA는 **온라인 기반**이다. 앱 셸은 캐시할 수 있지만 오프라인 데이터 저장을 보장한다고 표시하지 않는다.

### 중요: Firebase 비용
- **2026-02-03부터 Cloud Storage for Firebase 사용에는 Blaze(종량제) 요금제가 필수**이다.
- Blaze에서도 무료 사용량이 있을 수 있으나, 결제 계정 연결 및 예산 알림 설정이 필요하다. 무료라고 단정하지 않는다.
- 이미지 용량을 최적화하고 불필요한 재다운로드를 줄여 비용을 통제한다.
- 공식 안내: https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024
- 요금 참고: https://firebase.google.com/pricing

---

## 4. IA 및 화면 요구사항

### 4.1 화면/라우트

| 경로 | 화면 | 내용 |
|---|---|---|
| `/login` | 로그인 | 개인 계정 로그인, 공개 회원가입 없음 |
| `/` | 나의 서재 | 상태 요약, 검색, 필터, 표지 그리드 |
| `/books/new` | 새 작품 등록 | 표지, 제목, 작가, 메모, 유형, 상태 |
| `/books/:id` | 작품 상세 | 큰 표지와 정보, 수정/삭제/상태 변경 |
| `/books/:id/edit` | 작품 수정 | 등록 폼 재사용 |
| `/settings` | 설정 | 로그아웃, 버전 정보; P1에서 백업/복원 |

### 4.2 홈 화면 — 나의 서재
- 상단: 작은 브랜드 로고/문구 **갈피**, 보조 문구 '읽었던 이야기를, 잊지 않도록.'
- 우측 상단: 설정 버튼.
- 인트로 아래 간결한 수량 요약: `전체 n권 · 읽는 중 n · 읽을 예정 n · 읽음 n`.
- 제목/작가 검색 입력창. 검색어가 없으면 모든 작품 노출.
- 상태 필터 칩: `전체 / 읽는 중 / 읽을 예정 / 읽음`.
- 선택적 유형 필터: `전체 유형 / 웹소설 / 일반 도서 / 기타` (부담 없는 작은 메뉴).
- 기본 정렬: **최근 등록한 순**. P0에서 정렬 옵션을 추가한다면 `최근 수정순 / 제목순`까지만.
- 메인: 표지가 주인공인 **서재 그리드**. 각 표지 아래 제목, 작가(있을 때), 작은 상태 표시.
- 모바일: 우하단 또는 하단 고정 `+ 작품 추가` 버튼. safe-area를 고려해 본문/버튼과 겹치지 않도록 한다.
- 작품이 없는 경우: 책 모양의 간결한 CSS 플레이스홀더와 '첫 이야기를 서가에 꽂아볼까요?' + 작품 추가 버튼.
- 검색 결과가 없는 경우: '일치하는 작품이 없어요.' + 검색어 초기화.
- 통계용 대시보드나 장황한 홈 카드보다 **서재 자체**를 우선한다.

### 4.3 작품 등록/수정
- 모바일에서는 전체 화면 양식, 데스크톱에서는 중앙 폭을 제한한 페이지.
- 위에서 아래로: **표지 업로드 영역 → 제목 → 작가 → 상태 → 작품 유형 → 메모 → 저장**.
- 표지 선택: 카메라 촬영 또는 갤러리/파일 선택 (`accept="image/*"`), 선택 즉시 로컬 미리보기.
- 기존 표지 교체/제거 가능. 표지 없는 상태도 저장 가능.
- 제목 필수(공백만 입력 불가), 최대 120자.
- 작가 선택, 최대 120자.
- 메모: 여러 줄 일반 텍스트, 최대 2,000자, 플레이스홀더 예: '무슨 내용이었더라? 기억하고 싶은 장면만 적어두세요.'
- 상태 선택: 읽을 예정 / 읽는 중 / 읽음. **새 작품 기본값은 '읽음'**, 사용자가 변경할 수 있도록 한다(이 앱의 주요 목적은 이미 읽은 기록).
- 유형 기본값은 **웹소설**.
- 저장 클릭 시 중복 요청 방지(버튼 비활성화), 진행 상태 표시, 저장 완료 후 상세 또는 서재로 이동하고 토스트 표시.
- 뒤로 가거나 닫을 때 수정된 미저장 내용이 있으면 이탈 확인.
- 같은 제목/작가 조합이 존재하면 '이미 기록한 작품일 수 있어요'라는 비차단 경고. 시리즈·동명 작품을 고려하여 등록 자체는 허용.

### 4.4 작품 상세
- 상단에 큰 표지(원본 비율 최대한 유지), 제목, 작가, 작품 유형, 상태 배지.
- 메모는 줄바꿈을 유지한 본문으로 표시. 없으면 자연스러운 빈 상태 텍스트.
- 읽음 상태에는 기록상 읽은 날짜(`finishedAt`)가 있으면 보조 문구로 표시.
- 버튼: `수정`, `삭제`. 상태는 상세 화면에서도 간단히 변경 가능하면 좋음(선택 구현).
- 삭제 시 반드시 확인 대화상자를 띄우고, '삭제하면 되돌릴 수 없어요.' 안내.
- 이미지가 존재하지 않거나 로드 실패 시 깨진 아이콘 대신 책 표지 플레이스홀더.

### 4.5 로그인 / 설정
- 회원가입 및 비밀번호 변경 기능을 앱에 만들지 않는다(개인용, 계정은 Firebase 콘솔에서 관리).
- Firebase Authentication 이메일/비밀번호로 로그인한다.
- 브라우저에 로그인 상태를 유지하되, 명시적인 로그아웃 제공.
- 인증이 결정되기 전 보호 화면이 잠깐 노출되지 않도록 Auth loading state를 둔다.
- 설정에는 로그아웃, 앱 버전, 간단한 백업 안내를 넣는다. 실제 ZIP 백업은 P1.

---

## 5. 디자인 시스템 — 가장 중요

### 5.1 분위기
- 키워드: **조용한 서재 / 종이의 질감 / 책갈피 / 따뜻한 미니멀리즘**.
- '도서 관리 프로그램'이 아니라 **읽은 작품의 표지가 차곡차곡 놓이는 개인 아카이브**.
- 시각적 계층은 **표지 > 제목 > 작가 > 상태** 순서.
- 화려한 그래디언트, 두꺼운 카드 테두리, 과도한 그림자, 불필요한 차트는 피한다.
- 컬러와 여백, 타이포그래피, 이미지 비율, 미세한 움직임으로 완성도를 만든다.

### 5.2 기본 색상 토큰(제안값, 일관성 유지)

```css
:root {
  --bg: #F8F6F1;        /* 따뜻한 아이보리 */
  --surface: #FFFEFB;   /* 종이 */
  --text: #2C2925;      /* 잉크 */
  --muted: #817C74;     /* 흐린 갈색 회색 */
  --accent: #718879;    /* 세이지 그린 */
  --accent-soft: #E9EFE9;
  --border: #E8E4DC;
  --danger: #B45E59;
}
```

- 주제색은 포인트에만 사용하며, 페이지 전체는 절제된 밝은 톤 유지.
- 제목은 한국어 세리프 계열(`Noto Serif KR` 또는 `Gowun Batang`), 본문과 컨트롤은 읽기 쉬운 산세리프(`Pretendard` 또는 시스템 폰트) 사용.
- 외부 폰트 로딩 실패 시 시스템 폰트로 자연스럽게 대체.
- 본문 가독성과 명도 대비 준수. 상태를 색상만으로 구별하지 않는다.

### 5.3 서재 그리드
- 책 표지 비율의 기본 프레임은 **2:3**. 단, 사용자 업로드 이미지의 글자/구성이 잘리지 않도록 `object-fit: contain`을 우선하고 빈 부분은 은은한 배경으로 처리.
- 가로 폭이 작은 모바일: **2열**, 큰 모바일·태블릿: **3~4열**, 데스크톱: **4~6열**(컨테이너 최대 폭 약 1100px).
- 책 사이에 숨 쉴 수 있는 간격을 둔다. 모바일에서 텍스트/표지가 너무 작아지지 않도록 최소 카드 폭 고려.
- 표지 아래 제목은 최대 2줄 말줄임, 작가는 1줄 말줄임, 상태는 작은 텍스트/칩.
- 표지가 없으면 따뜻한 색감의 **커스텀 책등/책 표지 플레이스홀더**: 제목을 읽을 수 있도록 중앙 정렬, 매번 무작위 색상 대신 작품 ID 해시로 안정적인 색상 선택.
- 표지 로딩 중에는 동일 비율 스켈레톤 사용하여 레이아웃 이동 최소화.

### 5.4 마이크로 인터랙션
- 표지 hover 시 미세하게 상승/그림자 변화, 모바일은 탭 피드백.
- 애니메이션은 대체로 **150~220ms** 내외, 과장하지 않음.
- `prefers-reduced-motion` 지원.
- 터치 영역 최소 약 44×44px, iPhone 홈 인디케이터 safe-area 고려.
- 삭제/저장/업로드 과정의 상태 표시가 특히 명확해야 함.

---

## 6. Firestore 데이터 모델

### 6.1 컬렉션 경로

```text
users/{uid}/books/{bookId}
```

- `uid`: Firebase Authentication 소유자 UID.
- `bookId`: Firestore 자동 문서 ID.
- 개인 전용이며 다른 사용자의 데이터가 보이지 않아야 한다.

### 6.2 Book 스키마

```ts
type BookStatus = 'planned' | 'reading' | 'finished';
type BookType = 'webnovel' | 'book' | 'other';

interface Book {
  id: string;                        // Firestore 문서 ID; 응답에서 합성
  title: string;                     // 필수, 1~120자 (trim 후)
  author: string;                    // 선택 입력 시 빈 문자열 허용
  note: string;                      // 선택, 최대 2,000자
  type: BookType;                    // 기본 webnovel
  status: BookStatus;                // 기본 finished
  coverPath: string | null;          // Firebase Storage 내부 경로
  createdAt: Timestamp;              // 서버 시간
  updatedAt: Timestamp;              // 서버 시간
  finishedAt: Timestamp | null;      // '읽음'으로 전환한 때, 아니면 null
}
```

- Firestore에는 **`id` 필드를 중복 저장하지 않음**. 클라이언트가 문서 ID를 합성.
- `createdAt`, `updatedAt`은 `serverTimestamp()` 사용. 프론트 표시에만 한국 시간/로컬 시간 사용.
- 최초 저장 시 status가 `finished`면 `finishedAt = serverTimestamp()`; 그 외 `null`.
- `planned`/`reading` → `finished`가 되면 `finishedAt` 설정. `finished` 상태에서 제목/메모를 수정하는 경우 기존 날짜 유지.
- `finished` → 다른 상태로 바뀌면 `finishedAt = null`.
- 기본 정렬은 `createdAt` 내림차순; 동일 시점에서는 문서 ID 등 안정적 기준 적용.
- 검색은 개인 서재 규모를 고려하여 초기에는 가져온 문서 목록에서 제목/작가 **클라이언트 필터링**. 대소문자 무시, 앞뒤 공백 정리, 한글 정상 처리. 전체 텍스트 검색 엔진 도입 금지.
- 규모가 커져 성능 문제가 발생한 경우에만 페이지네이션/별도 검색 인덱스를 후속 도입.

### 6.3 Storage 경로

```text
users/{uid}/covers/{bookId}/{imageId}.webp
```

- `imageId`는 UUID 등 충돌하지 않는 식별자.
- 브라우저 WebP 인코딩이 불가능한 경우 JPEG/PNG 확장자와 정확한 MIME 사용.
- Firestore에는 `coverPath`만 저장. **외부 공개 가능한 장기 다운로드 토큰 URL은 DB에 저장하지 않음**.
- 이미지 조회는 Storage SDK `getBlob()` → `URL.createObjectURL()` 우선 사용. 사용 종료 시 `URL.revokeObjectURL()`로 정리.
- `getBlob()`의 브라우저 사용에는 **Storage 버킷 CORS 설정**이 필요하므로 환경 설정 절차에 포함.

---

## 7. Firebase 인증 및 보안 (필수)

### 7.1 계정 정책
- Firebase Console에서 개발자가 직접 **소유자 이메일/비밀번호 계정 하나**를 생성한다.
- 앱 UI에는 **공개 회원가입이 없다**. 그 자체만으로 타인 접근이 차단되는 것은 아니므로 반드시 서버 측 Security Rules에서 **소유자 UID만 허용**해야 한다.
- 인증되지 않은 사용자는 `/login` 외 보호된 화면/쿼리 접근 금지.
- `VITE_FIREBASE_*` 프런트엔드 설정값은 비밀 키가 아니다. 그러나 서비스 계정 키, 비밀번호, 관리자 권한 토큰은 절대 클라이언트에 넣지 않는다.
- 소유자 UID는 보안 규칙에 배포 시 주입/치환한다. `REPLACE_WITH_OWNER_UID` placeholder를 실제 값으로 교체하지 않은 상태로 배포하지 않는다.

### 7.2 Firestore Security Rules 예시

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isOwner(uid) {
      return request.auth != null
        && request.auth.uid == uid
        && uid == 'REPLACE_WITH_OWNER_UID';
    }

    function validBook() {
      let d = request.resource.data;
      return d.keys().hasOnly([
          'title', 'author', 'note', 'type', 'status',
          'coverPath', 'createdAt', 'updatedAt', 'finishedAt'
        ])
        && d.keys().hasAll([
          'title', 'author', 'note', 'type', 'status',
          'coverPath', 'createdAt', 'updatedAt', 'finishedAt'
        ])
        && d.title is string && d.title.size() > 0 && d.title.size() <= 120
        && d.author is string && d.author.size() <= 120
        && d.note is string && d.note.size() <= 2000
        && d.type in ['webnovel', 'book', 'other']
        && d.status in ['planned', 'reading', 'finished']
        && (d.coverPath == null ||
            (d.coverPath is string && d.coverPath.size() <= 300))
        && d.createdAt is timestamp
        && d.updatedAt is timestamp
        && (d.finishedAt == null || d.finishedAt is timestamp);
    }

    match /users/{uid}/books/{bookId} {
      allow read: if isOwner(uid);
      allow create: if isOwner(uid) && validBook();
      allow update: if isOwner(uid) && validBook()
        && request.resource.data.createdAt == resource.data.createdAt;
      allow delete: if isOwner(uid);
    }
  }
}
```

- 이 규칙은 초안이다. **Firebase Emulator Suite로 정상 CRUD와 타인/미로그인 접근 차단을 검증한 뒤 배포**할 것.
- 추가로 `coverPath`가 현재 소유자/해당 bookId 하위 경로인지, 상태와 `finishedAt`이 일치하는지 검증하도록 강화할 것.
- 앱에서 숨긴 버튼은 보안 수단이 아니다. 권한 검사는 Firebase Security Rules가 책임진다.

### 7.3 Cloud Storage Security Rules 예시

```js
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function isOwner(uid) {
      return request.auth != null
        && request.auth.uid == uid
        && uid == 'REPLACE_WITH_OWNER_UID';
    }

    match /users/{uid}/covers/{bookId}/{fileName} {
      allow read: if isOwner(uid);
      allow create: if isOwner(uid)
        && request.resource.size <= 3 * 1024 * 1024
        && request.resource.contentType.matches('image/(webp|jpeg|png)');
      allow delete: if isOwner(uid);
      allow update: if false;
    }
  }
}
```

- 기본적으로 **그 외 모든 문서/오브젝트 경로는 거부**한다.
- 이미지 확장자/MIME 일치 확인, 실패한 업로드 정리, 권한 오류를 테스트한다.
- Storage의 보안 규칙과 공개 다운로드 URL의 토큰 특성은 별개이므로 `getBlob()` 방식 권장.

### 7.4 Storage CORS
- Firebase 공식 문서를 참고하여 서비스 오리진(`https://<project>.web.app`, 실제 커스텀 도메인 등)에 대해 필요한 `GET` CORS 허용.
- 와일드카드 대신 실제 사용 도메인으로 좁힐 수 있으면 좁힌다.
- 공식 문서: https://firebase.google.com/docs/storage/web/download-files

---

## 8. 표지 이미지 처리

### 8.1 입력
- JPEG, PNG, WebP, HEIC 등 휴대폰에서 선택한 이미지 지원을 목표로 한다. 브라우저가 디코딩하지 못하는 형식은 친절하게 오류 표시.
- 원본 파일 최대 **12MB**로 제한하고, 너무 큰 파일은 제출 전 안내.
- 브라우저에서 이미지 디코딩 후 긴 변 기준 **최대 1400px**로 축소, WebP(가능하면) 또는 JPEG로 변환.
- 품질 약 0.8~0.85를 시작점으로 하며 글자 가독성을 유지하도록 조정.
- 변환 후 **3MB 이하**만 Storage에 업로드. 원본을 그대로 업로드하지 않는다.
- 이미지 압축이 실패하더라도 제목·메모를 잃지 않게 한다.

### 8.2 업로드/교체 프로세스
1. 클라이언트에서 유효성 검사 및 이미지 로컬 미리보기.
2. 새 작품의 문서 ID를 먼저 생성(아직 문서 저장 전).
3. 고유한 Storage 경로에 **새 표지** 업로드.
4. 업로드 성공 시 Firestore 문서를 새 `coverPath`로 저장.
5. DB 저장 실패 시 방금 업로드한 신규 파일 삭제 시도, 사용자에게 실패 표시.
6. 기존 작품의 표지 교체 시 **DB 반영 성공 후 이전 표지 삭제**. 이전 파일 정리가 실패하면 신규 기록은 유지하되 로그를 남기고 재시도 가능하게 처리.
7. 사용자가 표지만 제거하면 Firestore `coverPath = null` 저장 성공 후 이전 파일 삭제.
8. 작품 삭제는 확인 후 DB 삭제 → 관련 Storage 파일 삭제 시도. 파일 삭제 실패 시 고아 파일이 남을 수 있으므로 에러 로깅 및 관리자 정리 방법을 README에 문서화.

**주의:** 클라이언트와 Storage/Firestore 간 트랜잭션은 없다. 성공/실패 순서와 복구 동작을 명시적으로 구현할 것.

### 8.3 이미지 로딩
- 화면에 나타나는 표지만 지연 로딩(`IntersectionObserver` 또는 동등한 방법).
- 동일 경로는 세션 내 재사용할 수 있도록 간단한 캐시를 둔다.
- 경로 변경, 로그아웃, 컴포넌트 해제 시 Object URL 메모리 정리.
- 사용자 표지의 불필요한 외부 공개·검색엔진 색인은 허용하지 않는다.

---

## 9. 상태와 예외 처리

- **인증 로딩:** 세션 판별 중 보호 화면 노출 방지.
- **일반 로딩:** 그리드 스켈레톤, 버튼 로딩 표시.
- **빈 서재:** 등록 CTA 제시.
- **검색 결과 없음:** 검색어 초기화 안내.
- **네트워크 오프라인:** 조회 상태를 구분하고, 온라인이 필요한 저장/삭제 시도 시 '인터넷 연결 후 다시 시도해 주세요.' 표시.
- **표지 불러오기 실패:** 플레이스홀더로 대체, 다른 작품은 정상 표시.
- **업로드 실패:** 메모/입력 필드 유지, 재시도 가능.
- **권한 오류:** 비공개 정보를 절대 노출하지 않고 로그인 화면으로 유도 또는 접근 거부 안내.
- **중복 저장:** 저장 중 버튼 비활성화 및 이중 요청 방지.
- **삭제 오류:** 실제 DB 삭제 성공 여부에 맞게 UI를 일치시키며 허위 성공 메시지 금지.
- **PWA 업데이트:** 새 버전 존재 시 재시작/새로고침 안내. 입력 중인 폼이 유실되지 않도록 강제 갱신 금지.

---

## 10. PWA 요구사항

- HTTPS 호스팅: Firebase Hosting.
- `manifest.webmanifest`: name `갈피`, short_name `갈피`, display `standalone`, 적절한 theme/background color, start_url `/`.
- 192×192 / 512×512 아이콘, maskable 아이콘, `apple-touch-icon` 180×180 준비.
- iPhone 홈 화면 추가 시 상단 safe area, 하단 홈 인디케이터, 키보드 열림 상태에서 버튼 가림 등에 대응.
- 모바일 화면에서 가로 스크롤이 발생하지 않을 것.
- Service Worker는 **HTML/JS/CSS/앱 아이콘 같은 정적 앱 셸**만 제한적으로 캐시.
- Firestore 데이터 및 인증 응답을 임의로 공개/영구 캐싱하지 않는다.
- 오프라인으로 앱이 열리더라도 '기록을 보거나 저장하려면 연결이 필요할 수 있음'을 명확하게 알린다. 오프라인 저장 가능하다고 홍보하지 않는다.
- iOS Safari 및 홈 화면 앱 모드에서 직접 테스트한다.

---

## 11. 프로젝트 구조 예시

```text
src/
  app/
    App.tsx
    router.tsx
  components/
    AppHeader.tsx
    BookCard.tsx
    BookGrid.tsx
    BookCover.tsx
    StatusFilter.tsx
    EmptyState.tsx
    ConfirmDialog.tsx
  pages/
    LoginPage.tsx
    LibraryPage.tsx
    BookFormPage.tsx
    BookDetailPage.tsx
    SettingsPage.tsx
  hooks/
    useAuth.ts
    useBooks.ts
    useBookCover.ts
  services/
    firebase.ts
    authService.ts
    bookService.ts
    coverService.ts
  types/
    book.ts
  utils/
    image.ts
    search.ts
    date.ts
  styles/
    globals.css
public/
  icons/
firestore.rules
storage.rules
firebase.json
.env.example
README.md
```

- 작은 프로젝트다. 의미 없이 계층이나 폴더를 늘리지 말 것.
- DB 요청 로직과 UI 렌더링 로직은 분리.
- 동일한 등록/수정 폼 컴포넌트를 재사용.
- Tailwind 스타일을 적용하되 색상/spacing은 공용 디자인 토큰을 중심으로 관리.

---

## 12. 테스트 및 완료 기준 (Acceptance Criteria)

### 기능 테스트
1. 소유자 계정으로 로그인 가능하고 새로고침해도 세션이 적절히 유지된다.
2. 로그인하지 않은 상태에서 `/` 및 `/books/:id` 접근 시 보호 화면으로 이동한다.
3. 제목만 입력해도 작품을 등록할 수 있다.
4. 제목/작가/메모/유형/상태/표지를 함께 저장하고 다시 조회해도 값이 유지된다.
5. 새 작품의 기본 상태는 읽음, 기본 유형은 웹소설이다.
6. 기존 메모를 수정하고 새로고침하면 수정 결과가 유지된다.
7. 표지를 등록·교체·제거할 수 있으며 기존 파일이 불필요하게 누적되지 않는다(오류 제외).
8. 작품을 삭제하면 서재에서 제거되고, 가능한 경우 이미지도 삭제된다.
9. 상태별 필터와 제목/작가 검색이 함께 적용된다.
10. `읽음` 상태 전환 시 `finishedAt`이 정확하게 변경되며 메모만 수정하면 원래 값이 보존된다.
11. 동일 작품 중복 의심 시 비차단 경고를 표시한다.
12. 네트워크 장애/Storage 권한 오류 시 기존 폼 데이터를 잃지 않고 오류를 설명한다.

### 보안 테스트 (Firebase Emulator)
13. 미로그인 사용자는 Firestore 책 데이터 및 Storage 표지 읽기/쓰기 불가.
14. 소유자가 아닌 별도 테스트 Firebase Auth 계정도 모든 책/표지 읽기/쓰기 불가.
15. 3MB 초과 및 허용하지 않은 MIME의 표지 업로드 거부.
16. `createdAt` 변조/허용되지 않은 status/과도한 길이의 note 저장 거부.

### UI/PWA 테스트
17. 모바일 375px 안팎 및 데스크톱 1440px에서 레이아웃이 깨지지 않는다.
18. iPhone Safari에서 표지 선택과 업로드가 된다.
19. iPhone 홈 화면에 추가해 독립 앱처럼 열리고 화면 여백이 정상 동작한다.
20. 느린 이미지 로딩과 빈 상태에서 레이아웃이 급격하게 움직이지 않는다.
21. 키보드로 주요 컨트롤을 사용할 수 있고 화면 읽기 이름(label)이 있다.
22. 새 버전 배포 뒤 미저장 입력을 강제로 지우지 않는다.

**P0 완료 정의:** 위 항목 중 P0에 해당하는 항목을 통과하고, 수동 테스트에서 등록→검색→수정→삭제를 iPhone과 데스크톱에서 재현할 수 있어야 한다.

---

## 13. 개발 순서 및 작업 지시

### Phase A — 프로젝트 뼈대
1. Vite + React + TypeScript 초기화.
2. Tailwind, 라우터, Firebase SDK, PWA 설정.
3. 모바일 우선 디자인 토큰 및 공통 레이아웃 구현.
4. Firebase 설정을 `.env.local`로 분리; `.env.example` 작성.

### Phase B — Firebase 및 보안
1. Auth 로그인/로그아웃/세션 가드 구현.
2. Firestore `books` CRUD와 타입 정의.
3. Storage 업로드, `getBlob()`, CORS 설정 가이드.
4. Firestore/Storage Security Rules 및 에뮬레이터 테스트.

### Phase C — 사용자 기능
1. 서재 표지 그리드 및 빈 화면.
2. 작품 생성/수정/삭제 및 이미지 처리.
3. 상세 화면과 상태 변경.
4. 검색 및 필터, 저장/삭제/네트워크 오류 처리.

### Phase D — 디자인 마감 및 배포
1. iPhone과 데스크톱에서 서재 간격, 타이포그래피, 이미지 비율 검수.
2. 접근성, 터치 영역, 입력 양식, safe-area 검수.
3. PWA 아이콘/manifest, Firebase Hosting 배포.
4. 테스트 통과, README에 설치/배포/보안 설정/요금/고아 파일 정리 방법 문서화.

### Phase E — 장기 보존 (P1)
- ZIP 백업: `books.json`(스키마 버전, 날짜/상태/작가/메모) + `covers/` 이미지 파일을 함께 저장.
- ZIP 복원: 기존 서재가 비어 있을 때 우선 지원. 데이터 유효성 검증, 이미지 재업로드, 진행률 표시, 부분 실패 복구.
- 단순 JSON 내보내기는 **표지가 없는 불완전한 백업**이므로 이를 전체 백업이라고 안내하지 말 것.
- 필요하다면 다음에 읽을 책 지정, 읽은 날짜 수정 등 작은 개선만 추가.

---

## 14. 개발 에이전트에게 전달할 실행 조건

> 아래 원칙에 맞추어 실제 동작하는 프로덕션 수준의 PWA를 구현하라.
>
> 1. **P0 기능부터 완성**한다. 과도한 기능/라이브러리를 추가하지 않는다.
> 2. 첫 화면은 **아름다운 표지 그리드**가 주인공이어야 한다. 대시보드처럼 만들지 않는다.
> 3. 개인 전용 보안을 Firebase Security Rules에서 강제한다. 회원가입 UI가 없다는 이유만으로 공개 접근을 허용하면 안 된다.
> 4. 저장·수정·이미지 교체·삭제의 실패 시나리오를 구현하고 사용자 입력을 보호한다.
> 5. 사용자가 Firebase 프로젝트 설정값, Auth 소유자 UID, Blaze 및 Storage 버킷 구성을 준비할 수 있도록 **README에 정확한 단계**를 작성한다. 실제 값이 없을 때는 명확한 placeholder와 로컬 구동 방법을 제공한다.
> 6. Firebase Auth/Firestore/Storage는 에뮬레이터로 기본 검증하고, 실제 배포를 했다고 거짓 주장하지 않는다.
> 7. 앱은 iPhone 홈 화면 PWA와 데스크톱 모두에서 사용할 수 있어야 한다.
> 8. 기능이 동작하는 것뿐 아니라 타이포그래피, 표지 비율, 여백, 터치감, 빈 상태를 정성스럽게 구현한다.
> 9. P1은 P0 검수 후 진행하고, 백업 기능은 실제 이미지까지 포함해야 한다.

---

## 15. 참고 문서

- Firebase + PWA: https://firebase.google.com/docs/web/pwa
- Firebase Hosting: https://firebase.google.com/docs/hosting
- Firestore Security Rules: https://firebase.google.com/docs/firestore/security/rules-conditions
- Storage Security Rules: https://firebase.google.com/docs/storage/security
- Firebase Auth 세션 지속성: https://firebase.google.com/docs/auth/web/auth-state-persistence
- Firebase Storage 브라우저 다운로드/CORS: https://firebase.google.com/docs/storage/web/download-files
- Firebase Storage Blaze 요건(2026): https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024
