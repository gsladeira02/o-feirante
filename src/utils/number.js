export function parseDecimal(value) {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  const normalized = String(value)
    .trim()
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function decimalInputProps(extra = {}) {
  return {
    type: 'text',
    inputMode: 'decimal',
    autoComplete: 'off',
    ...extra,
  }
}
