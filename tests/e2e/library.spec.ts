import { test, expect, type Page } from '@playwright/test'
import { execFileSync } from 'node:child_process'

async function login(page: Page) {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('이메일', { exact: true }).fill('owner@galpi.local')
  await page.getByLabel('비밀번호', { exact: true }).fill('galpi-local-only')
  await page.getByRole('button', { name: '나의 서재 열기' }).click()
  await expect(
    page.getByRole('heading', { name: /이야기가 쌓이는 곳/ }),
  ).toBeVisible()
}
test.beforeEach(async ({ request }) => {
  await request.delete(
    'http://127.0.0.1:8080/emulator/v1/projects/demo-galpi/databases/(default)/documents',
  )
})
test('로그인 유지, 제목 등록, 검색·필터, 수정·날짜 보존, 삭제, 로그아웃', async ({
  page,
}) => {
  const errors: string[] = []
  let navigating = false
  page.on('pageerror', (e) => {
    // WebKit reports the emulator's aborted Listen fetch as CORS during full navigation.
    if (
      navigating &&
      /127\.0\.0\.1:8080\/google\.firestore\.v1\.Firestore\/Listen\/channel.*access control checks/.test(
        e.message,
      )
    )
      return
    errors.push(e.message)
  })
  const fullNavigation = async (url?: string) => {
    navigating = true
    try {
      if (url) await page.goto(url)
      else await page.reload()
    } finally {
      navigating = false
    }
  }
  await login(page)
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('galpi.rememberedEmail')))
    .toBe('owner@galpi.local')
  await expect(page.getByText('첫 이야기를 서가에 꽂아볼까요?')).toBeVisible()
  await fullNavigation()
  await expect(
    page.getByRole('heading', { name: /이야기가 쌓이는 곳/ }),
  ).toBeVisible()
  await fullNavigation('/books/new')
  await expect(
    page.getByRole('button', { name: '읽음', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByRole('button', { name: '웹소설', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page.getByLabel('작품 제목').fill('달빛 아래의 도서관')
  await page.getByRole('button', { name: '서재에 꽂기' }).click()
  await expect(
    page.getByRole('heading', { name: '달빛 아래의 도서관', exact: true }),
  ).toBeVisible()
  const finished = await page.locator('.finished-date').textContent()
  await page.getByRole('link', { name: '기록 수정' }).click()
  await page.getByLabel('작가', { exact: false }).fill('한여름')
  await page.getByLabel('짧은 메모').fill('첫 번째 줄\n오래 기억할 장면')
  await page.getByRole('button', { name: '일반 도서', exact: true }).click()
  await page.getByRole('button', { name: '수정한 기록 저장' }).click()
  await expect(page.locator('.book-note')).toHaveText(
    '첫 번째 줄\n오래 기억할 장면',
  )
  await expect(page.locator('.finished-date')).toHaveText(finished!)
  await fullNavigation()
  await expect(page.locator('.detail-author')).toHaveText('한여름')
  await page.getByRole('link', { name: '서재로', exact: true }).click()
  await page.getByLabel('제목 또는 작가 검색').fill(' 한여름 ')
  await expect(page.locator('.book-card')).toHaveCount(1)
  await page.getByRole('button', { name: '읽는 중 0', exact: true }).click()
  await expect(page.getByText('일치하는 작품이 없어요.')).toBeVisible()
  await page.getByRole('button', { name: '검색·필터 초기화' }).click()
  await page.locator('.book-card').click()
  await page.getByRole('button', { name: '삭제', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText(
    '삭제하면 되돌릴 수 없어요.',
  )
  await page.getByRole('button', { name: '작품 삭제', exact: true }).click()
  await expect(page.getByText('첫 이야기를 서가에 꽂아볼까요?')).toBeVisible()
  await page.getByRole('link', { name: '설정', exact: true }).click()
  await page.getByRole('button', { name: '로그아웃', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByLabel('이메일', { exact: true })).toHaveValue(
    'owner@galpi.local',
  )
  await expect(page.getByLabel('이메일 기억하기')).toBeChecked()
  await expect(page.getByLabel('비밀번호', { exact: true })).toHaveValue('')
  await page.getByLabel('이메일 기억하기').uncheck()
  expect(
    await page.evaluate(() => localStorage.getItem('galpi.rememberedEmail')),
  ).toBeNull()
  await expect(page.getByLabel('이메일', { exact: true })).toHaveValue(
    'owner@galpi.local',
  )
  expect(
    await page.evaluate(() =>
      Object.values(localStorage).includes('galpi-local-only'),
    ),
  ).toBe(false)
  expect(errors).toEqual([])
})
test('표지 업로드·교체·제거, 오프라인 입력 보호, 이탈 확인, 중복 경고', async ({
  page,
}) => {
  await login(page)
  await page.goto('/books/new')
  await page.getByLabel('작품 제목').fill('표지 테스트')
  await page
    .getByLabel('표지 이미지 선택')
    .setInputFiles('public/icons/icon-512.png')
  await expect(page.getByRole('button', { name: '서재에 꽂기' })).toBeEnabled()
  await page.getByRole('button', { name: '서재에 꽂기' }).click()
  await expect(page.locator('.detail-cover img')).toBeVisible()
  const bookUrl = page.url()
  const bookId = bookUrl.split('/').pop()!
  const listCovers = async () => {
    const response = await page.request.get(
      `http://127.0.0.1:9199/v0/b/demo-galpi.appspot.com/o?prefix=users%2Fgalpi-owner%2Fcovers%2F${bookId}%2F`,
      { headers: { Authorization: 'Bearer owner' } },
    )
    return (await response.json()).items ?? []
  }
  expect(await listCovers()).toHaveLength(1)
  await page.getByRole('link', { name: '기록 수정' }).click()
  await page
    .getByLabel('표지 이미지 선택')
    .setInputFiles('public/icons/icon-192.png')
  await expect(
    page.getByRole('button', { name: '수정한 기록 저장' }),
  ).toBeEnabled()
  await page.getByRole('button', { name: '수정한 기록 저장' }).click()
  await expect(page.locator('.detail-cover img')).toBeVisible()
  expect(await listCovers()).toHaveLength(1)
  await page.getByRole('link', { name: '기록 수정' }).click()
  await page.getByRole('button', { name: '표지 제거' }).click()
  await page.getByLabel('짧은 메모').fill('연결이 끊겨도 남을 메모')
  await page.context().setOffline(true)
  await page.getByRole('button', { name: '수정한 기록 저장' }).click()
  await expect(page.getByRole('alert')).toContainText(
    '인터넷 연결 후 다시 시도',
  )
  await expect(page.getByLabel('짧은 메모')).toHaveValue(
    '연결이 끊겨도 남을 메모',
  )
  await page.context().setOffline(false)
  await page.getByRole('link', { name: '서재로', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: '계속 머무르기' }).click()
  await expect(page.getByLabel('짧은 메모')).toHaveValue(
    '연결이 끊겨도 남을 메모',
  )
  await page.getByRole('button', { name: '수정한 기록 저장' }).click()
  await expect(page.locator('.book-note')).toContainText(
    '연결이 끊겨도 남을 메모',
  )
  await expect(page.locator('.detail-cover img')).toHaveCount(0)
  expect(await listCovers()).toHaveLength(0)
  await page.goto('/books/new')
  await page.getByLabel('작품 제목').fill('표지 테스트')
  await expect(page.getByText(/이미 기록한 작품일 수 있어요/)).toBeVisible()
  await page.getByRole('button', { name: '서재에 꽂기' }).click()
  await expect(page).toHaveURL(/\/books\/(?!new).+/)
})
test('보호 경로 차단, 반응형 레이아웃, PWA 메타데이터', async ({ page }) => {
  await page.goto('/books/private-id')
  await expect(page).toHaveURL(/\/login$/)
  await login(page)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  expect(overflow).toBe(false)
  const manifest = await (
    await page.request.get('/manifest.webmanifest')
  ).json()
  expect(manifest.name).toBe('갈피')
  expect(manifest.display).toBe('standalone')
  await page.evaluate(() => navigator.serviceWorker.ready)
  const cachedUrls = await page.evaluate(async () => {
    const stores = await caches.keys()
    const requests = await Promise.all(
      stores.map(async (key) => (await caches.open(key)).keys()),
    )
    return requests.flat().map((request) => request.url)
  })
  expect(cachedUrls.length).toBeGreaterThan(0)
  expect(
    cachedUrls.every((url) => new URL(url).origin === 'http://127.0.0.1:4173'),
  ).toBe(true)
  expect(
    manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable'),
  ).toBe(true)
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    'href',
    '/icons/apple-touch-icon.png',
  )
  await page.screenshot({
    path: `test-results/library-empty-${test.info().project.name}.png`,
    fullPage: true,
  })
  execFileSync(process.execPath, ['scripts/seed.mjs', '--books'])
  await expect(page.locator('.book-card')).toHaveCount(8)
  const columns = await page
    .locator('.book-grid')
    .evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length,
    )
  expect(columns).toBe(test.info().project.name === 'mobile-webkit' ? 2 : 6)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false)
  await page.screenshot({
    path: `test-results/library-filled-${test.info().project.name}.png`,
    fullPage: true,
  })
})
test('별도의 Auth 계정으로 로그인해도 소유자 서재에 들어갈 수 없다', async ({
  page,
  request,
}) => {
  await request.post(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-galpi/accounts',
    {
      headers: { Authorization: 'Bearer owner' },
      data: {
        localId: 'intruder',
        email: 'other@galpi.local',
        password: 'other-local-only',
      },
    },
  )
  await page.goto('/login')
  await page.getByLabel('이메일', { exact: true }).fill('other@galpi.local')
  await page.getByLabel('비밀번호', { exact: true }).fill('other-local-only')
  await page.getByRole('button', { name: '나의 서재 열기' }).click()
  await expect(page.getByRole('alert')).toContainText('소유자 전용 서재')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.locator('.book-card')).toHaveCount(0)
  expect(
    await page.evaluate(() => localStorage.getItem('galpi.rememberedEmail')),
  ).toBeNull()
})
