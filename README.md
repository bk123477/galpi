# 갈피 · GALPI

읽고 본 이야기를, 오래 기억하도록. 책·드라마·영화의 표지·제목·만든 사람·짧은 메모를 모으는 **소유자 전용 PWA**입니다.

React + TypeScript + Vite, Tailwind CSS, Firebase Authentication / Firestore / Storage / Hosting을 사용합니다. 별도 API 서버와 공개 회원가입은 없습니다.

## 앱 소개

갈피는 읽고 본 작품을 관리표에 입력하는 대신, 표지가 한 장씩 쌓이는 나만의 서재로 기록하는 앱입니다. iPhone에서 빠르게 작품을 남기고, Mac이나 다른 기기에서 같은 계정으로 이어서 볼 수 있도록 모바일 우선으로 만들었습니다.

### 이용 흐름

1. 소유자 이메일과 비밀번호로 로그인합니다. 로그인 세션은 기기에 유지되고, 이메일은 앱에서 따로 기억해 다음 로그인 화면에 표시합니다. 비밀번호는 앱에 저장하지 않습니다.
2. 책·드라마·영화 중 종류를 고르고 표지와 제목을 입력해 서재에 추가합니다. 책은 웹소설·일반 도서·기타로 세분할 수 있으며, 작가·감독과 짧은 메모는 선택 사항입니다. 진행 상태는 예정·진행 중·완료 중에서 고릅니다.
3. 서재에서 표지와 상태를 훑어보고, 제목이나 만든 사람을 검색하거나 종류·상태로 필터링합니다. 상세 화면에서 기록과 표지를 수정하거나 작품을 삭제할 수 있습니다.
4. 같은 계정으로 로그인한 기기에는 변경 내용이 동기화됩니다. 완료로 바꾸면 날짜를 자동 기록하고, 이미 완료한 기록을 수정해도 날짜는 유지합니다.

### 저장과 개인정보

- Firebase Authentication은 단일 소유자 계정만 사용합니다. 앱 안에는 가입·비밀번호 변경 화면이 없습니다.
- 작품 정보는 Firestore의 `users/{uid}/books/{bookId}`에, 표지는 Storage의 `users/{uid}/covers/{bookId}/...`에 저장합니다.
- 표지는 업로드 전 브라우저에서 축소·변환하고, 상세 화면에서만 필요한 이미지를 불러옵니다. 이미지가 없거나 불러오지 못하면 작품별 색상의 자체 표지를 보여줍니다.
- Firebase Rules가 로그인 UID와 소유자 UID를 비교해 작품과 표지 접근을 제한합니다. 저장 실패 시 입력 내용과 기존 표지를 보존하도록 처리합니다.
- 인터넷이 필요한 앱입니다. 오프라인에서는 앱 껍데기와 화면만 열릴 수 있고, 작품 조회·저장·동기화는 보장하지 않습니다.

### 디자인과 범위

따뜻한 종이색과 세이지 포인트, 작품 표지가 중심인 그리드를 사용합니다. iPhone 홈 화면에 설치할 수 있고 데스크톱에도 대응합니다. 새 버전은 사용자가 선택해 적용합니다. ZIP 백업/복원, 공개 프로필, 추천, 독서 통계는 포함하지 않습니다.

## 로컬에서 실행

**필요 환경:** Node.js **24.12 이상**(권장: Node 24 LTS), npm, 에뮬레이터 테스트에는 **Java 21 이상**.

```sh
nvm use                       # nvm을 사용하는 경우
npm ci
npm run dev
```

기본 주소는 `http://127.0.0.1:5173`입니다. Firebase 설정이 없으면 설정 안내만 표시하며 외부 Firebase에 요청하지 않습니다.

### 실제 계정 없이 로컬에서 사용

실제 프로젝트와 분리된 `demo-galpi` 에뮬레이터만 사용합니다. 데이터는 에뮬레이터 종료 시 사라집니다.

```sh
# 터미널 1: Auth, Firestore, Storage 시작
npm run emulators

# 터미널 2: 로컬 계정 생성 (가상 작품 10개를 원하면 -- --books 추가)
npm run seed -- --books
VITE_USE_EMULATORS=true npm run dev
```

