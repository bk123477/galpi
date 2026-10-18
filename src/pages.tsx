import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  LogOut,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import { auth, authReady, ownerUid, useEmulators } from './firebase'
import { useLibrary } from './state'
import {
  bookTypes,
  filterBooks,
  formatDate,
  mediaTypes,
  statuses,
  type BookStatus,
  type MediaType,
} from './book'
import {
  deleteBook,
  errorMessage,
  pendingCleanup,
  requireOnline,
  retryCleanup,
} from './services'
import {
  BookCard,
  ConfirmDialog,
  Cover,
  Empty,
  ErrorState,
  FieldError,
  Loading,
  PageHeading,
  Status,
} from './components'

export function LoginPage() {
  const { user, authLoading, authError } = useLibrary()
  const [rememberedEmail, setRememberedEmail] = useState(() => {
    try {
      return localStorage.getItem('galpi.rememberedEmail') ?? ''
    } catch {
      return ''
    }
  })
  const [email, setEmail] = useState(rememberedEmail)
  const [editingEmail, setEditingEmail] = useState(!rememberedEmail)
  const [password, setPassword] = useState('')
  const [rememberEmail, setRememberEmail] = useState(true)
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (authLoading) return <Loading full />
  if (user) return <Navigate to="/" replace />
  function storeRememberedEmail(value: string) {
    const normalized = value.trim()
    setRememberedEmail(normalized)
    try {
      if (normalized) localStorage.setItem('galpi.rememberedEmail', normalized)
      else localStorage.removeItem('galpi.rememberedEmail')
    } catch {
      // Private browsing may block local storage; Firebase session still works.
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    try {
      requireOnline()
      await authReady
      const credential = await signInWithEmailAndPassword(
        auth!,
        email.trim(),
        password,
      )
      if (credential.user.uid !== ownerUid)
        throw new Error(
          '소유자 전용 서재예요. 등록된 소유자 계정으로 로그인해 주세요.',
        )
      storeRememberedEmail(rememberEmail ? email : '')
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <main id="main" className="login-page">
      <div className="login-story">
        <p className="eyebrow">A PLACE FOR THE STORIES YOU KEEP</p>
        <h1>
          이야기는 끝나도,
          <br />
          기억은 이곳에.
        </h1>
        <p>
          마지막 장을 덮은 뒤에도 오래 남는 이야기들.
          <br />
          당신만의 작은 서재에 갈피를 남겨보세요.
        </p>
        <div className="login-books" aria-hidden="true">
          <div>
            <span>
              오래도록
              <br />
              남는 문장
            </span>
            <i>STORIES WE KEEP</i>
          </div>
          <div>
            <Bookmark size={28} strokeWidth={1} />
            <span>
              나의
              <br />
              작은 서재
            </span>
            <i>갈피</i>
          </div>
          <div>
            <span>
              다음
              <br />
              이야기
            </span>
            <i>THE NEXT CHAPTER</i>
          </div>
        </div>
      </div>
      <section className="login-panel">
        <span className="login-bookmark">
          <Bookmark size={25} strokeWidth={1.4} />
        </span>
        <p className="eyebrow">WELCOME TO YOUR LIBRARY</p>
        <h2>다시 만나 반가워요.</h2>
        <p>소유자 계정으로 나의 서재를 열어주세요.</p>
        <form onSubmit={submit} autoComplete="off">
          {rememberedEmail && !editingEmail ? (
            <div className="remembered-account">
              <div>
                <span className="remembered-account-label">
                  이 앱이 기억한 이메일
                </span>
                <span className="remembered-account-email">
                  {rememberedEmail}
                </span>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => setEditingEmail(true)}
                disabled={busy}
              >
                계정 변경
              </button>
            </div>
          ) : (
            <>
              <label htmlFor="email">이메일</label>
              <input
                id="email"
                type="email"
                autoComplete="off"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={busy}
              />
            </>
          )}
          <label className="remember-email">
            <input
              type="checkbox"
              checked={rememberEmail}
              disabled={busy}
              onChange={(e) => {
                const checked = e.target.checked
                setRememberEmail(checked)
                if (!checked) {
                  storeRememberedEmail('')
                  setEditingEmail(true)
                }
              }}
            />
            이 앱에서 이메일 기억하기
          </label>
          <label htmlFor="password">비밀번호</label>
          <div className="password-input">
            <input
              id="password"
              type={visible ? 'text' : 'password'}
              autoComplete="off"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력해 주세요"
              disabled={busy}
            />
            <button
              type="button"
              className="icon-button"
              aria-label={visible ? '비밀번호 숨기기' : '비밀번호 보기'}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {(error || authError) && (
            <FieldError>{error || authError}</FieldError>
          )}
          <button
            className="button button-primary login-submit"
            disabled={busy}
          >
            {busy ? '서재를 여는 중…' : '나의 서재 열기'}
            <ArrowRight size={18} />
          </button>
        </form>
        <p className="login-privacy">
          <ShieldCheck size={15} />
          로그인은 유지되고, 이 앱은 이메일만 기억해요. 비밀번호는 저장하지 않아요.
        </p>
        {useEmulators && (
          <p className="emulator-label">
            로컬 에뮬레이터 · 실제 서비스 데이터와 분리됨
          </p>
        )}
      </section>
    </main>
  )
}

export function LibraryPage() {
  const { books, loading, error, reload } = useLibrary()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<BookStatus | 'all'>('all')
  const [mediaType, setMediaType] = useState<MediaType | 'all'>('all')
  const scopedBooks =
    mediaType === 'all'
      ? books
      : books.filter((book) => book.mediaType === mediaType)
  const visible = filterBooks(books, search, status, mediaType)
  const counts = {
    all: scopedBooks.length,
    reading: scopedBooks.filter((b) => b.status === 'reading').length,
    planned: scopedBooks.filter((b) => b.status === 'planned').length,
    finished: scopedBooks.filter((b) => b.status === 'finished').length,
  }
  const allCounts = {
    reading: books.filter((b) => b.status === 'reading').length,
    planned: books.filter((b) => b.status === 'planned').length,
    finished: books.filter((b) => b.status === 'finished').length,
  }
  const mediaCounts = {
    all: books.length,
    book: books.filter((b) => b.mediaType === 'book').length,
    drama: books.filter((b) => b.mediaType === 'drama').length,
    movie: books.filter((b) => b.mediaType === 'movie').length,
  }
  return (
    <main id="main" className="library-page">
      <section className="library-intro">
        <div>
          <p className="eyebrow">
            <span className="tiny-line" />
            THE STORIES I'VE COLLECTED
          </p>
          <h1>
            이야기가 쌓이는 곳,
            <br className="mobile-break" /> <span>나의 서재.</span>
          </h1>
          <p className="intro-description">읽고, 보고, 오래 기억할 작품을.</p>
          <p className="library-summary" aria-label="서재 요약">
            전체 <strong>{books.length}</strong>개<span>·</span>진행 중{' '}
            <strong>{allCounts.reading}</strong>
            <span>·</span>예정 <strong>{allCounts.planned}</strong>
            <span>·</span>완료 <strong>{allCounts.finished}</strong>
          </p>
        </div>
        <div className="intro-bookmark" aria-hidden="true">
          <Bookmark strokeWidth={0.65} />
          <span>
            ONE STORY,
            <br />
            ONE MORE MEMORY.
          </span>
        </div>
      </section>
      <section className="shelf" aria-label="나의 작품">
        <div className="shelf-toolbar">
          <div className="search-input">
            <Search size={18} strokeWidth={1.5} />
            <input
              aria-label="제목 또는 작가·감독 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="어떤 이야기를 찾고 있나요?"
            />
            {search && (
              <button
                className="icon-button"
                aria-label="검색어 지우기"
                onClick={() => setSearch('')}
              >
                <X size={16} />
              </button>
            )}
            <span className="search-hint">제목 · 작가 · 감독</span>
          </div>
          <Link className="button button-primary desktop-add" to="/books/new">
            <Plus size={17} />
            작품 추가
          </Link>
        </div>
        <div className="media-filter-row">
          <div className="filter-tabs" role="group" aria-label="기록 종류 필터">
            {(['all', 'book', 'drama', 'movie'] as const).map((key) => (
              <button
                key={key}
                aria-pressed={mediaType === key}
                onClick={() => setMediaType(key)}
                className={mediaType === key ? 'active' : ''}
              >
                {key === 'all' ? '전체' : mediaTypes[key]}
                <span>{mediaCounts[key]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="filter-row">
          <div className="filter-tabs" role="group" aria-label="진행 상태 필터">
            {(['all', 'reading', 'planned', 'finished'] as const).map((key) => (
              <button
                key={key}
                aria-pressed={status === key}
                onClick={() => setStatus(key)}
                className={status === key ? 'active' : ''}
              >
                {key === 'all' ? '전체' : statuses[key]}
                <span>{counts[key]}</span>
              </button>
            ))}
          </div>
          <span className="sort-label">
            최근 등록순
            <ChevronDown size={12} aria-hidden="true" />
          </span>
        </div>
        {loading ? (
          <Loading />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : books.length === 0 ? (
          <Empty />
        ) : !visible.length ? (
          <Empty
            search
            onReset={() => {
              setSearch('')
              setStatus('all')
              setMediaType('all')
            }}
          />
        ) : (
          <>
            <div className="shelf-caption">
              <span>
                {search
                  ? `'${search}' 검색 결과`
                  : status === 'all'
                    ? '나의 모든 이야기'
                    : `${statuses[status]} 이야기`}
                <strong>{visible.length}</strong>
              </span>
              <span className="shelf-caption-right">
                책장을 넘기듯, 천천히.
              </span>
            </div>
            <div className="book-grid">
              {visible.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
            <div className="shelf-end">
              <span />
              <Bookmark size={14} strokeWidth={1.2} />
              <span />
            </div>
          </>
        )}
      </section>
      <Link className="button button-primary mobile-add" to="/books/new">
        <Plus size={19} />
        작품 추가
      </Link>
    </main>
  )
}

export function DetailPage() {
  const { id } = useParams()
  const { books, loading, error, reload, notify } = useLibrary()
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [removeError, setRemoveError] = useState('')
  const book = books.find((b) => b.id === id)
  if (loading)
    return (
      <main id="main">
        <Loading full />
      </main>
    )
  if (error)
    return (
      <main id="main">
        <ErrorState message={error} onRetry={reload} />
      </main>
    )
  if (!book && busy)
    return (
      <main id="main">
        <Loading full />
      </main>
    )
  if (!book)
    return (
      <main id="main">
        <PageHeading title="이 작품을 찾지 못했어요." eyebrow="STORY NOT FOUND">
          <p>삭제되었거나 주소가 바뀌었을 수 있어요.</p>
        </PageHeading>
      </main>
    )
  const currentBook = book
  async function remove() {
    if (busy) return
    setBusy(true)
    setRemoveError('')
    try {
      await deleteBook(currentBook)
      notify(
        pendingCleanup()
          ? '작품을 삭제했어요. 표지 파일 정리는 설정에서 재시도해 주세요.'
          : '작품을 서재에서 정리했어요.',
      )
      navigate('/', { replace: true })
    } catch (e) {
      setRemoveError(errorMessage(e))
      setBusy(false)
    }
  }
  return (
    <main id="main" className="detail-page">
      <PageHeading
        title={
          book.mediaType === 'book'
            ? '책 한 권'
            : book.mediaType === 'drama'
              ? '드라마 한 편'
              : '영화 한 편'
        }
        eyebrow="A STORY TO KEEP"
      />
      <article className="book-detail">
        <div className="detail-cover">
          <Cover book={book} large />
          <span className="detail-cover-caption">A STORY IN MY LIBRARY</span>
        </div>
        <div className="detail-content">
          <div className="detail-meta">
            <span>{mediaTypes[book.mediaType]}</span>
            {book.mediaType === 'book' && book.type && (
              <span>{bookTypes[book.type]}</span>
            )}
            <Status book={book} />
          </div>
          <h2>{book.title}</h2>
          <p className="detail-author">
            {book.author || '작가·감독을 기록하지 않았어요'}
          </p>
          {book.status === 'finished' && book.finishedAt && (
            <p className="finished-date">
              <Check size={14} />
              {formatDate(book.finishedAt)}에 완료했어요
            </p>
          )}
          <div className="detail-actions">
            <Link
              className="button button-primary"
              to={`/books/${book.id}/edit`}
            >
              <Pencil size={16} />
              기록 수정
            </Link>
            <button
              className="button button-quiet"
              onClick={() => setConfirm(true)}
            >
              <Trash2 size={16} />
              삭제
            </button>
          </div>
          <section className="note-section">
            <p className="eyebrow">
              <Bookmark size={14} />
              MY LITTLE NOTE
            </p>
            <h3>기억하고 싶은 것들</h3>
            {book.note ? (
              <p className="book-note">{book.note}</p>
            ) : (
              <p className="note-empty">
                아직 남긴 메모가 없어요.
                <br />
                마음에 남은 장면이나 문장을 기록해 보세요.
              </p>
            )}
          </section>
          <p className="record-date">
            {formatDate(book.createdAt)}에 서재에 기록했어요
          </p>
        </div>
      </article>
      {confirm && (
        <ConfirmDialog
          title="이 이야기를 떠나보낼까요?"
          confirm="작품 삭제"
          danger
          busy={busy}
          onConfirm={() => void remove()}
          onCancel={() => {
            setConfirm(false)
            setRemoveError('')
          }}
        >
          <p>
            「{book.title}」의 기록과 표지를 삭제해요.
            <br />
            삭제하면 되돌릴 수 없어요.
          </p>
          {removeError && <FieldError>{removeError}</FieldError>}
        </ConfirmDialog>
      )}
    </main>
  )
}

export function SettingsPage() {
  const { user, notify } = useLibrary()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [cleanupCount, setCleanupCount] = useState(pendingCleanup())
  async function logout() {
    setBusy(true)
    setError('')
    try {
      await signOut(auth!)
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }
  async function clean() {
    setBusy(true)
    setError('')
    try {
      const remaining = await retryCleanup()
      setCleanupCount(remaining)
      notify(
        remaining
          ? '일부 표지를 정리하지 못했어요. 연결과 권한을 확인해 주세요.'
          : '남은 표지 파일을 정리했어요.',
      )
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <main id="main" className="settings-page">
      <PageHeading title="서재의 작은 설정" eyebrow="YOUR PRIVATE SPACE" />
      <section className="settings-section">
        <p className="eyebrow">MY ACCOUNT</p>
        <div className="account-info">
          <span className="account-icon">
            <BookOpen size={23} strokeWidth={1.2} />
          </span>
          <div>
            <h2>나의 서재</h2>
            <p>{user?.email}</p>
          </div>
          <ShieldCheck size={20} />
        </div>
        <button
          className="button button-secondary"
          onClick={() => void logout()}
          disabled={busy}
        >
          <LogOut size={16} />
          로그아웃
        </button>
        {error && <FieldError>{error}</FieldError>}
      </section>
      <section className="settings-section">
        <p className="eyebrow">KEEPING YOUR STORIES SAFE</p>
        <h2>기록을 오래 간직하려면</h2>
        <p>
          기록과 표지는 Firebase에 보관되며, 같은 계정으로 다른 기기에서도 만날
          수 있어요.
        </p>
        <p>
          동기화가 별도의 백업을 대신하지는 않아요. 표지까지 포함하는
          백업·복원은 추후 제공할 예정이에요. 지금은 Firebase 관리자가 기록과
          표지를 함께 보관해 주세요.
        </p>
        {cleanupCount > 0 && (
          <div className="cleanup-panel">
            <p>
              정리가 필요한 표지 파일 {cleanupCount}개가 있어요. 작품 기록은
              안전하게 저장됐어요.
            </p>
            <button
              className="button button-secondary"
              disabled={busy}
              onClick={() => void clean()}
            >
              파일 정리 재시도
            </button>
          </div>
        )}
      </section>
      <section className="settings-section install-help">
        <p className="eyebrow">MAKE YOURSELF AT HOME</p>
        <h2>홈 화면에 갈피 꽂기</h2>
        <p>
          iPhone Safari의 공유 버튼에서 ‘홈 화면에 추가’를 선택하면 앱처럼
          편하게 열 수 있어요.
        </p>
        <p>
          오프라인 작성·동기화는 지원하지 않아요. 기록을 저장할 때 인터넷 연결을
          확인해 주세요.
        </p>
      </section>
      <div className="version-row">
        <span>
          갈피 <small>GALPI</small>
        </span>
        <span>버전 1.0.0</span>
      </div>
    </main>
  )
}
