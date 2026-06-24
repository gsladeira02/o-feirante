import { supabase } from '../supabase'
import { parseDecimal } from '../utils/number'

export const DEMO_ACCOUNT_MESSAGE = 'Esta é uma conta teste. As ações de cadastro, edição, exclusão, entrada de mercadoria e início/encerramento de feira estão bloqueadas para demonstração.'


const CLOSED_FAIRS_KEY = 'o_feirante_closed_fairs_v1'
const CLOSED_FAIR_SIGNATURES_KEY = 'o_feirante_closed_fair_signatures_v1'

function getLocallyClosedFairIds() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CLOSED_FAIRS_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function markFairClosedLocally(fairId, fair = null) {
  if (!fairId || typeof window === 'undefined') return
  try {
    const list = getLocallyClosedFairIds()
    if (!list.includes(fairId)) {
      window.localStorage.setItem(CLOSED_FAIRS_KEY, JSON.stringify([...list, fairId].slice(-100)))
    }
    if (fair) markFairSignatureClosedLocally(fair)
  } catch {}
}

function isFairClosedLocally(fairId) {
  return getLocallyClosedFairIds().includes(fairId)
}




function fairSignature(fair = {}) {
  const date = String(fair.closed_at || fair.created_at || '').slice(0, 10)
  const place = fair.fair_place_id || ''
  const name = normalizeText(fair.name || '')
  return `${date}|${place}|${name}`
}

function getLocallyClosedFairSignatures() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CLOSED_FAIR_SIGNATURES_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

function markFairSignatureClosedLocally(fair) {
  if (!fair || typeof window === 'undefined') return
  const signature = fairSignature(fair)
  if (!signature || signature === '||') return
  try {
    const list = getLocallyClosedFairSignatures()
    if (!list.includes(signature)) {
      window.localStorage.setItem(CLOSED_FAIR_SIGNATURES_KEY, JSON.stringify([...list, signature].slice(-150)))
    }
  } catch {}
}

function isFairSignatureClosedLocally(fair) {
  const signature = fairSignature(fair)
  return Boolean(signature && getLocallyClosedFairSignatures().includes(signature))
}

function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

export function sortProductsByCategoryName(products = []) {
  return [...products].sort((a, b) => {
    const categoryA = normalizeText(a.categories?.name || 'Sem categoria')
    const categoryB = normalizeText(b.categories?.name || 'Sem categoria')
    if (categoryA !== categoryB) return categoryA.localeCompare(categoryB, 'pt-BR')
    return normalizeText(a.name).localeCompare(normalizeText(b.name), 'pt-BR')
  })
}



export function getItemCategoryName(item = {}) {
  return item.products?.categories?.name || item.product?.categories?.name || item.category_name || item.categoryName || 'Sem categoria'
}

export function sortFairItemsByCategoryName(items = []) {
  return [...items].sort((a, b) => {
    const categoryA = normalizeText(getItemCategoryName(a))
    const categoryB = normalizeText(getItemCategoryName(b))
    if (categoryA !== categoryB) return categoryA.localeCompare(categoryB, 'pt-BR')
    return normalizeText(a.product_name || a.name).localeCompare(normalizeText(b.product_name || b.name), 'pt-BR')
  })
}

function normalizeFair(fair) {
  if (!fair) return fair
  return {
    ...fair,
    fair_items: sortFairItemsByCategoryName(fair.fair_items || []),
  }
}

export async function getUserAccess(userId) {
  const { data, error } = await supabase
    .from('user_access')
    .select('read_only, is_active, label, plan_id, plan_name, billing_interval_months, subscription_status, current_period_start, current_period_end, grace_until, last_payment_at, infinitepay_subscription_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error?.code === '42P01' || error?.code === 'PGRST205' || error?.message?.includes('user_access')) {
    return { read_only: false, is_active: true, label: null, subscription_status: 'manual' }
  }

  if (error) throw error
  return data || { read_only: false, is_active: true, label: null, subscription_status: 'manual' }
}

