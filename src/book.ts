import type { Timestamp } from 'firebase/firestore'

export const statuses = {
  reading: '읽는 중',
  planned: '읽을 예정',
  finished: '읽음',
} as const
export const types = {
  webnovel: '웹소설',
  book: '일반 도서',
  other: '기타',
} as const
export type BookStatus = keyof typeof statuses
export type BookType = keyof typeof types
export interface BookInput {
  title: string
  author: string
  note: string
  status: BookStatus
  type: BookType
}
export interface Book extends BookInput {
  id: string
  coverPath: string | null
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
  finishedAt: Timestamp | null
}
export const emptyBook: BookInput = {
  title: '',
  author: '',
  note: '',
  status: 'finished',
  type: 'webnovel',
}

export function validateBook(input: BookInput): BookInput {
  const data = {
    ...input,
    title: input.title.trim(),
    author: input.author.trim(),
  }
  if (!data.title) throw new Error('제목을 입력해 주세요.')
  if (data.title.length > 120 || data.author.length > 120)
    throw new Error('제목과 작가는 120자 이내로 입력해 주세요.')
  if (data.note.length > 2000)
    throw new Error('메모는 2,000자 이내로 입력해 주세요.')
  if (!Object.hasOwn(statuses, data.status) || !Object.hasOwn(types, data.type))
    throw new Error('독서 상태와 작품 유형을 확인해 주세요.')
  return data
}
const normalize = (value: string) =>
  value.trim().normalize('NFC').toLocaleLowerCase('ko')
export function filterBooks(
  books: Book[],
  search: string,
  status: BookStatus | 'all',
) {
  const query = normalize(search)
  return books
    .filter(
      (b) =>
        (status === 'all' || b.status === status) &&
        (!query ||
          normalize(b.title).includes(query) ||
          normalize(b.author).includes(query)),
    )
    .sort(
      (a, b) =>
        (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0) ||
        b.id.localeCompare(a.id),
    )
}
export function isDuplicate(books: Book[], input: BookInput, id?: string) {
  return (
    !!input.title.trim() &&
    books.some(
      (b) =>
        b.id !== id &&
        normalize(b.title) === normalize(input.title) &&
        normalize(b.author) === normalize(input.author),
    )
  )
}
export function finishedAtFor(
  status: BookStatus,
  previous: Book | undefined,
  now: unknown,
) {
  return status !== 'finished'
    ? null
    : previous?.status === 'finished'
      ? previous.finishedAt
      : now
}
export function coverTone(id: string) {
  return [...id].reduce((hash, c) => (hash * 31 + c.charCodeAt(0)) >>> 0, 0) % 6
}
export function formatDate(date: Timestamp | null) {
  return date
    ? new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date.toDate())
    : ''
}