로그인: `owner@galpi.local` / `galpi-local-only`. 이 계정은 **로컬 전용**이며 실제 앱에 포함되지 않습니다. Emulator UI는 `http://127.0.0.1:4000`입니다. `seed.mjs`는 루프백과 `demo-galpi`에 고정되어 운영 프로젝트에 쓸 수 없습니다.

macOS에서 Java 18 등이 먼저 잡힌 경우 설치된 JDK 21을 선택하세요.

```sh
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
```

## Firebase 설정

### Firebase Console에서 할 일

1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트를 만들고 웹 앱을 추가합니다. 앱을 추가하면 표시되는 `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`를 준비합니다. 앱 이름은 `갈피`로 정하면 찾기 쉽습니다.
2. Authentication → Sign-in method에서 **Email/Password**를 켭니다. Authentication → Users에서 소유자 계정 하나를 직접 생성하고 그 계정의 **UID**를 복사합니다. 앱에는 회원가입 화면이 없으므로 소유자 계정도 콘솔에서 준비해야 합니다.
3. Firestore Database를 **Standard edition / Native mode**로 생성합니다. 컬렉션이나 테스트 데이터를 직접 만들 필요는 없습니다. 앱이 첫 작품을 저장할 때 생성합니다.
4. Storage에서 기본 버킷을 만듭니다. Firebase Storage는 현재 Blaze 종량제 요금제와 결제 계정 연결이 필요합니다. Storage 버킷에는 `asia-northeast3`(서울)을 권장합니다. Firestore와 Storage 위치는 생성한 뒤 바꿀 수 없으므로 두 위치를 정한 다음 만드세요. Firestore에 서울이 제공되지 않는 프로젝트에서는 원하는 위치를 선택합니다. [Firestore 위치](https://firebase.google.com/docs/firestore/locations), [Storage 위치](https://firebase.google.com/docs/storage/locations).
5. Authentication → Settings → Authorized domains에 Hosting 주소가 있는지 확인합니다. 배포 주소는 `galpi.web.app`입니다. 로컬에서 실제 Firebase에 직접 접속해 시험하려면 `localhost`와 `127.0.0.1`도 추가합니다.

### `.env.local` 만들기

프로젝트 루트에서 `.env.example`을 복사합니다.

```sh
cp .env.example .env.local
```

`.env.local`의 우변을 Firebase Console에서 확인한 실제 값으로 바꿉니다.

```dotenv
VITE_FIREBASE_API_KEY=웹앱의 apiKey
VITE_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=콘솔에 표시된 실제 버킷 이름
VITE_FIREBASE_MESSAGING_SENDER_ID=웹앱의 messagingSenderId
VITE_FIREBASE_APP_ID=웹앱의 appId
VITE_OWNER_UID=Authentication에서 복사한 소유자 UID
VITE_USE_EMULATORS=false
```

`YOUR_PROJECT_ID`는 Firebase 프로젝트 설정에 나온 프로젝트 ID입니다. 버킷 이름은 보통 `YOUR_PROJECT_ID.firebasestorage.app`이지만, 앱 설정 화면의 값을 그대로 복사하세요. 비밀번호를 설정 파일에 넣을 필요는 없습니다. 값을 저장한 뒤 개발 서버가 열려 있다면 중지하고 다시 시작하세요.
`VITE_FIREBASE_*`는 브라우저에 포함되는 공개 앱 설정입니다. **서비스 계정 JSON, 관리자 토큰, 계정 비밀번호는 절대로 넣지 마세요.** `.env.local`은 Git에서 제외됩니다. 소유자 UID는 비밀 키가 아니며 접근 권한은 서버 보안 규칙이 강제합니다.

### Storage 비용

Cloud Storage for Firebase 사용에는 **Blaze 종량제 요금제와 결제 계정**이 필요합니다. 무료라고 가정하지 마세요. Google Cloud Billing에서 예산 알림을 설정하세요. 예산 알림은 요금 상한을 강제하지 않습니다. [공식 변경 안내](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024), [요금표](https://firebase.google.com/pricing).

### 인증된 이미지 다운로드를 위한 CORS

표지는 `getBlob()`으로 가져옵니다. 공개 다운로드 토큰 URL을 DB에 저장하지 않습니다. 현재 Hosting 주소에서 브라우저의 Storage 요청이 CORS를 통과하는 것을 확인했습니다. 별도 도메인을 연결해 CORS 오류가 발생하면 다음 버킷 설정을 적용하세요.

Google Cloud CLI(`gcloud`)를 설치하고, 프로젝트에서 버킷 설정을 바꿀 수 있는 Google 계정으로 로그인하세요. `storage.cors.json`에는 현재 배포 주소가 설정돼 있습니다. 커스텀 도메인을 쓰면 해당 HTTPS 주소를 `origin` 목록에 추가하세요. 로컬에서 Storage를 시험할 때만 `http://127.0.0.1:5173` 등 개발 주소를 추가하고, 배포 전에 제거합니다. `*`는 사용하지 않습니다. [Google Cloud CLI 설치 안내](https://cloud.google.com/sdk/docs/install).

```sh
gcloud auth login
gcloud storage buckets update gs://galpi-11e97.firebasestorage.app --cors-file=storage.cors.json
```

[공식 다운로드/CORS 안내](https://firebase.google.com/docs/storage/web/download-files). CORS는 접근 제어를 대신하지 않습니다. 표지 접근은 Storage Rules와 Firebase Auth로 제한됩니다. 버킷의 공개 IAM 권한도 부여하지 마세요.

## Hosting 배포

저장소에 `firebase.json`과 Hosting 재작성 규칙이 이미 있으므로 `firebase init`은 실행하지 않습니다. Hosting은 `/books/...` 같은 앱 경로를 `index.html`에 연결해 새로고침해도 화면이 열리게 설정돼 있습니다.

최초 설정 뒤 터미널에서 다음 순서로 실행합니다. Node.js 24.12 이상이 필요합니다.

```sh
npm ci
npx firebase login
npm test
npm run test:rules
npm run deploy
```

`.firebaserc`는 Firebase 프로젝트 `galpi-11e97`을, `firebase.json`은 해당 프로젝트의 Hosting 사이트 `galpi`를 가리킵니다. `npm run deploy`가 `.env.local`의 소유자 UID로 Firestore·Storage 규칙을 만들고, 프로덕션 빌드를 생성해 Firebase Hosting과 규칙을 배포합니다. 사이트 주소는 [https://galpi.web.app](https://galpi.web.app)입니다. 배포 뒤 소유자 계정으로 로그인해 작품 저장과 표지 보기를 확인하세요.

`.firebaserc`에 기본 프로젝트가 지정돼 있습니다. 프로젝트를 바꿀 때만 alias를 변경하세요.

```sh
firebase use --add
```

배포 전에 자동으로 실행되는 검사는 `.env.local`에 Firebase 설정과 UID가 있는지, 에뮬레이터 모드가 아닌지, Firebase CLI에서 선택한 프로젝트와 `.env.local` 프로젝트가 일치하는지 확인합니다. 검사에 실패하면 표시된 값부터 수정하세요. 배포된 뒤 Firebase Console → Hosting에서 배포 버전과 사이트 주소를 확인할 수 있습니다.

`storage.cors.json`은 `galpi.web.app`을 허용합니다. 배포 후 Firebase Storage 버킷에 위 CORS 설정을 적용하고, `https://galpi.web.app`에서 로그인·표지 보기를 확인하세요. 별도 커스텀 도메인을 연결하면 Authentication 승인 도메인과 `storage.cors.json`에 해당 도메인도 추가해야 합니다.

배포 프로젝트를 바꾸려면 `npx firebase use --add`로 새 프로젝트를 선택합니다. 프로젝트 설정 중간에 멈추면 **Firestore와 Storage의 위치는 생성 후 변경할 수 없으므로**, 데이터베이스나 버킷을 만들기 전에 지역을 다시 확인하세요.

Firebase 규칙 원본은 `firestore.rules`, `storage.rules`입니다. 저장소의 placeholder는 접근을 허용하지 않습니다. 실제 배포 규칙은 `.env.local`의 UID로 생성되며 Git에서 제외됩니다. `npm run deploy`는 실서비스 설정이 빠졌거나 로컬 에뮬레이터 모드면 중단합니다. 테스트는 모두 `demo-galpi`만 사용하며 운영 데이터에 접근하지 않습니다.

규칙이 보장하는 범위:

- `request.auth.uid == 경로 uid == 설정된 소유자 UID`만 작품과 표지에 접근합니다. 별도의 로그인 계정도 차단합니다.
- 작품 필드와 종류별 세부 유형, 길이, 표지 경로의 소유자·작품 ID, 서버 시간, 상태에 따른 `finishedAt`을 검사합니다. `createdAt`과 기존 완료 날짜 변조를 거부합니다.
- 이미지는 빈 파일과 3MB 초과를 거부하고 WebP/JPEG/PNG MIME 및 확장자의 일치를 검사합니다. 기존 파일 덮어쓰기와 다른 경로 접근은 거부합니다. 규칙은 실제 바이트를 디코딩하지 않으므로 앱에서도 이미지를 디코딩·재인코딩합니다.

Firebase Authentication 자체에는 Firestore 형태의 Security Rules가 없습니다. 이메일/비밀번호 로그인, 브라우저 세션 유지, 소유자 UID 확인은 앱에서 처리하고 **데이터 접근은 양쪽 서비스의 Rules로 재검증**합니다. 로그인 세션은 이 기기에 유지되고, 로그인 화면에는 앱이 기억한 이메일이 표시됩니다. 비밀번호는 앱에 저장하지 않습니다. 같은 웹 도메인에서 Safari가 저장된 암호를 제안할 수 있으며, 자동 완성 동작은 iPhone 설정이 제어합니다.

## 데이터와 실패 복구

Firestore: `users/{uid}/books/{bookId}`. 기존 경로는 유지해 책 기록을 마이그레이션 없이 보존합니다. `mediaType`은 `book`, `drama`, `movie` 중 하나이고, 이전 문서에서 이 필드가 빠져 있으면 책으로 읽습니다. 책에만 웹소설·일반 도서·기타 `type`을 저장합니다. 문서에는 `id`를 중복 저장하지 않으며 `createdAt` / `updatedAt`은 서버 시간을 사용합니다. 새 책 기록의 기본값은 **완료 / 웹소설**입니다. 완료로 전환할 때만 `finishedAt`을 새로 설정하며 메모 수정에서는 유지합니다.

Storage: `users/{uid}/covers/{bookId}/{UUID}.webp`(지원되지 않으면 정확한 JPEG/PNG 확장자). 원본은 최대 12MB, 긴 변은 최대 1400px로 축소하고 변환 결과가 3MB 이하일 때만 업로드합니다. HEIC는 브라우저가 디코딩할 때 처리하며 미지원 브라우저에는 변환 안내를 표시합니다.

표지 저장 순서:

1. 새 표지 업로드 → Firestore 트랜잭션으로 새 경로 저장 → 이전 표지 삭제.
2. DB 저장 실패 → 새 표지 삭제 시도. 기존 기록과 표지는 유지하고 폼 입력을 보존합니다.
3. 표지 제거 또는 작품 삭제 → DB 변경 성공 → 표지 삭제 시도.

파일 정리 실패는 이미 성공한 기록 저장을 실패로 표시하지 않습니다. 콘솔에 해당 경로를 남기고 토스트를 표시합니다. **현재 세션의 설정 화면**에서 파일 정리를 재시도할 수 있습니다. 이 정리 대기열은 기기나 세션을 넘겨 보존하지 않습니다.

### 고아 파일을 안전하게 정리하는 방법

Firestore와 Storage 사이에는 트랜잭션이 없으므로 강제 종료, 장기 네트워크 장애, 정리 권한 오류 때 고아 파일이 남을 수 있습니다.

1. 진행 중인 저장이 없는지 확인하고, 로그에 표시된 파일 경로와 Storage Console의 파일을 확인합니다.
2. Firestore의 소유자 `books` 문서에서 **현재 `coverPath`로 참조하는 파일을 모두 제외**합니다. 같은 작품의 다른 기기 수정도 확인합니다.
3. 하루 이상 지난 미참조 파일만 Storage Console에서 수동 삭제합니다. 경로가 의심스러우면 삭제하지 않습니다. 파일 삭제는 복구할 수 없으므로 필요하면 먼저 보관하세요.

서재 전체 ZIP 백업·복원은 **P1로 제외**했습니다. Firebase 동기화는 독립 백업이 아닙니다. 관리자가 장기 보관할 때 메타데이터와 표지 파일을 함께 보관해야 합니다.

## 테스트와 검수

2026-10-18 실행 결과: TypeScript/PWA 빌드, 단위·UI·실패 복구 18개, 보안 규칙 12개, Chromium/WebKit E2E 12개가 통과했습니다. Firebase Hosting 사이트 `galpi`와 Firestore/Storage Rules를 프로젝트 `galpi-11e97`에 배포했고 공개 페이지·PWA 경로를 확인했습니다. 소유자 계정 로그인과 실제 iPhone 검수는 아직 하지 않았습니다.

```sh
npm test                       # 입력/검색/날짜/이미지 크기, UI, 저장 실패 복구
npm run test:rules             # Auth/Firestore/Storage 에뮬레이터의 접근·검증 규칙
npx playwright install chromium webkit
npm run test:e2e               # 에뮬레이터 인증·CRUD·표지, Chromium / mobile WebKit
npm run build                 # TypeScript 및 PWA 프로덕션 빌드
npm audit --omit=dev           # 배포 의존성 검사
```

규칙/E2E 검사는 자체 에뮬레이터를 시작하고 종료합니다. `npm run emulators`가 실행 중이면 먼저 종료하세요. E2E는 프로덕션 빌드에 로컬 에뮬레이터 설정을 넣어 검사합니다. **검사 직후의 `dist/`는 로컬 테스트용**입니다. 실제 배포 시 배포 훅이 실서비스 설정으로 다시 빌드합니다.

자동 검증은 실제 iPhone 하드웨어를 대신하지 않습니다. 최초 배포 후 다음을 수동 확인하세요.

- iPhone Safari 사진 선택(HEIC 포함) → 등록 → 검색 → 수정 → 표지 교체/제거 → 작품 삭제.
- 공유 → 홈 화면에 추가 → 독립 실행, 재실행 시 로그인 유지, 상하단 safe area와 키보드.
- Mac Safari/Chrome과 다른 기기에서 같은 계정으로 동기화, 실제 버킷 CORS.
- 저장 중 네트워크 차단과 복구, 배포 업데이트 알림 후 미저장 폼 보존.

2026-10-18 검증 시 배포 의존성 감사 경고는 0건입니다. Firebase CLI의 전이 개발 의존성에는 감사 경고 7건(높음 3, 보통 4)이 남아 있어 upstream 수정을 추적해야 합니다. 브라우저 빌드에는 포함되지 않습니다. Firestore의 Node 전용 gRPC 전이 의존성은 보안 수정 버전으로 고정합니다.

WebKit은 강제 페이지 이동·새로고침으로 종료된 로컬 에뮬레이터 Listen 요청을 CORS 오류로 보고할 수 있습니다. E2E는 명시적인 전체 페이지 이동 중 발생한 해당 루프백 요청 오류만 구분하며, 다른 JavaScript 오류와 CRUD·로그인 유지·이미지 검증은 그대로 검사합니다.

## UI / PWA 범위

- 한국어, 아이보리·세이지, 시스템 세리프 제목과 산세리프 UI. 외부 폰트 요청 없이 OS 폰트로 표시합니다.
- 2:3 표지, 이미지 `object-fit: contain`, 실패 시 ID 기반 표지, 지연 로딩과 세션 Blob 캐시. Object URL은 해제하며 로그아웃 때 캐시를 비웁니다.
- 책·드라마·영화 서재, 상태 요약·필터, 제목/작가·감독 검색, 최근 등록순. 신규/수정 폼 재사용, 중복 의심 경고, 이탈 확인, 중복 저장 방지.
- 192/512px 및 maskable 아이콘, 180px apple-touch-icon. 원본 아이콘은 `python3 scripts/generate-icons.py`로 재생성할 수 있습니다.
- 앱 셸만 Service Worker로 캐시합니다. Firestore 영구 캐시와 인증/표지 응답의 Service Worker 캐시는 사용하지 않습니다. 완전한 오프라인 조회·작성·동기화는 지원하지 않습니다.
- 새 버전은 사용자 선택으로 갱신하며, 수정/저장 중인 폼에서는 새로고침을 막습니다. 강제 업데이트를 하지 않습니다.

P1인 ZIP 백업/복원, 다음 책 지정, 읽은 날짜 수동 변경, 붙여넣기/드래그 앤 드롭, 출처 링크, 다크 모드, 연도별 모아보기는 구현하지 않았습니다.
