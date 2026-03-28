interface CardData {
  full_name: string
  title?: string
  company_name?: string
  phone?: string
  email?: string
  website?: string
  avatar_url?: string
  bio?: string
  links?: Array<{ type: string; url: string; is_visible?: boolean }>
}

export async function generateVCard(card: CardData): Promise<string> {
  // vCard версия 3.0 (наиболее совместимая)
  const lines: string[] = []

  lines.push('BEGIN:VCARD')
  lines.push('VERSION:3.0')

  // Полное имя (обязательное поле)
  lines.push(`FN:${escapeVCardValue(card.full_name)}`)

  // Имя в структурированном формате
  const nameParts = card.full_name.split(' ')
  const lastName = nameParts[nameParts.length - 1] || ''
  const firstName = nameParts[0] || ''
  lines.push(`N:${escapeVCardValue(lastName)};${escapeVCardValue(firstName)};;;`)

  // Должность
  if (card.title) {
    lines.push(`TITLE:${escapeVCardValue(card.title)}`)
  }

  // Организация
  if (card.company_name) {
    lines.push(`ORG:${escapeVCardValue(card.company_name)}`)
  }

  // Телефон (нормализованный в E.164 формат, если возможно)
  if (card.phone) {
    const normalizedPhone = normalizePhone(card.phone)
    lines.push(`TEL;TYPE=CELL:${normalizedPhone}`)
  }

  // Email
  if (card.email) {
    lines.push(`EMAIL;TYPE=INTERNET:${escapeVCardValue(card.email)}`)
  }

  // Website
  if (card.website) {
    lines.push(`URL:${escapeVCardValue(normalizeUrl(card.website))}`)
  }

  const visibleLinks = (card.links || []).filter((link) => link?.url && link.is_visible !== false)
  for (const link of visibleLinks) {
    const normalized = normalizeUrl(link.url)
    const type = (link.type || 'other').toUpperCase()
    lines.push(`URL;TYPE=${escapeVCardValue(type)}:${escapeVCardValue(normalized)}`)
    lines.push(`X-SOCIALPROFILE;TYPE=${escapeVCardValue(type)}:${escapeVCardValue(normalized)}`)
  }

  if (card.bio) {
    lines.push(`NOTE:${escapeVCardValue(card.bio)}`)
  }

  // Фото: сначала пробуем встроить в .vcf (лучше для iOS/Android импорта контактов)
  // Если не удалось, используем fallback через URL.
  const embeddedPhoto = await buildEmbeddedPhotoLine(card.avatar_url)
  if (embeddedPhoto) {
    lines.push(embeddedPhoto)
  } else if (card.avatar_url) {
    lines.push(`PHOTO;VALUE=URL:${escapeVCardValue(normalizeUrl(card.avatar_url))}`)
  }

  // Дата создания
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  lines.push(`REV:${now}`)

  lines.push('END:VCARD')

  // Объединяем с CRLF (как требует спецификация vCard)
  return lines.map((line) => foldVCardLine(line)).join('\r\n')
}

// Экранирование специальных символов в vCard
function escapeVCardValue(value: string): string {
  if (!value) return ''
  
  return value
    .replace(/\\/g, '\\\\')  // Обратный слеш
    .replace(/,/g, '\\,')    // Запятая
    .replace(/;/g, '\\;')    // Точка с запятой
    .replace(/\n/g, '\\n')   // Перенос строки
}

// Нормализация телефона в международный формат
function normalizePhone(phone: string): string {
  // Убираем все нечисловые символы кроме +
  const cleaned = phone.replace(/[^\d+]/g, '')
  
  // Если уже начинается с +, возвращаем как есть
  if (cleaned.startsWith('+')) {
    return cleaned
  }
  
  // Если начинается с 8 или 7 (для России/СНГ), добавляем +
  if (cleaned.startsWith('8') || cleaned.startsWith('7')) {
    return '+7' + cleaned.slice(1)
  }
  
  // Иначе просто добавляем + в начало
  return '+' + cleaned
}

function normalizeUrl(url: string): string {
  if (!url) return ''
  return /^[a-z][a-z\d+.-]*:/i.test(url) ? url : `https://${url}`
}

function foldVCardLine(line: string, maxLength = 75): string {
  if (line.length <= maxLength) return line

  let output = line.slice(0, maxLength)
  let remainder = line.slice(maxLength)

  while (remainder.length > 0) {
    output += `\r\n ${remainder.slice(0, maxLength - 1)}`
    remainder = remainder.slice(maxLength - 1)
  }

  return output
}

async function buildEmbeddedPhotoLine(avatarUrl?: string): Promise<string | null> {
  if (!avatarUrl) return null

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const response = await fetch(normalizeUrl(avatarUrl), { signal: controller.signal })
    clearTimeout(timeout)

    if (!response.ok) return null

    const contentType = (response.headers.get('content-type') || '').toLowerCase()
    const photoType = contentType.includes('png')
      ? 'PNG'
      : contentType.includes('gif')
        ? 'GIF'
        : contentType.includes('jpeg') || contentType.includes('jpg')
          ? 'JPEG'
          : null

    if (!photoType) return null

    const arrayBuffer = await response.arrayBuffer()
    const bytes = Buffer.from(arrayBuffer)

    // Ограничиваем размер, чтобы vcf не был слишком тяжелым
    if (bytes.byteLength > 1024 * 1024 * 2) {
      return null
    }

    const base64 = bytes.toString('base64')
    return `PHOTO;ENCODING=b;TYPE=${photoType}:${base64}`
  } catch {
    return null
  }
}
