import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..', '..')
const figmaDir = path.join(projectRoot, 'frontend', 'public', 'figma')

const targets = [
  'My First Weavy_Gemini 3 (Nano Banana Pro)_2026-03-28_19-51-14 1@3x.png',
  'Rectangle 71@3x.png',
  'Снимок экрана 2026-03-26 в 15.46.46 1@3x.png',
  'home-from-pdf.png'
]

const toWebp = async (fileName) => {
  const input = path.join(figmaDir, fileName)
  const output = input.replace(/\.png$/i, '.webp')

  await sharp(input)
    .webp({
      quality: 95,
      alphaQuality: 100,
      effort: 6,
      smartSubsample: true
    })
    .toFile(output)

  return { input, output }
}

const run = async () => {
  for (const fileName of targets) {
    const result = await toWebp(fileName)
    console.log(`optimized: ${path.basename(result.input)} -> ${path.basename(result.output)}`)
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
