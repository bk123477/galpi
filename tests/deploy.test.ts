import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

describe('배포 규칙 생성 보호', () => {
  it('placeholder와 에뮬레이터 배포를 거부하고 실제 UID만 치환한다', () => {
    const folder = mkdtempSync(join(tmpdir(), 'galpi-rules-'))
    const script = resolve('scripts/prepare-rules.mjs')
    const valid = Object.fromEntries(
      [
        'API_KEY',
        'AUTH_DOMAIN',
        'PROJECT_ID',
        'STORAGE_BUCKET',
        'MESSAGING_SENDER_ID',
        'APP_ID',
      ].map((key) => [`VITE_FIREBASE_${key}`, 'valid-config']),
    )
    const run = (extra: Record<string, string>, args: string[] = []) =>
      spawnSync(process.execPath, [script, ...args], {
        cwd: folder,
        env: { PATH: process.env.PATH, ...valid, ...extra },
        encoding: 'utf8',
      })
    try {
      for (const file of ['firestore.rules', 'storage.rules'])
        writeFileSync(join(folder, file), 'owner = REPLACE_WITH_OWNER_UID')
      expect(run({ VITE_OWNER_UID: 'REPLACE_WITH_OWNER_UID' }).status).toBe(1)
      expect(
        run({ VITE_OWNER_UID: 'real-owner', VITE_USE_EMULATORS: 'true' })
          .status,
      ).toBe(1)
      expect(run({ VITE_OWNER_UID: 'galpi-owner' }).status).toBe(1)
      expect(
        run({ VITE_OWNER_UID: 'real-owner', GCLOUD_PROJECT: 'wrong-project' })
          .status,
      ).toBe(1)
      expect(run({ VITE_OWNER_UID: 'real-owner' }).status).toBe(0)
      expect(
        readFileSync(join(folder, '.firebase-rules/firestore.rules'), 'utf8'),
      ).toBe('owner = real-owner')
      expect(run({}, ['--emulator']).status).toBe(0)
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })
})
