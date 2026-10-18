import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  run: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  getBlob: vi.fn(),
}))
vi.mock('../src/firebase', () => ({ db: {}, storage: {}, ownerUid: 'owner' }))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn(() => ({ id: 'new-id' })),
  serverTimestamp: () => 'server-time',
  runTransaction: mocks.run,
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
}))
vi.mock('firebase/storage', () => ({
  ref: (_: unknown, path: string) => path,
  uploadBytesResumable: mocks.upload,
  deleteObject: mocks.remove,
  getBlob: mocks.getBlob,
}))
import {
  clearPrivateCache,
  deleteBook,
  pendingCleanup,
  retryCleanup,
  saveBook,
} from '../src/services'
import { emptyBook, type Book } from '../src/book'
const old: Book = {
  ...emptyBook,
  id: 'old-id',
  title: '작품',
  coverPath: 'old-cover',
  createdAt: null,
  updatedAt: null,
  finishedAt: null,
}
const image = new Blob(['image'], { type: 'image/webp' })
let writes: ReturnType<typeof vi.fn>
beforeEach(() => {
  vi.clearAllMocks()
  clearPrivateCache()
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  writes = vi.fn()
  mocks.remove.mockResolvedValue(undefined)
  mocks.upload.mockReturnValue({
    on: (
      _: string,
      progress: (s: unknown) => void,
      _error: unknown,
      done: () => void,
    ) => {
      progress({ bytesTransferred: 1, totalBytes: 1 })
      done()
    },
  })
  mocks.run.mockImplementation(async (_db, callback) =>
    callback({
      get: async () => ({ exists: () => true, data: () => old }),
      set: writes,
      delete: writes,
    }),
  )
})
describe('이미지와 DB 저장 순서 및 실패 복구', () => {
  it('교체 시 DB 저장 후에만 이전 표지를 삭제한다', async () => {
    await saveBook({ ...emptyBook, title: '수정' }, old, image, vi.fn())
    expect(mocks.upload).toHaveBeenCalledOnce()
    expect(writes.mock.calls[0][1].coverPath).toMatch(
      /^users\/owner\/covers\/new-id\/.+\.webp$/,
    )
    expect(mocks.remove).toHaveBeenCalledWith('old-cover')
    expect(mocks.run.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.remove.mock.invocationCallOrder[0],
    )
  })
  it('DB 실패 시 새 파일만 지우고 이전 표지를 유지한다', async () => {
    mocks.run.mockRejectedValueOnce(new Error('DB 실패'))
    await expect(
      saveBook({ ...emptyBook, title: '제목' }, old, image, vi.fn()),
    ).rejects.toThrow('DB 실패')
    expect(mocks.remove).toHaveBeenCalledOnce()
    expect(mocks.remove.mock.calls[0][0]).not.toBe('old-cover')
  })
  it('업로드 실패 시 DB를 변경하지 않고 정리를 시도한다', async () => {
    mocks.upload.mockReturnValueOnce({
      on: (_: string, _progress: unknown, fail: (e: Error) => void) =>
        fail(new Error('업로드 실패')),
    })
    await expect(
      saveBook({ ...emptyBook, title: '제목' }, old, image, vi.fn()),
    ).rejects.toThrow('업로드 실패')
    expect(mocks.run).not.toHaveBeenCalled()
    expect(mocks.remove).toHaveBeenCalledOnce()
  })
  it('이전 파일 정리 실패는 저장 성공을 유지하고 재시도를 제공한다', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    mocks.remove.mockRejectedValueOnce(new Error('정리 실패'))
    await expect(
      saveBook({ ...emptyBook, title: '제목' }, old, null, vi.fn()),
    ).resolves.toBe('new-id')
    expect(writes.mock.calls[0][1].coverPath).toBeNull()
    expect(pendingCleanup()).toBe(1)
    expect(await retryCleanup()).toBe(0)
  })
  it('삭제할 때 DB가 실패하면 표지를 지우지 않는다', async () => {
    mocks.run.mockRejectedValueOnce(new Error('DB 실패'))
    await expect(deleteBook(old)).rejects.toThrow()
    expect(mocks.remove).not.toHaveBeenCalled()
  })
  it('삭제된 작품을 수정으로 다시 생성하지 않는다', async () => {
    mocks.run.mockImplementationOnce(async (_db, callback) =>
      callback({ get: async () => ({ exists: () => false }), set: writes }),
    )
    await expect(
      saveBook({ ...emptyBook, title: '제목' }, old, undefined, vi.fn()),
    ).rejects.toThrow('이미 삭제된')
    expect(writes).not.toHaveBeenCalled()
  })
  it('오프라인일 때 업로드와 DB 요청을 시작하지 않는다', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    await expect(
      saveBook({ ...emptyBook, title: '제목' }, undefined, image, vi.fn()),
    ).rejects.toThrow('인터넷 연결')
    expect(mocks.upload).not.toHaveBeenCalled()
    expect(mocks.run).not.toHaveBeenCalled()
  })
})
