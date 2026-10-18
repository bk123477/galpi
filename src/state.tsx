import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { auth, authReady, ownerUid } from './firebase'
import { clearPrivateCache, errorMessage, watchBooks } from './services'
import type { Book } from './book'

interface State {
  user: User | null
  authLoading: boolean
  authError: string
  books: Book[]
  loading: boolean
  error: string
  online: boolean
  dirty: boolean
  setDirty: (dirty: boolean) => void
  toast: string
  notify: (message: string) => void
  reload: () => void
}
const Context = createContext<State | null>(null)
export const useLibrary = () => useContext(Context)!
export function LibraryProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(!!auth)
  const [authError, setAuthError] = useState('')
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [online, setOnline] = useState(navigator.onLine)
  const [dirty, setDirty] = useState(false)
  const [toast, notify] = useState('')
  useEffect(() => {
    if (!auth) return
    let unsubscribe = () => {}
    let active = true
    authReady
      .then(() => {
        if (!active) return
        unsubscribe = onAuthStateChanged(
          auth!,
          async (next) => {
            if (next && next.uid !== ownerUid) {
              setAuthError(
                '소유자 전용 서재예요. 등록된 소유자 계정으로 로그인해 주세요.',
              )
              setUser(null)
              setBooks([])
              clearPrivateCache()
              await signOut(auth!).catch(() => {})
            } else {
              setUser(next)
              if (!next) {
                setBooks([])
                clearPrivateCache()
              }
            }
            setAuthLoading(false)
          },
          (e) => {
            setAuthError(errorMessage(e))
            setAuthLoading(false)
          },
        )
      })
      .catch((e) => {
        if (active) {
          setAuthError(errorMessage(e))
          setAuthLoading(false)
        }
      })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])
  useEffect(() => {
    if (!user) return
    setLoading(true)
    setError('')
    return watchBooks(
      (next) => {
        setBooks(next)
        setLoading(false)
        setError('')
      },
      (e) => {
        setBooks([])
        setError(errorMessage(e))
        setLoading(false)
      },
    )
  }, [user, retry])
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => notify(''), 5000)
    return () => clearTimeout(timer)
  }, [toast])
  return (
    <Context.Provider
      value={{
        user,
        authLoading,
        authError,
        books,
        loading,
        error,
        online,
        dirty,
        setDirty,
        toast,
        notify,
        reload: () => setRetry((n) => n + 1),
      }}
    >
      {children}
    </Context.Provider>
  )
}