async function ensureCanWrite() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data?.user?.id) throw new Error('Usuário não autenticado.')

  const access = await getUserAccess(data.user.id)

  if (access.is_active === false) {
    throw new Error('Sua conta está inativa. Entre em contato para regularizar o acesso.')
  }

  if (access.subscription_status === 'past_due' || access.subscription_status === 'expired' || access.subscription_status === 'canceled') {
    const graceUntil = access.grace_until ? new Date(access.grace_until) : null
    if (!graceUntil || graceUntil.getTime() < Date.now()) {
      throw new Error('Sua assinatura está vencida. Regularize o pagamento para continuar usando o sistema.')
    }
  }

  if (access.read_only) {
    throw new Error(DEMO_ACCOUNT_MESSAGE)
  }
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getOrCreateProfile(user) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw error
  if (data) return data

  const { data: created, error: createError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      name: user.email?.split('@')[0] || 'Feirante',
      stall_name: 'Minha banca',
      city: '',
      first_login: true,
    })
    .select()
    .single()

  if (createError) throw createError
  return created
}


export async function updateProfileData(profile) {
  await ensureCanWrite()

  const fullName = String(profile.full_name || '').trim()
  const stallName = String(profile.stall_name || '').trim()
  const city = String(profile.city || '').trim()
  const state = String(profile.state || '').trim().toUpperCase()
  const phone = String(profile.phone || '').replace(/\D/g, '')
  const cpf = String(profile.cpf || '').replace(/\D/g, '')
  const cnpj = String(profile.cnpj || '').replace(/\D/g, '')

  if (!fullName) throw new Error('Informe o nome completo.')
  if (cpf && cpf.length !== 11) throw new Error('Informe um CPF válido com 11 números.')
  if (phone && phone.length < 10) throw new Error('Informe um celular válido com DDD.')
  if (!city) throw new Error('Informe a cidade.')
  if (!state || state.length !== 2) throw new Error('Informe a sigla do estado com 2 letras.')
  if (!stallName) throw new Error('Informe o nome da banca.')
  if (cnpj && cnpj.length !== 14) throw new Error('O CNPJ é opcional, mas se informado precisa ter 14 números.')

  const payload = {
    name: fullName,
    full_name: fullName,
    cpf: cpf || null,
    birth_date: profile.birth_date || null,
    phone: phone || null,
    city,
    state,
    stall_name: stallName,
    cnpj: cnpj || null,
  }

  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', profile.id)

  if (error) throw error
}

export async function changeFirstPassword(newPassword) {
  const { error: authError } = await supabase.auth.updateUser({ password: newPassword })
  if (authError) throw authError

  const { data, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError

  const { error } = await supabase
    .from('profiles')
    .update({ first_login: false })
    .eq('id', data.user.id)

  if (error) throw error
}

export async function getCategories(userId) {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('name')

  if (error) throw error
  return data || []
}

export async function createCategory({ userId, name }) {
  await ensureCanWrite()
  const cleanName = name.trim()
  if (!cleanName) throw new Error('Informe o nome da categoria.')

  const { error } = await supabase
    .from('categories')
    .insert({ user_id: userId, name: cleanName })

  if (error?.code === '23505') throw new Error('Essa categoria já existe.')
  if (error) throw error
}

export async function deleteCategory(id) {
  await ensureCanWrite()
  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}

export async function getFairPlaces(userId) {
  const { data, error } = await supabase
    .from('fair_places')
    .select('*')
    .eq('user_id', userId)
    .order('name')

  if (error) throw error
  return data || []
}

export async function createFairPlace({ userId, name, address, weekday }) {
  await ensureCanWrite()
  const cleanName = name.trim()
  if (!cleanName) throw new Error('Informe o nome da feira.')

  const { error } = await supabase
    .from('fair_places')
    .insert({ user_id: userId, name: cleanName, address, weekday })

  if (error?.code === '23505') throw new Error('Essa feira já existe.')
  if (error) throw error
}

export async function deleteFairPlace(id) {
  await ensureCanWrite()
  const { error } = await supabase.from('fair_places').delete().eq('id', id)
  if (error) throw error
}

export async function getProducts(userId) {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name)')
    .eq('user_id', userId)
    .order('name')

  if (error) throw error
  return sortProductsByCategoryName(data || [])
}

export async function createProduct(product) {
  await ensureCanWrite()
  const { error } = await supabase.from('products').insert(product)
  if (error) throw error
}

