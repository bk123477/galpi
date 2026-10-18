import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
vi.mock('../src/services', () => ({ coverBlob: vi.fn() }))
import { BookCard, Empty } from '../src/components'
import { emptyBook } from '../src/book'

describe('서재 UI', () => {
  it('제목, 작가, 색상에 의존하지 않는 상태를 표시한다', () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
      },
    )
    render(
      <MemoryRouter>
        <BookCard
          book={{
            ...emptyBook,
            id: 'id',
            title: '책',
            author: '작가',
            coverPath: null,
            createdAt: null,
            updatedAt: null,
            finishedAt: null,
          }}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: '책' })).toBeVisible()
    expect(screen.getByText('읽음')).toBeVisible()
    expect(screen.getByRole('link')).toHaveAttribute('href', '/books/id')
  })
  it('검색 결과가 없으면 검색과 필터 초기화를 제공한다', () => {
    const reset = vi.fn()
    render(<Empty search onReset={reset} />)
    fireEvent.click(screen.getByRole('button', { name: '검색·필터 초기화' }))
    expect(reset).toHaveBeenCalledOnce()
  })
})
