import { readFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(root, 'public/favicon.svg'))
const outDir = join(root, 'public/icons')

await mkdir(outDir, { recursive: true })

const sizes = [192, 512]

for (const size of sizes) {
  const out = join(outDir, `icon-${size}.png`)
  await sharp(svg, { density: Math.max(144, size / 2) })
    .resize(size, size)
    .png()
    .toFile(out)
  console.log(`Wrote ${out}`)
}
