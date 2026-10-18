import { readFile } from 'node:fs/promises'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'
import {
  deleteObject,
  getBytes,
  listAll,
  ref,
  uploadBytes,
} from 'firebase/storage'

let env: RulesTestEnvironment
const uid = 'galpi-owner'
const path = `users/${uid}/books/book1`
const cover = `users/${uid}/covers/book1/test.webp`
const data = (extra = {}) => ({
  title: '책 한 권',
  author: '',
  note: '',
  type: 'webnovel',
  status: 'finished',
  coverPath: null,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  finishedAt: serverTimestamp(),
  ...extra,
})
beforeAll(async () => {
  const load = async (file: string) =>
    (await readFile(file, 'utf8')).replaceAll('REPLACE_WITH_OWNER_UID', uid)
  env = await initializeTestEnvironment({
    projectId: 'demo-galpi',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: await load('firestore.rules'),
    },
    storage: {
      host: '127.0.0.1',
      port: 9199,
      rules: await load('storage.rules'),
    },
  })
})
beforeEach(async () => {
  await env.clearFirestore()
  await env.clearStorage()
})
afterAll(async () => {
  await env?.cleanup()
})

describe('Firestore 소유자 전용 규칙', () => {
  it('소유자의 정상 CRUD와 목록 조회를 허용한다', async () => {
    const db = env.authenticatedContext(uid).firestore()
    await assertSucceeds(setDoc(doc(db, path), data()))
    const original = (await assertSucceeds(getDoc(doc(db, path)))).data()!
    await assertSucceeds(
      updateDoc(doc(db, path), {
        note: '수정한 메모',
        updatedAt: serverTimestamp(),
      }),
    )
    expect((await getDoc(doc(db, path))).data()!.finishedAt).toEqual(
      original.finishedAt,
    )
    expect(
      (await assertSucceeds(getDocs(collection(db, `users/${uid}/books`))))
        .size,
    ).toBe(1)
    await assertSucceeds(deleteDoc(doc(db, path)))
  })
  it.each(['anonymous', 'intruder'])(
    '%s의 읽기/쓰기/목록/삭제 및 자기 경로도 차단한다',
    async (who) => {
      await env.withSecurityRulesDisabled(async (c) =>
        setDoc(doc(c.firestore(), path), data()),
      )
      const db = (
        who === 'anonymous'
          ? env.unauthenticatedContext()
          : env.authenticatedContext(who)
      ).firestore()
      await assertFails(getDoc(doc(db, path)))
      await assertFails(getDocs(collection(db, `users/${uid}/books`)))
      await assertFails(setDoc(doc(db, `users/${uid}/books/new`), data()))
      await assertFails(setDoc(doc(db, `users/intruder/books/new`), data()))
      await assertFails(
        updateDoc(doc(db, path), {
          title: '침입',
          updatedAt: serverTimestamp(),
        }),
      )
      await assertFails(deleteDoc(doc(db, path)))
    },
  )
  it('소유자라도 다른 사용자 경로와 미정의 경로에는 접근할 수 없다', async () => {
    const db = env.authenticatedContext(uid).firestore()
    await assertFails(setDoc(doc(db, 'users/someone/books/book1'), data()))
    await assertFails(setDoc(doc(db, 'public/book1'), data()))
  })
  it('필드, 길이, enum, 공백 제목, 시간 위조를 거부한다', async () => {
    const db = env.authenticatedContext(uid).firestore()
    for (const extra of [
      { title: '   ' },
      { title: 'a'.repeat(121) },
      { author: 'a'.repeat(121) },
      { note: 'a'.repeat(2001) },
      { type: 'comic' },
      { status: 'unknown' },
      { id: 'stored-id' },
      { author: 42 },
      { createdAt: Timestamp.fromMillis(1) },
      { updatedAt: Timestamp.fromMillis(1) },
      { finishedAt: null },
    ]) {
      await assertFails(setDoc(doc(db, path), data(extra)))
    }
    const missing = data() as Record<string, unknown>
    delete missing.note
    await assertFails(setDoc(doc(db, path), missing))
    await setDoc(doc(db, path), data())
    await assertFails(
      updateDoc(doc(db, path), {
        createdAt: Timestamp.fromMillis(1),
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(doc(db, path), {
        finishedAt: Timestamp.fromMillis(1),
        updatedAt: serverTimestamp(),
      }),
    )
  })
  it('표지 경로를 소유자와 해당 작품 하위로 제한한다', async () => {
    const db = env.authenticatedContext(uid).firestore()
    await assertSucceeds(setDoc(doc(db, path), data({ coverPath: cover })))
    for (const coverPath of [
      'https://example.com/cover.webp',
      'users/other/covers/book1/a.webp',
      `users/${uid}/covers/other/a.webp`,
      `users/${uid}/covers/book1/a.svg`,
    ]) {
      await assertFails(
        updateDoc(doc(db, path), { coverPath, updatedAt: serverTimestamp() }),
      )
    }
  })
  it('상태와 finishedAt 전환을 강제하고 읽음 날짜를 보존한다', async () => {
    const db = env.authenticatedContext(uid).firestore()
    const target = doc(db, path)
    await assertFails(setDoc(target, data({ status: 'planned' })))
    await assertSucceeds(
      setDoc(target, data({ status: 'planned', finishedAt: null })),
    )
    await assertFails(
      updateDoc(target, { status: 'finished', updatedAt: serverTimestamp() }),
    )
    await assertSucceeds(
      updateDoc(target, {
        status: 'finished',
        finishedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(target, { status: 'reading', updatedAt: serverTimestamp() }),
    )
    await assertSucceeds(
      updateDoc(target, {
        status: 'reading',
        finishedAt: null,
        updatedAt: serverTimestamp(),
      }),
    )
  })
})
describe('Storage 소유자 전용 규칙', () => {
  it('소유자 업로드/읽기/삭제를 허용하고 덮어쓰기를 금지한다', async () => {
    const store = env.authenticatedContext(uid).storage()
    const target = ref(store, cover)
    await assertSucceeds(
      uploadBytes(target, new Uint8Array([1, 2, 3]), {
        contentType: 'image/webp',
      }),
    )
    await assertSucceeds(getBytes(target))
    await assertFails(
      uploadBytes(target, new Uint8Array([4]), { contentType: 'image/webp' }),
    )
    await assertSucceeds(deleteObject(target))
  })
  it.each(['anonymous', 'intruder'])(
    '%s의 표지 읽기/쓰기/삭제/목록을 차단한다',
    async (who) => {
      await env.withSecurityRulesDisabled(async (c) =>
        uploadBytes(ref(c.storage(), cover), new Uint8Array([1]), {
          contentType: 'image/webp',
        }),
      )
      const store = (
        who === 'anonymous'
          ? env.unauthenticatedContext()
          : env.authenticatedContext(who)
      ).storage()
      await assertFails(getBytes(ref(store, cover)))
      await assertFails(
        uploadBytes(
          ref(store, cover.replace('test', 'new')),
          new Uint8Array([1]),
          { contentType: 'image/webp' },
        ),
      )
      await assertFails(
        uploadBytes(
          ref(store, 'users/intruder/covers/book1/a.webp'),
          new Uint8Array([1]),
          { contentType: 'image/webp' },
        ),
      )
      await assertFails(deleteObject(ref(store, cover)))
      await assertFails(listAll(ref(store, `users/${uid}/covers/book1`)))
    },
  )
  it('3MB 초과/빈 파일/MIME/확장자 불일치/임의 경로를 거절한다', async () => {
    const store = env.authenticatedContext(uid).storage()
    await assertFails(
      uploadBytes(ref(store, cover), new Uint8Array(3 * 1024 * 1024 + 1), {
        contentType: 'image/webp',
      }),
    )
    await assertFails(
      uploadBytes(ref(store, cover), new Uint8Array(0), {
        contentType: 'image/webp',
      }),
    )
    await assertFails(
      uploadBytes(ref(store, cover), new Uint8Array([1]), {
        contentType: 'image/svg+xml',
      }),
    )
    await assertFails(
      uploadBytes(ref(store, cover), new Uint8Array([1]), {
        contentType: 'image/png',
      }),
    )
    await assertFails(
      uploadBytes(
        ref(store, `users/${uid}/covers/book1/x.svg`),
        new Uint8Array([1]),
        { contentType: 'image/webp' },
      ),
    )
    await assertFails(
      uploadBytes(ref(store, 'public/test.webp'), new Uint8Array([1]), {
        contentType: 'image/webp',
      }),
    )
    await assertSucceeds(
      uploadBytes(
        ref(store, `users/${uid}/covers/book1/a.jpeg`),
        new Uint8Array([1]),
        { contentType: 'image/jpeg' },
      ),
    )
    await assertSucceeds(
      uploadBytes(
        ref(store, `users/${uid}/covers/book1/b.png`),
        new Uint8Array([1]),
        { contentType: 'image/png' },
      ),
    )
  })
})
