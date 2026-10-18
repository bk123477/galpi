import { useEffect, useState } from 'react'
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
  useLocation,
} from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, WifiOff } from 'lucide-react'
import { configured } from './firebase'
import { LibraryProvider, useLibrary } from './state'
import { Header, Loading } from './components'
import { LibraryPage, LoginPage, SettingsPage, DetailPage } from './pages'
import { BookFormPage } from './BookForm'

function Frame() {
  const { online, toast, dirty } = useLibrary()
  const location = useLocation()
  const [dismissUpdate, setDismissUpdate] = useState(false)
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])
  return (
    <>
      <a className="skip-link" href="#main">
        본문으로 건너뛰기
      </a>
      <div className="app-shell">
        <Header />
        {!online && (
          <div className="notice" role="status">
            <WifiOff size={16} />
            <span>
              오프라인이에요. 기록 조회와 저장에는 인터넷 연결이 필요할 수
              있어요.
            </span>
          </div>
        )}
        <Outlet />
        <footer className="app-footer">
          <span>갈피</span>
          <p>읽고 본 이야기를, 잊지 않도록.</p>
          <span className="footer-note">A LITTLE SPACE FOR YOUR STORIES</span>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {needRefresh && !dismissUpdate && (
        <div className="update-notice" role="status">
          <RefreshCw size={18} />
          <div>
            <strong>새로운 갈피가 준비됐어요.</strong>
            <p>
              {dirty
                ? '입력한 내용을 저장한 뒤 새로고침해 주세요.'
                : '편할 때 새로고침해 주세요.'}
            </p>
          </div>
          <button
            onClick={() => {
              if (!dirty) void updateServiceWorker(true)
            }}
            disabled={dirty}
          >
            새로고침
          </button>
          <button onClick={() => setDismissUpdate(true)}>나중에</button>
        </div>
      )}
    </>
  )
}
function Protected() {
  const { user, authLoading } = useLibrary()
  if (authLoading) return <Loading full />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
function NotFound() {
  return (
    <main id="main" className="not-found">
      <p className="eyebrow">PAGE NOT FOUND</p>
      <h1>책갈피를 찾지 못했어요.</h1>
      <a className="button button-primary" href="/">
        서재로 돌아가기
      </a>
    </main>
  )
}
const router = createBrowserRouter([
  {
    element: <Frame />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        element: <Protected />,
        children: [
          { index: true, element: <LibraryPage /> },
          { path: 'books/new', element: <BookFormPage /> },
          { path: 'books/:id', element: <DetailPage /> },
          { path: 'books/:id/edit', element: <BookFormPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
])
function Setup() {
  return (
    <div className="setup-page">
      <div className="brand-icon">
        <BookmarkIcon />
      </div>
      <p className="eyebrow">GALPI · GETTING STARTED</p>
      <h1>
        당신의 서재를
        <br />
        열어볼까요.
      </h1>
      <p>
        Firebase 연결 설정이 필요해요.
        <br />
        README의 시작 안내를 따라 설정해 주세요.
      </p>
      <ol>
        <li>
          <code>.env.example</code>을 <code>.env.local</code>로 복사
        </li>
        <li>Firebase 설정값과 소유자 UID 입력</li>
        <li>
          <code>npm run dev</code>로 다시 실행
        </li>
      </ol>
      <p className="muted">
        로컬 체험은 README의 에뮬레이터 실행 방법을 확인하세요.
      </p>
    </div>
  )
}
function BookmarkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M6 3h12v18l-6-4-6 4z" />
    </svg>
  )
}
export default function App() {
  return configured ? (
    <LibraryProvider>
      <RouterProvider router={router} />
    </LibraryProvider>
  ) : (
    <Setup />
  )
}
