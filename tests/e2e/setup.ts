import { execFileSync } from 'node:child_process'
export default function setup() {
  execFileSync(process.execPath, ['scripts/seed.mjs'], { stdio: 'inherit' })
}
