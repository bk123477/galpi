import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  BookOpen,
  Plus,
  Settings,
  X,
} from 'lucide-react'
import { coverTone, statuses, type Book } from './book'
import { coverBlob } from './services'

export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="갈피 서재로">
      <span className="brand-icon">
        <Bookmark size={21} strokeWidth={1.6} />
      </span>
      <span>
        갈피<span className="brand-latin">GALPI</span>
      </span>
    </Link>
  )
}
export function Header() {
  return (
    <header className="app-header">
      <Brand />
      <div className="header-right">
        <span className="private-label">
          <span />
          나만의 조용한 서재
        </span>
        <Link to="/settings" className="icon-button" aria-label="설정">
          <Settings size={20} strokeWidth={1.5} />
        </Link>
      </div>
    </header>
  )
}
export function PageHeading({
  title,
  eyebrow,
  children,
}: {
  title: string
  eyebrow: string
  children?: ReactNode
}) {
  return (
    <div className="page-heading">
      <Link to="/" className="back-link">
        <ArrowLeft size={17} />
        서재로
      </Link>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children}
    </div>
  )
}
export function Status({ book }: { book: Pick<Book, 'status'> }) {
  return (
    <span className={`status status-${book.status}`}>
      <span />
      {statuses[book.status]}
    </span>
  )
}
export function Cover({
  book,
  localUrl,
  large = false,
}: {
  book: Pick<Book, 'id' | 'title' | 'author' | 'coverPath' | 'type'>
  localUrl?: string
  large?: boolean
}) {
  const container = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(large)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const [source, setSource] = useState<{ path: string; url: string } | null>(
    null,
  )
  const path = book.coverPath
  useEffect(() => {
    if (visible || !container.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '100px' },
    )
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [visible])
  useEffect(() => {
    setLoaded(false)
    setFailed(false)
    if (!path || !visible || localUrl) return
    let active = true
    let url: string | undefined
    coverBlob(path)
      .then((blob) => {
        if (active) {
          url = URL.createObjectURL(blob)
          setSource({ path, url })
        }
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [path, visible, localUrl])
  const src = localUrl || (source?.path === path ? source.url : undefined)
  const showImage = src && !failed
  return (
    <div
      ref={container}
      className={`book-cover tone-${coverTone(book.id)} ${large ? 'cover-large' : ''} ${path && !loaded && !failed && !localUrl ? 'cover-loading' : ''}`}
    >
      <div className="cover-art" aria-hidden="true">
        <span className="cover-edition">GALPI · PERSONAL LIBRARY</span>
        <span className="cover-symbol">
          <span />
        </span>
        <span className="cover-title">{book.title || '새로운 이야기'}</span>
        {book.author && <span className="cover-author">{book.author}</span>}
        <span className="cover-foot">이야기가 머무는 자리</span>
      </div>
      {showImage && (
        <img
          src={src}
          alt={`${book.title || '선택한 작품'} 표지`}
          loading={large || localUrl ? 'eager' : 'lazy'}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setFailed(true)
            setLoaded(false)
          }}
        />
      )}
    </div>
  )
}
export function BookCard({ book }: { book: Book }) {
  return (
    <Link
      className="book-card"
      to={`/books/${book.id}`}
      aria-label={`${book.title}${book.author ? ` · ${book.author}` : ''} · ${statuses[book.status]}`}
    >
      <Cover book={book} />
      <div className="book-card-info">
        <h2>{book.title}</h2>
        <p className="book-author">{book.author || '작가 미기록'}</p>
        <Status book={book} />
      </div>
      <ArrowUpRight className="card-arrow" size={16} aria-hidden="true" />
    </Link>
  )
}
export function Empty({
  search = false,
  onReset,
}: {
  search?: boolean
  onReset?: () => void
}) {
  return (
    <div className="empty-state">
      <div className="empty-books" aria-hidden="true">
        <span />
        <span>
          <Bookmark size={24} strokeWidth={1} />
        </span>
        <span />
      </div>
      <p className="eyebrow">
        {search ? 'A LITTLE MORE EXPLORING' : 'YOUR NEXT CHAPTER'}
      </p>
      <h2>
        {search ? '일치하는 작품이 없어요.' : '첫 이야기를 서가에 꽂아볼까요?'}
      </h2>
      <p>
        {search
          ? '다른 제목이나 작가로 찾아보세요.'
          : '좋아했던 제목 하나면 충분해요.\n기억하고 싶은 이야기를 차곡차곡 모아보세요.'}
      </p>
      {search ? (
        <button className="button button-secondary" onClick={onReset}>
          검색·필터 초기화
        </button>
      ) : (
        <Link className="button button-primary" to="/books/new">
          <Plus size={18} />첫 작품 기록하기
        </Link>
      )}
    </div>
  )
}
export function Loading({ full = false }: { full?: boolean }) {
  return (
    <div
      className={full ? 'full-loading' : 'grid-skeleton'}
      role="status"
      aria-label="불러오는 중"
    >
      {full ? (
        <>
          <BookOpen className="loading-mark" size={32} strokeWidth={1} />
          <p>서재를 열고 있어요</p>
        </>
      ) : (
        Array.from({ length: 6 }, (_, i) => (
          <div key={i}>
            <div className="skeleton-cover" />
            <div className="skeleton-line" />
          </div>
        ))
      )}
    </div>
  )
}
export function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="error-state" role="alert">
      <BookOpen size={28} strokeWidth={1} />
      <h2>잠시 책장을 열지 못했어요.</h2>
      <p>{message}</p>
      {onRetry && (
        <button className="button button-secondary" onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  )
}
export function ConfirmDialog({
  title,
  children,
  confirm,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string
  children: ReactNode
  confirm: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    dialog.current?.showModal()
    cancel.current?.focus()
    return () => {
      dialog.current?.close()
      previous?.focus()
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      className="confirm-dialog"
      aria-labelledby="dialog-title"
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onCancel()
      }}
    >
      <div className="dialog-icon">
        <Bookmark size={23} strokeWidth={1.5} />
      </div>
      <h2 id="dialog-title">{title}</h2>
      <div className="dialog-body">{children}</div>
      <div className="dialog-actions">
        <button
          ref={cancel}
          className="button button-secondary"
          onClick={onCancel}
          disabled={busy}
        >
          계속 머무르기
        </button>
        <button
          className={`button ${danger ? 'button-danger' : 'button-primary'}`}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? '처리 중…' : confirm}
        </button>
      </div>
    </dialog>
  )
}
export function FieldError({ children }: { children: ReactNode }) {
  return (
    <p className="field-error" role="alert">
      <X size={15} />
      {children}
    </p>
  )
}
