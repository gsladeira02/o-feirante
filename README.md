export function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function number(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    maximumFractionDigits: 2,
  })
}