export async function deleteProduct(id) {
  await ensureCanWrite()
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

export async function registerPurchase({ userId, product, quantity, totalValue }) {
  await ensureCanWrite()
  const oldStock = parseDecimal(product.stock)
  const oldCost = parseDecimal(product.average_cost)
  const qty = parseDecimal(quantity)
  const total = parseDecimal(totalValue)
  const newStock = oldStock + qty
  const newAverageCost = newStock > 0 ? ((oldStock * oldCost) + total) / newStock : 0

  const { error: purchaseError } = await supabase.from('purchases').insert({
    user_id: userId,
    product_id: product.id,
    quantity: qty,
    total_value: total,
  })
  if (purchaseError) throw purchaseError

  const { error: productError } = await supabase
    .from('products')
    .update({ stock: newStock, average_cost: newAverageCost })
    .eq('id', product.id)

  if (productError) throw productError
}

export function hasClosingData(fair = {}) {
  const totals = ['revenue_total', 'cost_total', 'profit_total', 'loss_total']
  if (fair.closed_at) return true
  if (totals.some((field) => Math.abs(parseDecimal(fair[field])) > 0.0001)) return true
  return (fair.fair_items || []).some((item) => (
    parseDecimal(item.quantity_returned) > 0 ||
    parseDecimal(item.quantity_lost) > 0 ||
    parseDecimal(item.quantity_sold) > 0 ||
    Math.abs(parseDecimal(item.revenue)) > 0.0001 ||
    Math.abs(parseDecimal(item.cost)) > 0.0001 ||
    Math.abs(parseDecimal(item.profit)) > 0.0001 ||
    Math.abs(parseDecimal(item.loss_value)) > 0.0001
  ))
}



export function isFairAlreadyClosed(fair = {}) {
  if (!fair) return false
  if (fair.status && fair.status !== 'active') return true
  if (fair.closed_at) return true
  return hasClosingData(fair)
}

function getFairTotalsFromItems(fair = {}) {
  return (fair.fair_items || []).reduce((acc, item) => ({
    revenue_total: acc.revenue_total + parseDecimal(item.revenue),
    cost_total: acc.cost_total + parseDecimal(item.cost),
    profit_total: acc.profit_total + parseDecimal(item.profit),
    loss_total: acc.loss_total + parseDecimal(item.loss_value),
  }), { revenue_total: 0, cost_total: 0, profit_total: 0, loss_total: 0 })
}

export async function repairFinishedActiveFairs(userId) {
  if (!userId) return

  const { data, error } = await supabase
    .from('fairs')
    .select('*, fair_items(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) throw error

  const staleFairs = (data || []).filter(hasClosingData)
  for (const fair of staleFairs) {
    const totals = getFairTotalsFromItems(fair)
    await supabase
      .from('fairs')
      .update({
        status: 'closed',
        closed_at: fair.closed_at || new Date().toISOString(),
        revenue_total: parseDecimal(fair.revenue_total) || totals.revenue_total,
        cost_total: parseDecimal(fair.cost_total) || totals.cost_total,
        profit_total: parseDecimal(fair.profit_total) || totals.profit_total,
        loss_total: parseDecimal(fair.loss_total) || totals.loss_total,
      })
      .eq('id', fair.id)
      .eq('user_id', userId)
    markFairClosedLocally(fair.id, { ...fair, status: 'closed', closed_at: fair.closed_at || new Date().toISOString() })
  }

  // Depois de corrigir feiras com dados de fechamento, esconda qualquer registro
  // duplicado que ainda ficou como active do mesmo local/nome e período.
  const { data: closedData, error: closedError } = await supabase
    .from('fairs')
    .select('id, user_id, fair_place_id, name, status, created_at, closed_at')
    .eq('user_id', userId)
    .eq('status', 'closed')
    .order('closed_at', { ascending: false })
    .limit(120)

  if (closedError) throw closedError
  await archiveDuplicateActiveFairs(userId, (closedData || []).map(normalizeFair))
}


export function isDuplicateOfClosedFair(activeFair = {}, closedFairs = []) {
  if (!activeFair || !Array.isArray(closedFairs) || !closedFairs.length) return false

  // Importante: não compare apenas por dia/local/nome.
  // O feirante pode encerrar uma feira e iniciar outra no mesmo local no mesmo dia.
  // A regra antiga escondia essa nova feira como se fosse duplicada.
  const activePlaceId = activeFair.fair_place_id || ''
  const activeName = normalizeText(activeFair.name || '')
  const activeCreatedAt = activeFair.created_at ? new Date(activeFair.created_at).getTime() : 0

  if (!activeCreatedAt) return false

  return closedFairs.some((closedFair) => {
    if (!closedFair || closedFair.id === activeFair.id) return false

    const closedPlaceId = closedFair.fair_place_id || ''
    const closedName = normalizeText(closedFair.name || '')
    const closedAt = closedFair.closed_at ? new Date(closedFair.closed_at).getTime() : 0

    if (!closedAt) return false

    const samePlace = activePlaceId && closedPlaceId && activePlaceId === closedPlaceId
    const sameName = activeName && closedName && activeName === closedName
    const closedAfterActiveStarted = closedAt >= activeCreatedAt
    const distanceHours = Math.abs(closedAt - activeCreatedAt) / 36e5

    // Só é duplicada se a feira ativa foi criada antes do fechamento registrado.
    // Se a feira ativa foi criada depois, é uma nova feira legítima e deve aparecer.
    return (samePlace || sameName) && closedAfterActiveStarted && distanceHours <= 48
  })
}

async function archiveDuplicateActiveFairs(userId, closedFairs = []) {
  if (!userId || !closedFairs.length) return

  const { data: activeData, error } = await supabase
    .from('fairs')
    .select('id, user_id, fair_place_id, name, status, created_at, closed_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .is('closed_at', null)

  if (error) throw error

  const duplicateIds = (activeData || [])
    .filter((fair) => isDuplicateOfClosedFair(fair, closedFairs))
    .map((fair) => fair.id)

  if (!duplicateIds.length) return

  const { error: updateError } = await supabase
    .from('fairs')
    .update({ status: 'archived', closed_at: new Date().toISOString() })
    .in('id', duplicateIds)
    .eq('user_id', userId)

  if (updateError) throw updateError

  (activeData || []).filter((fair) => duplicateIds.includes(fair.id)).forEach((fair) => markFairClosedLocally(fair.id, fair))
}

export async function getActiveFair(userId) {
  await repairFinishedActiveFairs(userId)

  const [{ data: activeData, error: activeError }, { data: closedData, error: closedError }] = await Promise.all([
    supabase
      .from('fairs')
      .select('*, fair_items(*, products(name, category_id, categories(name)))')
      .eq('user_id', userId)
      .eq('status', 'active')
      .is('closed_at', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('fairs')
      .select('id, user_id, fair_place_id, name, status, created_at, closed_at, revenue_total, cost_total, profit_total, loss_total, fair_items(*)')
      .eq('user_id', userId)
      .eq('status', 'closed')
      .order('closed_at', { ascending: false })
      .limit(80),
  ])

  if (activeError) throw activeError
  if (closedError) throw closedError

  const closedFairs = (closedData || []).map(normalizeFair)
  const candidates = (activeData || []).map(normalizeFair)
  const trulyActive = candidates.find((fair) => (
    !isFairClosedLocally(fair.id) &&
    !isFairSignatureClosedLocally(fair) &&
    !hasClosingData(fair) &&
    !isDuplicateOfClosedFair(fair, closedFairs)
  ))

  return normalizeFair(trulyActive || null)
}

export async function startFair({ userId, fairPlace, items }) {
  await ensureCanWrite()
  const selected = items.filter((item) => parseDecimal(item.quantity_taken) > 0)
  if (!selected.length) throw new Error('Informe pelo menos um produto levado.')

  const { data: fair, error: fairError } = await supabase
    .from('fairs')
    .insert({
      user_id: userId,
      fair_place_id: fairPlace.id,
      name: fairPlace.name,
      status: 'active',
    })
    .select()
    .single()

  if (fairError) throw fairError

  const fairItems = selected.map((item) => ({
    fair_id: fair.id,
    product_id: item.id,
    product_name: item.name,
    unit: item.unit,
    cost_at_time: parseDecimal(item.average_cost),
    sale_price_at_time: parseDecimal(item.sale_price),
    quantity_taken: parseDecimal(item.quantity_taken),
  }))

  const { error: itemError } = await supabase.from('fair_items').insert(fairItems)
  if (itemError) throw itemError

  for (const item of selected) {
    const newStock = parseDecimal(item.stock) - parseDecimal(item.quantity_taken)
    const { error } = await supabase.from('products').update({ stock: newStock }).eq('id', item.id)
    if (error) throw error
  }

  return fair
}

export async function updateFairTaken({ closingItems }) {
  await ensureCanWrite()

  for (const item of closingItems) {
    const newTaken = parseDecimal(item.quantity_taken)
    if (newTaken < 0) throw new Error(`A quantidade levada de ${item.product_name} não pode ser negativa.`)

    const { data: currentItem, error: itemReadError } = await supabase
      .from('fair_items')
      .select('quantity_taken')
      .eq('id', item.id)
      .single()

    if (itemReadError) throw itemReadError

    const oldTaken = parseDecimal(currentItem.quantity_taken)
    const diffTaken = newTaken - oldTaken

    if (diffTaken !== 0) {
      const { data: product, error: productReadError } = await supabase
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .single()

      if (productReadError) throw productReadError

      const newStock = parseDecimal(product.stock) - diffTaken
      if (newStock < 0) throw new Error(`Estoque insuficiente para ajustar ${item.product_name}.`)

      const { error: productError } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', item.product_id)

      if (productError) throw productError
    }

    const { error: itemError } = await supabase
      .from('fair_items')
      .update({ quantity_taken: newTaken })
      .eq('id', item.id)

    if (itemError) throw itemError
  }
}

export async function closeFair({ fair, closingItems }) {
  await ensureCanWrite()

  const payloadItems = closingItems.map((item) => ({
    id: item.id,
    product_id: item.product_id,
    product_name: item.product_name,
    quantity_taken: parseDecimal(item.quantity_taken),
    quantity_returned: parseDecimal(item.quantity_returned),
    quantity_lost: parseDecimal(item.quantity_lost),
    cost_at_time: parseDecimal(item.cost_at_time),
    sale_price_at_time: parseDecimal(item.sale_price_at_time),
  }))

  const { error: rpcError } = await supabase.rpc('close_fair_atomic', {
    p_fair_id: fair.id,
    p_items: payloadItems,
  })

  if (!rpcError) {
    const { data: checkedFair, error: checkError } = await supabase
      .from('fairs')
      .select('id, status, closed_at')
      .eq('id', fair.id)
      .maybeSingle()

    if (!checkError && checkedFair?.status === 'closed' && checkedFair?.closed_at) {
      markFairClosedLocally(fair.id, { ...fair, ...checkedFair })
      await archiveDuplicateActiveFairs(fair.user_id, [normalizeFair({ ...fair, ...checkedFair })])
      return
    }
  }

  const missingRpc = rpcError?.code === 'PGRST202' || rpcError?.message?.includes('close_fair_atomic') || !rpcError
  if (rpcError && !missingRpc) {
    throw new Error(`Não foi possível encerrar a feira: ${rpcError.message}`)
  }

  let revenueTotal = 0
  let costTotal = 0
  let profitTotal = 0
  let lossTotal = 0

  const productIds = closingItems
    .map((item) => item.product_id)
    .filter(Boolean)

  const { data: productsData, error: productsReadError } = await supabase
    .from('products')
    .select('id, stock')
    .in('id', productIds)

  if (productsReadError) throw productsReadError

  const productsById = new Map((productsData || []).map((product) => [product.id, product]))

  for (const item of closingItems) {
    const taken = parseDecimal(item.quantity_taken)
    const returned = parseDecimal(item.quantity_returned)
    const lost = parseDecimal(item.quantity_lost)

    if (taken < 0 || returned < 0 || lost < 0) {
      throw new Error(`Revise as quantidades de ${item.product_name}. Não use valores negativos.`)
    }

    if (returned + lost > taken) {
      throw new Error(`${item.product_name}: voltou + perdeu não pode ser maior que a quantidade levada.`)
    }

    const sold = Math.max(taken - returned - lost, 0)
    const revenue = sold * parseDecimal(item.sale_price_at_time)
    const cost = sold * parseDecimal(item.cost_at_time)
    const profit = revenue - cost
    const lossValue = lost * parseDecimal(item.cost_at_time)

    revenueTotal += revenue
    costTotal += cost
    profitTotal += profit
    lossTotal += lossValue

    const oldTaken = parseDecimal(item.__original_quantity_taken ?? item.original_quantity_taken ?? item.quantity_taken_original ?? item.quantity_taken)
    const diffTaken = taken - oldTaken

    const product = productsById.get(item.product_id)
    if (product) {
      const currentStock = parseDecimal(product.stock)
      const adjustedStock = Math.max(currentStock - diffTaken + returned, 0)
      productsById.set(item.product_id, { ...product, stock: adjustedStock })
    }

    const { error: itemError } = await supabase
      .from('fair_items')
      .update({
        quantity_taken: taken,
        quantity_returned: returned,
        quantity_lost: lost,
        quantity_sold: sold,
        revenue,
        cost,
        profit,
        loss_value: lossValue,
      })
      .eq('id', item.id)

    if (itemError) {
      throw new Error(`Não foi possível salvar o item ${item.product_name}: ${itemError.message}`)
    }
  }

  for (const productId of productIds) {
    const product = productsById.get(productId)
    if (!product) continue

    const { error: productError } = await supabase
      .from('products')
      .update({ stock: parseDecimal(product.stock) })
      .eq('id', productId)

    if (productError) throw new Error(`Não foi possível atualizar o estoque: ${productError.message}`)
  }

  const { data: updatedFair, error } = await supabase
    .from('fairs')
    .update({
      status: 'closed',
      revenue_total: revenueTotal,
      cost_total: costTotal,
      profit_total: profitTotal,
      loss_total: lossTotal,
      closed_at: new Date().toISOString(),
    })
    .eq('id', fair.id)
    .select('id, status, closed_at')
    .single()

  if (error || !updatedFair || updatedFair.status !== 'closed') {
    throw new Error(`Não foi possível encerrar a feira: ${error?.message || 'o status não foi atualizado.'}`)
  }

  markFairClosedLocally(fair.id, { ...fair, status: 'closed', closed_at: updatedFair.closed_at })
  await archiveDuplicateActiveFairs(fair.user_id, [normalizeFair({ ...fair, status: 'closed', closed_at: updatedFair.closed_at })])
}


export async function getClosedFairs(userId) {
  const { data, error } = await supabase
    .from('fairs')
    .select('*, fair_items(*, products(name, category_id, categories(name))), fair_places(name, address, weekday)')
    .eq('user_id', userId)
    .eq('status', 'closed')
    .order('closed_at', { ascending: false })

  if (error) throw error
  return (data || []).map(normalizeFair)
}


export async function updateCategory({ id, name }) {
  await ensureCanWrite()
  const cleanName = name.trim()
  if (!cleanName) throw new Error('Informe o nome da categoria.')

  const { error } = await supabase
    .from('categories')
    .update({ name: cleanName })
    .eq('id', id)

  if (error?.code === '23505') throw new Error('Essa categoria já existe.')
  if (error) throw error
}

export async function updateFairPlace({ id, name, address, weekday }) {
  await ensureCanWrite()
  const cleanName = name.trim()
  if (!cleanName) throw new Error('Informe o nome da feira.')

  const { error } = await supabase
    .from('fair_places')
    .update({ name: cleanName, address, weekday })
    .eq('id', id)

  if (error?.code === '23505') throw new Error('Essa feira já existe.')
  if (error) throw error
}

export async function updateProduct(product) {
  await ensureCanWrite()
  const { error } = await supabase
    .from('products')
    .update({
      category_id: product.category_id || null,
      name: product.name,
      unit: product.unit,
      stock: parseDecimal(product.stock),
      average_cost: parseDecimal(product.average_cost),
      sale_price: parseDecimal(product.sale_price),
    })
    .eq('id', product.id)

  if (error) throw error
}

export async function recordAppAccess() {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null
  const { error } = await supabase.rpc('record_app_access', { client_user_agent: userAgent })

  // Se a migration V3.5 ainda não foi rodada, o app continua funcionando normalmente.
  if (error?.code === '42883' || error?.message?.includes('record_app_access')) return
  if (error) throw error
}

export async function adminListClients() {
  const { data, error } = await supabase.rpc('admin_list_clients')
  if (error) throw error
  return data || []
}

export async function adminUpdateClientAccess(payload) {
  const { error } = await supabase.rpc('admin_update_client_access', {
    target_user_id: payload.user_id,
    new_is_active: payload.is_active,
    new_read_only: payload.read_only,
    new_subscription_status: payload.subscription_status,
    new_plan_id: payload.plan_id || null,
    new_plan_name: payload.plan_name || null,
    new_billing_interval_months: payload.billing_interval_months || null,
    new_current_period_end: payload.current_period_end || null,
    new_label: payload.label || null,
  })

  if (error) throw error
}

export async function adminListSignups() {
  const { data, error } = await supabase.rpc('admin_list_signups')
  if (error?.code === '42883' || error?.message?.includes('admin_list_signups')) return []
  if (error) throw error
  return data || []
}


export async function getDeliveryCustomers(userId) {
  const { data, error } = await supabase
    .from('delivery_customers')
    .select('*')
    .eq('user_id', userId)
    .order('name')

  if (error?.code === '42P01' || error?.code === 'PGRST205' || error?.message?.includes('delivery_customers')) return []
  if (error) throw error
  return data || []
}

export async function createDeliveryCustomer({ userId, name, address, phone }) {
  await ensureCanWrite()
  const cleanName = String(name || '').trim()
  if (!cleanName) throw new Error('Informe o nome do cliente.')

  const { error } = await supabase.from('delivery_customers').insert({
    user_id: userId,
    name: cleanName,
    address: String(address || '').trim(),
    phone: String(phone || '').trim(),
  })

  if (error) throw error
}

export async function updateDeliveryCustomer({ id, name, address, phone }) {
  await ensureCanWrite()
  const cleanName = String(name || '').trim()
  if (!cleanName) throw new Error('Informe o nome do cliente.')

  const { error } = await supabase
    .from('delivery_customers')
    .update({ name: cleanName, address: String(address || '').trim(), phone: String(phone || '').trim() })
    .eq('id', id)

  if (error) throw error
}

export async function deleteDeliveryCustomer(id) {
  await ensureCanWrite()
  const { error } = await supabase.from('delivery_customers').delete().eq('id', id)
  if (error) throw error
}

export async function getDeliveries(userId) {
  const { data, error } = await supabase
    .from('deliveries')
    .select('*, delivery_customers(name, address, phone), delivery_items(*, products(name, unit, categories(name)))')
    .eq('user_id', userId)
    .order('delivery_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error?.code === '42P01' || error?.code === 'PGRST205' || error?.message?.includes('deliveries')) return []
  if (error) throw error
  return data || []
}

export async function createDelivery({ userId, customerId, product, quantity, deliveryDate }) {
  await ensureCanWrite()
  if (!customerId) throw new Error('Selecione um cliente.')
  if (!product) throw new Error('Selecione um produto.')
  const qty = parseDecimal(quantity)
  if (qty <= 0) throw new Error('A quantidade da entrega precisa ser maior que zero.')
  if (qty > parseDecimal(product.stock)) throw new Error(`Você não tem estoque suficiente de ${product.name}.`)

  const { data: delivery, error: deliveryError } = await supabase
    .from('deliveries')
    .insert({
      user_id: userId,
      customer_id: customerId,
      delivery_date: deliveryDate || new Date().toISOString().slice(0, 10),
      status: 'pending',
    })
    .select()
    .single()

  if (deliveryError) throw deliveryError

  const { error: itemError } = await supabase.from('delivery_items').insert({
    delivery_id: delivery.id,
    product_id: product.id,
    product_name: product.name,
    unit: product.unit,
    quantity: qty,
    cost_at_time: parseDecimal(product.average_cost),
    sale_price_at_time: parseDecimal(product.sale_price),
    revenue: qty * parseDecimal(product.sale_price),
    cost: qty * parseDecimal(product.average_cost),
    profit: qty * (parseDecimal(product.sale_price) - parseDecimal(product.average_cost)),
  })

  if (itemError) throw itemError
}

export async function confirmDelivery(delivery) {
  await ensureCanWrite()
  if (!delivery || delivery.status === 'delivered') throw new Error('Entrega inválida ou já confirmada.')

  const items = delivery.delivery_items || []
  if (!items.length) throw new Error('Entrega sem produtos.')

  for (const item of items) {
    const { data: product, error: readError } = await supabase
      .from('products')
      .select('stock')
      .eq('id', item.product_id)
      .single()

    if (readError) throw readError

    const newStock = parseDecimal(product.stock) - parseDecimal(item.quantity)
    if (newStock < 0) throw new Error(`Estoque insuficiente para confirmar ${item.product_name}.`)

    const { error: updateError } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', item.product_id)

    if (updateError) throw updateError
  }

  const { error } = await supabase
    .from('deliveries')
    .update({ status: 'delivered', delivered_at: new Date().toISOString() })
    .eq('id', delivery.id)

  if (error) throw error
}

export async function cancelDelivery(id) {
  await ensureCanWrite()
  const { error } = await supabase.from('deliveries').delete().eq('id', id)
  if (error) throw error
}
