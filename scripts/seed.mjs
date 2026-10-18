import { initializeApp } from 'firebase/app'
import {
  connectAuthEmulator,
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import {
  connectFirestoreEmulator,
  doc,
  getFirestore,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'

// Deliberately hard-coded to demo-* and loopback: this script cannot seed production.
const app = initializeApp({ apiKey: 'demo-api-key', projectId: 'demo-galpi' })
const auth = getAuth(app)
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
const db = getFirestore(app)
connectFirestoreEmulator(db, '127.0.0.1', 8080)
const email = 'owner@galpi.local'
const password = 'galpi-local-only'
const create = await fetch(
  'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-galpi/accounts',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer owner',
    },
    body: JSON.stringify({
      localId: 'galpi-owner',
      email,
      password,
      emailVerified: true,
    }),
  },
)
if (!create.ok && !/EMAIL_EXISTS|DUPLICATE_LOCAL_ID/.test(await create.text()))
  throw new Error('에뮬레이터 계정을 생성하지 못했습니다.')
await signInWithEmailAndPassword(auth, email, password)
if (process.argv.includes('--books')) {
  const stories = [
    ['밤을 건너는 도서관', '윤서하', 'reading', 'webnovel'],
    ['계절의 가장자리', '이유림', 'finished', 'book'],
    ['마지막 정원사', '정해온', 'planned', 'webnovel'],
    ['우리가 머문 여름', '김여울', 'finished', 'book'],
    ['별을 수놓는 사람', '서도하', 'reading', 'webnovel'],
    ['아주 느린 산책', '한나래', 'finished', 'book'],
    ['잊힌 세계의 기록', '류시온', 'planned', 'webnovel'],
    ['종이 위의 작은 숲', '문다정', 'finished', 'other'],
  ]
  for (const [i, [title, author, status, type]] of stories.entries()) {
    const target = doc(db, 'users/galpi-owner/books', `sample-${i}`)
    if ((await getDoc(target)).exists()) continue
    await setDoc(target, {
      title,
      author,
      status,
      type,
      note: '로컬 디자인 검수용 가상 작품입니다. 실제 작품 정보가 아닙니다.',
      coverPath: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      finishedAt: status === 'finished' ? serverTimestamp() : null,
    })
  }
}
console.log('로컬 계정 준비 완료: owner@galpi.local / galpi-local-only')
process.exit(0)
