interface CardData {
  full_name: string
  title?: string
  company_name?: string
  phone?: string
  email?: string
  website?: string
  avatar_url?: string
}

export function generateVCard(card: CardData): string {
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
    lines.push(`EMAIL:${card.email}`)
  }

  // Website
  if (card.website) {
    lines.push(`URL:${card.website}`)
  }

  // Фото (если есть avatar_url)
  if (card.avatar_url) {
    lines.push(`PHOTO;VALUE=URL:${card.avatar_url}`)
  }

  // Дата создания
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  lines.push(`REV:${now}`)

  lines.push('END:VCARD')

  // Объединяем с CRLF (как требует спецификация vCard)
  return lines.join('\r\n')
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
