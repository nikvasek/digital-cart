#!/usr/bin/env node

import { mkdir, writeFile, copyFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const ROOT_DIR = process.cwd()
const OUTPUT_DIR = path.join(ROOT_DIR, 'frontend/public/figma/site-pull')
const FIGMA_DIR = path.join(ROOT_DIR, 'frontend/public/figma')
const SITE_URL = process.env.FIGMA_SITE_URL
const FIGMA_TOKEN = process.env.FIGMA_TOKEN
const FIGMA_FILE_KEY = process.env.FIGMA_FILE_KEY
const NODE_IDS = (process.env.FIGMA_SITE_NODE_IDS || '0:3,1:8')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
const SYNC_PRIMARY = (process.env.FIGMA_SITE_SYNC_PRIMARY || 'true').toLowerCase() !== 'false'
const PRIMARY_TARGET = process.env.FIGMA_SITE_PRIMARY_TARGET || 'home-from-pdf.png'

const HEADERS = {
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
}

const usage = () => {
  console.log('Usage: FIGMA_SITE_URL="https://embed.figma.com/site/..." npm run figma:pull')
  console.log('Optional env vars:')
  console.log('  FIGMA_SITE_NODE_IDS="0:3,1:8"         # comma-separated node IDs')
  console.log('  FIGMA_SITE_SYNC_PRIMARY=true|false      # copy first node to /frontend/public/figma target')
  console.log('  FIGMA_SITE_PRIMARY_TARGET=home-from-pdf.png')
}

const normalizeNodeId = (nodeId) => nodeId.replace(/:/g, '-')
const toApiNodeId = (nodeId) => (nodeId.includes(':') ? nodeId : nodeId.replace(/-/g, ':'))

const buildNodeUrl = (rawUrl, nodeId) => {
  const url = new URL(rawUrl)
  url.searchParams.set('node-id', nodeId)
  return url.toString()
}

const extractImageUrl = (html) => {
  const patterns = [
    /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i,
    /<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i,
    /<meta\s+itemprop=["']image["']\s+content=["']([^"']+)["']/i,
    /"thumbnailUrl"\s*:\s*"([^"]+)"/i
  ]

  for (const pattern of patterns) {
    const matched = html.match(pattern)
    if (!matched?.[1]) continue
    const value = matched[1]
      .replace(/&amp;/g, '&')
      .replace(/\\u0026/g, '&')
      .replace(/\\\//g, '/')
    return value
  }

  return null
}

const fetchText = async (url) => {
  const response = await fetch(url, { headers: HEADERS })
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: HTTP ${response.status}`)
  }
  return response.text()
}

const fetchImageUrlFromApi = async (nodeId) => {
  if (!FIGMA_TOKEN || !FIGMA_FILE_KEY) return null

  const apiNodeId = toApiNodeId(nodeId)
  const apiUrl = `https://api.figma.com/v1/images/${encodeURIComponent(FIGMA_FILE_KEY)}?ids=${encodeURIComponent(apiNodeId)}&format=png&scale=2`
  const response = await fetch(apiUrl, {
    headers: {
      'x-figma-token': FIGMA_TOKEN,
      accept: 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Figma API request failed for node ${apiNodeId}: HTTP ${response.status}`)
  }

  const data = await response.json()
  return data?.images?.[apiNodeId] || null
}

const downloadImage = async (url, targetPath) => {
  const response = await fetch(url, { headers: { 'user-agent': HEADERS['user-agent'] } })
  if (!response.ok) {
    throw new Error(`Failed to download image ${url}: HTTP ${response.status}`)
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.startsWith('image/')) {
    throw new Error(`Unexpected content type for ${url}: ${contentType || 'unknown'}`)
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  await writeFile(targetPath, buffer)
  return buffer.length
}

const run = async () => {
  if (!SITE_URL) {
    usage()
    throw new Error('Missing FIGMA_SITE_URL')
  }

  await mkdir(OUTPUT_DIR, { recursive: true })
  await mkdir(FIGMA_DIR, { recursive: true })

  const savedFiles = []

  for (const nodeId of NODE_IDS) {
    const nodeUrl = buildNodeUrl(SITE_URL, nodeId)
    console.log(`Pulling preview for node ${nodeId} from ${nodeUrl}`)

    const html = await fetchText(nodeUrl)
    let imageUrl = extractImageUrl(html)
    if (!imageUrl) {
      imageUrl = await fetchImageUrlFromApi(nodeId)
      if (imageUrl) {
        console.log(`Resolved image for node ${nodeId} via Figma API fallback`)
      }
    }
    if (!imageUrl) {
      throw new Error(`Could not extract preview image URL from page for node ${nodeId}`)
    }

    const filename = `node-${normalizeNodeId(nodeId)}.png`
    const outputPath = path.join(OUTPUT_DIR, filename)
    const size = await downloadImage(imageUrl, outputPath)
    console.log(`Saved ${filename} (${Math.round(size / 1024)} KB)`)
    savedFiles.push(outputPath)
  }

  if (SYNC_PRIMARY && savedFiles.length > 0) {
    const primaryPath = path.join(FIGMA_DIR, PRIMARY_TARGET)
    await copyFile(savedFiles[0], primaryPath)
    console.log(`Updated primary image: ${path.relative(ROOT_DIR, primaryPath)}`)
  }

  console.log('Figma site pull completed successfully.')
}

run().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
