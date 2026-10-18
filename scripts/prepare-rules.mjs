import { readFile, writeFile, mkdir } from 'node:fs/promises'

const emulator = process.argv.includes('--emulator')
if (!emulator && process.env.VITE_USE_EMULATORS === 'true')
  throw new Error('배포할 때 VITE_USE_EMULATORS는 false여야 합니다.')
if (!emulator) {
  for (const key of [
    'API_KEY',
    'AUTH_DOMAIN',
    'PROJECT_ID',
    'STORAGE_BUCKET',
    'MESSAGING_SENDER_ID',
    'APP_ID',
  ]) {
    const value = process.env[`VITE_FIREBASE_${key}`]
    if (!value || /replace|your-project/i.test(value))
      throw new Error(`VITE_FIREBASE_${key} 설정이 필요합니다.`)
  }
  if (
    process.env.GCLOUD_PROJECT &&
    process.env.GCLOUD_PROJECT !== process.env.VITE_FIREBASE_PROJECT_ID
  ) {
    throw new Error('배포 대상 프로젝트와 .env.local의 프로젝트가 다릅니다.')
  }
}
const uid = emulator ? 'galpi-owner' : process.env.VITE_OWNER_UID
if (
  !uid ||
  /replace|placeholder/i.test(uid) ||
  (!emulator && uid === 'galpi-owner') ||
  !/^[a-zA-Z0-9_-]{1,128}$/.test(uid)
) {
  throw new Error(
    '유효한 VITE_OWNER_UID가 필요합니다. .env.local을 확인하세요.',
  )
}
await mkdir('.firebase-rules', { recursive: true })
for (const file of ['firestore.rules', 'storage.rules']) {
  const source = await readFile(file, 'utf8')
  await writeFile(
    `.firebase-rules/${file}`,
    source.replaceAll('REPLACE_WITH_OWNER_UID', uid),
  )
}
console.log(
  `보안 규칙 생성 완료 (${emulator ? '로컬 에뮬레이터' : '실제 소유자'}).`,
)
