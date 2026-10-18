import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router-dom'
import { Check, ImagePlus, Plus, X } from 'lucide-react'
import {
  emptyBook,
  isDuplicate,
  statuses,
  types,
  validateBook,
  type Book,
  type BookInput,
} from './book'
import { useLibrary } from './state'
import { errorMessage, pendingCleanup, saveBook } from './services'
import { compressCover } from './image'
import {
  ConfirmDialog,
  Cover,
  ErrorState,
  FieldError,
  Loading,
  PageHeading,
} from './components'

export function BookFormPage() {
  const { id } = useParams()
  const { books, loading, error, reload } = useLibrary()
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
  const existing = books.find((b) => b.id === id)
  if (id && !existing)
    return (
      <main id="main">
        <PageHeading
          title="이 작품을 찾지 못했어요."
          eyebrow="STORY NOT FOUND"
        />
      </main>
    )
  return <BookForm key={id ?? 'new'} existing={existing} />
}
function BookForm({ existing }: { existing?: Book }) {
  const { books, notify, setDirty } = useLibrary()
  const navigate = useNavigate()
  const initial = useRef<BookInput>(
    existing
      ? {
          title: existing.title,
          author: existing.author,
          note: existing.note,
          status: existing.status,
          type: existing.type,
        }
      : { ...emptyBook },
  )
  const [input, setInput] = useState(initial.current)
  const [cover, setCover] = useState<Blob | null | undefined>(undefined)
  const [preview, setPreview] = useState<string>()
  const [processing, setProcessing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const savedId = useRef('')
  const saving = useRef(false)
  const active = useRef(true)
  const fileInput = useRef<HTMLInputElement>(null)
  const dirty =
    !saved &&
    (cover !== undefined ||
      JSON.stringify(input) !== JSON.stringify(initial.current))
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      (dirty || busy || processing) &&
      currentLocation.pathname !== nextLocation.pathname,
  )
  useEffect(() => {
    setDirty(dirty || busy || processing)
    return () => setDirty(false)
  }, [dirty, busy, processing, setDirty])
  useEffect(() => {
    if (!dirty && !busy && !processing) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, busy, processing])
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview],
  )
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  useEffect(() => {
    if (saved) navigate(`/books/${savedId.current}`, { replace: true })
  }, [saved, navigate])
  const change = <K extends keyof BookInput>(key: K, value: BookInput[K]) =>
    setInput((previous) => ({ ...previous, [key]: value }))
  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    setProcessing(true)
    setPreview(URL.createObjectURL(file))
    try {
      const blob = await compressCover(file)
      if (active.current) setCover(blob)
    } catch (e) {
      if (active.current) {
        setCover(undefined)
        setPreview(undefined)
        setError(errorMessage(e))
      }
    } finally {
      if (active.current) setProcessing(false)
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (saving.current || processing) return
    setError('')
    try {
      validateBook(input)
    } catch (e) {
      setError(errorMessage(e))
      return
    }
    saving.current = true
    setBusy(true)
    setProgress(0)
    try {
      const id = await saveBook(input, existing, cover, setProgress)
      savedId.current = id
      notify(
        pendingCleanup()
          ? '기록을 저장했어요. 남은 표지 정리는 설정에서 재시도해 주세요.'
          : existing
            ? '이야기의 갈피를 고쳐두었어요.'
            : '새 이야기를 서재에 꽂았어요.',
      )
      setSaved(true)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
      saving.current = false
    }
  }
  const hasCover = !!preview || (cover !== null && !!existing?.coverPath)
  return (
    <main id="main" className="form-page">
      <PageHeading
        title={existing ? '이야기를 다듬는 시간.' : '어떤 이야기를 남길까요?'}
        eyebrow={
          existing ? 'A NOTE TO REMEMBER' : 'A NEW CHAPTER IN YOUR LIBRARY'
        }
      >
        <p>
          {existing
            ? '다시 떠오른 장면을 더해도 좋아요.'
            : '제목 하나에서 시작하는, 나만의 작은 기록.'}
        </p>
      </PageHeading>
      <form onSubmit={submit} className="book-form">
        <fieldset disabled={busy || processing}>
          <legend className="sr-only">작품 기록</legend>
          <section className="cover-field">
            <div className="cover-preview">
              <Cover
                book={{
                  id: existing?.id ?? 'new-story',
                  title: input.title,
                  author: input.author,
                  type: input.type,
                  coverPath:
                    cover === null || preview
                      ? null
                      : (existing?.coverPath ?? null),
                }}
                localUrl={preview}
                large
              />
              {!hasCover && (
                <span className="cover-preview-plus">
                  <Plus size={20} />
                </span>
              )}
            </div>
            <div className="cover-field-info">
              <p className="eyebrow">THE FACE OF YOUR STORY</p>
              <h2>이야기의 얼굴</h2>
              <p>
                좋아하는 표지를 함께 남겨보세요.
                <br />
                표지가 없어도 멋진 책으로 꽂아드릴게요.
              </p>
              <input
                ref={fileInput}
                className="sr-only"
                type="file"
                accept="image/*"
                aria-label="표지 이미지 선택"
                onChange={(e) => void selectFile(e)}
                tabIndex={-1}
              />
              <button
                type="button"
                className="button button-secondary"
                onClick={() => fileInput.current?.click()}
              >
                <ImagePlus size={16} />
                {processing
                  ? '사진을 다듬는 중…'
                  : hasCover
                    ? '표지 바꾸기'
                    : '표지 선택'}
              </button>
              {hasCover && (
                <button
                  type="button"
                  className="text-button cover-remove"
                  onClick={() => {
                    setCover(null)
                    setPreview(undefined)
                  }}
                >
                  <X size={14} />
                  표지 제거
                </button>
              )}
              <small>사진 최대 12MB · 저장 전 자동으로 최적화해요</small>
            </div>
          </section>
          <div className="form-fields">
            <div className="form-field">
              <label htmlFor="title">
                작품 제목 <span className="required-label">필수</span>
              </label>
              <input
                id="title"
                required
                maxLength={120}
                value={input.title}
                onChange={(e) => change('title', e.target.value)}
                placeholder="기억하고 싶은 작품의 제목"
                autoComplete="off"
              />
              {isDuplicate(books, input, existing?.id) && (
                <p className="duplicate-warning" role="status">
                  이미 기록한 작품일 수 있어요. 같은 제목과 작가의 작품이 서재에
                  있어요. 그대로 저장할 수 있어요.
                </p>
              )}
            </div>
            <div className="form-field">
              <label htmlFor="author">
                작가 <span className="optional-label">선택</span>
              </label>
              <input
                id="author"
                maxLength={120}
                value={input.author}
                onChange={(e) => change('author', e.target.value)}
                placeholder="이야기를 쓴 사람"
                autoComplete="off"
              />
            </div>
            <div className="form-field">
              <label id="status-label">독서 상태</label>
              <div
                className="segmented-control"
                role="group"
                aria-labelledby="status-label"
              >
                {(['planned', 'reading', 'finished'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={input.status === key}
                    className={input.status === key ? 'selected' : ''}
                    onClick={() => change('status', key)}
                  >
                    {input.status === key && <Check size={14} />}
                    {statuses[key]}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-field">
              <label id="type-label">작품 유형</label>
              <div
                className="type-options"
                role="group"
                aria-labelledby="type-label"
              >
                {(Object.keys(types) as (keyof typeof types)[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={input.type === key}
                    className={input.type === key ? 'selected' : ''}
                    onClick={() => change('type', key)}
                  >
                    {types[key]}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-field">
              <label htmlFor="note">
                짧은 메모 <span className="optional-label">선택</span>
              </label>
              <textarea
                id="note"
                rows={6}
                maxLength={2000}
                value={input.note}
                onChange={(e) => change('note', e.target.value)}
                placeholder="무슨 내용이었더라? 기억하고 싶은 장면만 적어두세요."
              />
              <span className="character-count">
                {input.note.length.toLocaleString()} / 2,000
              </span>
            </div>
          </div>
        </fieldset>
        {error && <FieldError>{error}</FieldError>}
        <div className="form-submit">
          <p>작은 기록이 모여, 오래 남는 서재가 됩니다.</p>
          <button
            className="button button-primary"
            type="submit"
            disabled={busy || processing}
          >
            <Check size={18} />
            {busy
              ? cover && progress < 100
                ? `표지 올리는 중 ${progress}%`
                : '기록 저장 중…'
              : processing
                ? '사진을 다듬는 중…'
                : existing
                  ? '수정한 기록 저장'
                  : '서재에 꽂기'}
          </button>
        </div>
      </form>
      {blocker.state === 'blocked' && (
        <ConfirmDialog
          title={
            busy || processing
              ? '잠시만 기다려 주세요.'
              : '아직 꽂지 않은 이야기가 있어요.'
          }
          confirm="저장하지 않고 나가기"
          busy={busy || processing}
          onConfirm={() => blocker.proceed()}
          onCancel={() => blocker.reset()}
        >
          <p>
            {busy || processing
              ? '사진 처리나 저장이 끝난 뒤 이동해 주세요.'
              : '저장하지 않은 내용은 사라져요. 이 페이지를 나갈까요?'}
          </p>
        </ConfirmDialog>
      )}
    </main>
  )
}
