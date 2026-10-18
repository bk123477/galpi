import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore'
import {
  deleteObject,
  getBlob,
  ref,
  uploadBytesResumable,
} from 'firebase/storage'
import { db, storage, ownerUid } from './firebase'
import { finishedAtFor, validateBook, type Book, type BookInput } from './book'
import { MAX_COVER_SIZE } from './image'

export function requireOnline() {
  if (!navigator.onLine) throw new Error('인터넷 연결 후 다시 시도해 주세요.')
}
export function errorMessage(error: unknown) {
  const code = (error as { code?: string })?.code ?? ''
  if (/permission-denied|unauthorized/.test(code))
    return '접근 권한이 없어요. 소유자 계정과 Firebase 보안 설정을 확인해 주세요.'
  if (/network|unavailable|retry-limit/.test(code))
    return '연결이 원활하지 않아요. 입력한 내용은 그대로 있으니 다시 시도해 주세요.'
  if (
    /invalid-credential|wrong-password|user-not-found|invalid-email/.test(code)
  )
    return '이메일 또는 비밀번호를 확인해 주세요.'
  if (/too-many-requests/.test(code))
    return '로그인 시도가 많아요. 잠시 후 다시 시도해 주세요.'
  return error instanceof Error && !code
    ? error.message
    : '처리하지 못했어요. 연결과 Firebase 설정을 확인한 뒤 다시 시도해 주세요.'
}
const booksRef = () => collection(db!, 'users', ownerUid, 'books')
export function watchBooks(
  onBooks: (books: Book[]) => void,
  onError: (error: unknown) => void,
) {
  return onSnapshot(
    query(booksRef(), orderBy('createdAt', 'desc')),
    (snapshot) => {
      onBooks(
        snapshot.docs.map(
          (d) =>
            ({ ...d.data({ serverTimestamps: 'estimate' }), id: d.id }) as Book,
        ),
      )
    },
    onError,
  )
}

const cleanup = new Set<string>()
export function pendingCleanup() {
  return cleanup.size
}
export async function removeCover(path: string) {
  try {
    await deleteObject(ref(storage!, path))
    cleanup.delete(path)
    blobCache.delete(path)
  } catch (error) {
    if ((error as { code?: string }).code === 'storage/object-not-found') {
      cleanup.delete(path)
      return
    }
    cleanup.add(path)
    console.warn(
      '표지 파일 정리 실패. 설정에서 재시도하거나 README의 정리 절차를 확인하세요.',
      path,
      error,
    )
  }
}
export async function retryCleanup() {
  requireOnline()
  await Promise.all([...cleanup].map(removeCover))
  return cleanup.size
}

export async function saveBook(
  input: BookInput,
  existing: Book | undefined,
  cover: Blob | null | undefined,
  onProgress: (percent: number) => void,
) {
  requireOnline()
  const data = validateBook(input)
  const bookRef = existing ? doc(booksRef(), existing.id) : doc(booksRef())
  let uploaded: string | undefined
  let previousPath: string | null = null
  if (cover) {
    const extension = (
      {
        'image/webp': 'webp',
        'image/jpeg': 'jpeg',
        'image/png': 'png',
      } as Record<string, string>
    )[cover.type]
    if (!extension || cover.size > MAX_COVER_SIZE || cover.size === 0)
      throw new Error('표지는 WebP, JPEG, PNG 형식의 3MB 이하 이미지여야 해요.')
    const path = `users/${ownerUid}/covers/${bookRef.id}/${crypto.randomUUID()}.${extension}`
    try {
      await new Promise<void>((resolve, reject) => {
        const upload = uploadBytesResumable(ref(storage!, path), cover, {
          contentType: cover.type,
          cacheControl: 'private,max-age=3600',
        })
        upload.on(
          'state_changed',
          (s) =>
            onProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
          reject,
          () => resolve(),
        )
      })
      uploaded = path
    } catch (error) {
      await removeCover(path)
      throw error
    }
  }
  try {
    await runTransaction(db!, async (transaction) => {
      const snapshot = await transaction.get(bookRef)
      if (existing && !snapshot.exists())
        throw new Error('이미 삭제된 작품이에요. 서재로 돌아가 확인해 주세요.')
      if (!existing && snapshot.exists())
        throw new Error('기록이 이미 존재해요. 서재에서 확인해 주세요.')
      const previous = snapshot.exists()
        ? ({ ...snapshot.data(), id: bookRef.id } as Book)
        : undefined
      previousPath = previous?.coverPath ?? null
      transaction.set(bookRef, {
        ...data,
        coverPath: uploaded ?? (cover === null ? null : previousPath),
        createdAt: previous?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
        finishedAt: finishedAtFor(data.status, previous, serverTimestamp()),
      })
    })
  } catch (error) {
    if (uploaded) await removeCover(uploaded)
    throw error
  }
  if (previousPath && (uploaded || cover === null))
    await removeCover(previousPath)
  return bookRef.id
}
export async function deleteBook(book: Book) {
  requireOnline()
  const bookRef = doc(booksRef(), book.id)
  const path = await runTransaction(db!, async (transaction) => {
    const snapshot = await transaction.get(bookRef)
    if (!snapshot.exists()) return null
    transaction.delete(bookRef)
    return snapshot.data().coverPath as string | null
  })
  if (path) await removeCover(path)
}

const blobCache = new Map<string, Promise<Blob>>()
export function coverBlob(path: string) {
  let blob = blobCache.get(path)
  if (!blob) {
    blob = getBlob(ref(storage!, path), MAX_COVER_SIZE)
    blobCache.set(path, blob)
    blob.catch(() => {
      if (blobCache.get(path) === blob) blobCache.delete(path)
    })
    if (blobCache.size > 40) blobCache.delete(blobCache.keys().next().value!)
  }
  return blob
}
export function clearPrivateCache() {
  blobCache.clear()
  cleanup.clear()
}
