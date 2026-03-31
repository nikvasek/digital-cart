import fs from 'fs/promises'
import path from 'path'
import process from 'process'

const DEFAULT_OUTPUT = path.resolve('design/figma_drop')
const FIGMA_API = 'https://api.figma.com/v1'

const readText = async (filePath) => {
  try {
    return await fs.readFile(filePath, 'utf-8')
  } catch {
    return ''
  }
}

const pickFromEnvOrDotEnv = async () => {
  const envText = await readText(path.resolve('.env'))
  const token = process.env.FIGMA_TOKEN || (envText.match(/figd_[A-Za-z0-9_-]+/) || [])[0] || ''
  const fileKeyFromFile = (envText.match(/FIGMA_FILE_KEY=([A-Za-z0-9_-]+)/) || [])[1] || ''
  const fileKey = process.env.FIGMA_FILE_KEY || fileKeyFromFile || ''
  const nodeIdFromEnv = process.env.FIGMA_NODE_ID || ''
  const nodeIdFromFile = (envText.match(/FIGMA_NODE_ID=([0-9:.-]+)/) || [])[1] || ''
  const urlMatch = envText.match(/node-id=([0-9:-]+)/)
  const nodeIdFromUrl = urlMatch ? urlMatch[1] : ''
  const nodeId = (nodeIdFromEnv || nodeIdFromFile || nodeIdFromUrl || '').replace('-', ':')

  return { token, fileKey, nodeId }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const withTimeout = (promise, ms, label) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`))
    }, ms)

    promise
      .then((result) => {
        clearTimeout(timer)
        resolve(result)
      })
      .catch((error) => {
        clearTimeout(timer)
        reject(error)
      })
  })
const maskToken = (value) => {
  if (!value) return 'missing'
  const tail = value.slice(-4)
  return `len=${value.length}, tail=${tail}`
}

const requestJson = async (url, token) => {
  let lastError

  for (let attempt = 1; attempt <= 3; attempt++) {
    const response = await withTimeout(
      fetch(url, {
        headers: {
          'X-Figma-Token': token
        }
      }),
      30000,
      'Figma API request'
    )

    if (response.ok) {
      return response.json()
    }

    const text = await response.text()
    lastError = new Error(`Figma API error ${response.status}: ${text}`)

    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get('retry-after'))
      const waitMs = Number.isFinite(retryAfter) ? retryAfter * 1000 : 1000 * attempt
      await sleep(waitMs)
      continue
    }

    throw lastError
  }

  throw lastError || new Error('Figma API request failed')
}

const requestBuffer = async (url) => {
  const response = await withTimeout(fetch(url), 30000, 'Image download')
  if (!response.ok) {
    throw new Error(`Download failed ${response.status}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

const findNodeById = (node, targetId) => {
  if (!node) return null
  if (node.id === targetId) return node
  if (!Array.isArray(node.children)) return null

  for (const child of node.children) {
    const found = findNodeById(child, targetId)
    if (found) return found
  }

  return null
}

const collectExportableNodes = (node, list) => {
  if (!node) return

  if (Array.isArray(node.exportSettings) && node.exportSettings.length > 0) {
    list.push(node)
  }

  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      collectExportableNodes(child, list)
    }
  }
}

const sanitizeName = (name) => {
  const cleaned = name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return cleaned || 'figma-asset'
}

const chunk = (items, size) => {
  const chunks = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

const downloadImages = async ({ fileKey, token, nodeIds, scale }) => {
  const results = []
  const batches = chunk(nodeIds, 10)

  for (let i = 0; i < batches.length; i++) {
    const idsParam = encodeURIComponent(batches[i].join(','))
    const url = `${FIGMA_API}/images/${fileKey}?ids=${idsParam}&format=png&scale=${scale}&use_absolute_bounds=true`
    const data = await requestJson(url, token)
    const images = data.images || {}

    console.log(`Downloading batch ${i + 1}/${batches.length} (${Object.keys(images).length} image(s))`)

    for (const [id, imageUrl] of Object.entries(images)) {
      if (!imageUrl) continue
      const buffer = await requestBuffer(imageUrl)
      results.push({ id, buffer })
    }
  }

  return results
}

const main = async () => {
  const { token, fileKey, nodeId } = await pickFromEnvOrDotEnv()
  const outputDir = process.env.OUTPUT_DIR
    ? path.resolve(process.env.OUTPUT_DIR)
    : DEFAULT_OUTPUT
  const scale = Number(process.env.FIGMA_SCALE || '2')
  const checkOnly = process.env.FIGMA_CHECK_ONLY === '1'
  const onlyFrame = process.env.FIGMA_ONLY_FRAME === '1'

  if (!token) {
    throw new Error('Missing FIGMA_TOKEN (or figd_* in .env)')
  }
  if (!fileKey) {
    throw new Error('Missing FIGMA_FILE_KEY (or file key in .env)')
  }
  if (!nodeId) {
    throw new Error('Missing FIGMA_NODE_ID (or node-id in .env)')
  }

  console.log(`Using Figma file: ${fileKey}`)
  console.log(`Using node: ${nodeId}`)
  console.log(`Using token: ${maskToken(token)}`)
  await fs.mkdir(outputDir, { recursive: true })

  const fileUrl = `${FIGMA_API}/files/${fileKey}?ids=${encodeURIComponent(nodeId)}&depth=2`
  console.log('Fetching Figma file data...')
  const fileData = await requestJson(fileUrl, token)
  console.log('Figma file data loaded')
  const root = fileData.document
  const frame = findNodeById(root, nodeId)

  if (!frame) {
    throw new Error(`Node not found: ${nodeId}`)
  }

  const exportables = []
  if (!onlyFrame) {
    collectExportableNodes(frame, exportables)
  }

  const exportIds = new Set(exportables.map((node) => node.id))
  exportIds.add(frame.id)

  const idList = Array.from(exportIds)

  if (checkOnly) {
    console.log(`Exportable nodes: ${exportables.length}`)
    const preview = idList.slice(0, 10).join(', ')
    console.log(`Sample node ids: ${preview || 'none'}`)
    return
  }

  const images = await downloadImages({
    fileKey,
    token,
    nodeIds: idList,
    scale
  })

  const idToName = new Map()
  idToName.set(frame.id, `background-no-text@${scale}x.png`)
  for (const node of exportables) {
    const base = sanitizeName(node.name || 'asset')
    const filename = `${base}@${scale}x.png`
    idToName.set(node.id, filename)
  }

  for (const item of images) {
    const filename = idToName.get(item.id) || `${item.id.replace(/[:]/g, '-')}.png`
    const filePath = path.join(outputDir, filename)
    await fs.writeFile(filePath, item.buffer)
  }

  if (scale !== 1) {
    const images1x = await downloadImages({
      fileKey,
      token,
      nodeIds: [frame.id],
      scale: 1
    })

    if (images1x[0]?.buffer) {
      await fs.writeFile(path.join(outputDir, 'background-no-text.png'), images1x[0].buffer)
    }
  }

  console.log(`Downloaded ${images.length} asset(s) to ${outputDir}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
