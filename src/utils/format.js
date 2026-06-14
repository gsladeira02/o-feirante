export function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function qty(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    maximumFractionDigits: 2,
  })
}

export function dateBR(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('pt-BR')
}
