import { describe, expect, it } from 'vitest'
import { Timestamp } from 'firebase/firestore'
import {
  coverTone,
  emptyBook,
  filterBooks,
  finishedAtFor,
  isDuplicate,
  validateBook,
  type Book,
} from '../src/book'
import { resizedDimensions } from '../src/image'

const book = (overrides: Partial<Book> = {}): Book => ({
  ...emptyBook,
  id: 'a',
  title: '달빛 도서관',
  author: '한여름',
  coverPath: null,
  createdAt: Timestamp.fromMillis(1),
  updatedAt: null,
  finishedAt: Timestamp.fromMillis(1),
  ...overrides,
})
describe('작품 기록', () => {
  it('제목만으로 등록하며 책 기본값을 유지한다', () => {
    expect(validateBook({ ...emptyBook, title: '  책 한 권  ' })).toEqual({
      ...emptyBook,
      title: '책 한 권',
    })
  })
  it('책·드라마·영화를 검증하고 책이 아닌 유형에서 책 세부 유형을 제거한다', () => {
    expect(
      validateBook({ ...emptyBook, title: '드라마', mediaType: 'drama' }),
    ).toMatchObject({ mediaType: 'drama' })
    expect(
      validateBook({ ...emptyBook, title: '영화', mediaType: 'movie' }),
    ).toMatchObject({ mediaType: 'movie' })
    expect(
      validateBook({
        ...emptyBook,
        title: '영화',
        mediaType: 'movie',
        type: 'book',
      }),
    ).not.toHaveProperty('type')
    expect(
      validateBook({
        ...emptyBook,
        title: '드라마',
        mediaType: 'drama',
        actors: ' 배우 하나 , , 배우 둘  ',
      }).actors,
    ).toBe('배우 하나, 배우 둘')
    expect(() =>
      validateBook({
        ...emptyBook,
        title: '영화',
        mediaType: 'movie',
        actors: '배우'.repeat(501),
      }),
    ).toThrow('출연 배우는 500자 이내로 입력해 주세요.')
    expect(() =>
      validateBook({ ...emptyBook, title: '작품', mediaType: 'series' } as never),
    ).toThrow()
  })
  it('공백 제목, 긴 입력, 잘못된 상태를 거절한다', () => {
    for (const data of [
      { title: ' \n ' },
      { title: 'a'.repeat(121) },
      { author: 'a'.repeat(121) },
      { note: 'a'.repeat(2001) },
      { status: 'invalid' },
      { status: 'constructor' },
      { type: '__proto__' },
      { mediaType: '__proto__' },
    ]) {
      expect(() =>
        validateBook({
          ...emptyBook,
          title: '책',
          ...data,
        } as typeof emptyBook),
      ).toThrow()
    }
  })
  it('제목/작가 검색과 상태를 함께 적용하며 날짜와 ID로 정렬한다', () => {
    const books = [
      book(),
      book({ id: 'b', status: 'reading' }),
      book({ id: 'c', title: 'HELLO', author: '작가' }),
      book({
        id: 'd',
        title: '파도 너머',
        mediaType: 'drama',
        actors: '배우 하나, 배우 둘',
      }),
    ]
    expect(filterBooks(books, ' 한여름 ', 'reading').map((b) => b.id)).toEqual([
      'b',
    ])
    expect(filterBooks(books, 'hello', 'all').map((b) => b.id)).toEqual(['c'])
    expect(filterBooks(books, '배우 둘', 'all').map((b) => b.id)).toEqual(['d'])
    expect(filterBooks(books, '달빛', 'all').map((b) => b.id)).toEqual([
      'b',
      'a',
    ])
    expect(
      filterBooks([book({ title: '한글'.normalize('NFD') })], '한글', 'all'),
    ).toHaveLength(1)
  })
  it('동일 제목/작가는 경고하고 수정 중인 자신은 제외한다', () => {
    expect(
      isDuplicate([book()], {
        ...emptyBook,
        title: ' 달빛 도서관 ',
        author: '한여름',
      }),
    ).toBe(true)
    expect(
      isDuplicate(
        [book()],
        { ...emptyBook, title: '달빛 도서관', author: '한여름', mediaType: 'movie' },
      ),
    ).toBe(false)
    expect(
      isDuplicate(
        [book({ mediaType: 'movie', actors: '배우 하나, 배우 둘' })],
        {
          ...emptyBook,
          title: '달빛 도서관',
          mediaType: 'movie',
          actors: '배우 하나 , 배우 둘',
        },
      ),
    ).toBe(true)
    expect(isDuplicate([book()], book(), 'a')).toBe(false)
  })
  it('읽음 진입 때 날짜를 설정하고 메모 수정 때 보존하며 이탈 때 지운다', () => {
    const previous = book()
    const now = Timestamp.now()
    expect(finishedAtFor('finished', undefined, now)).toBe(now)
    expect(
      finishedAtFor(
        'finished',
        book({ status: 'reading', finishedAt: null }),
        now,
      ),
    ).toBe(now)
    expect(finishedAtFor('finished', previous, now)).toBe(previous.finishedAt)
    expect(finishedAtFor('reading', previous, now)).toBeNull()
    expect(finishedAtFor('planned', previous, now)).toBeNull()
  })
  it('같은 ID의 표지 색상이 고정된다', () => {
    expect(coverTone('이야기')).toBe(coverTone('이야기'))
    expect(coverTone('test')).toBeLessThan(6)
  })
  it('이미지 비율을 보존해 긴 변 1400px까지만 축소한다', () => {
    expect(resizedDimensions(2800, 4200)).toEqual({ width: 933, height: 1400 })
    expect(resizedDimensions(600, 400)).toEqual({ width: 600, height: 400 })
    expect(resizedDimensions(10000, 1).height).toBe(1)
  })
})
