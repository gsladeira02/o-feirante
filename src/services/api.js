import { supabase } from '../supabase'

export const DEMO_ACCOUNT_MESSAGE = 'Esta é uma conta teste. As ações de cadastro, edição, exclusão, entrada de mercadoria e início/encerramento de feira estão bloqueadas para demonstração.'

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
  return data || []
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
  const oldStock = Number(product.stock || 0)
  const oldCost = Number(product.average_cost || 0)
  const qty = Number(quantity || 0)
  const total = Number(totalValue || 0)
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

export async function getActiveFair(userId) {
  const { data, error } = await supabase
    .from('fairs')
    .select('*, fair_items(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function startFair({ userId, fairPlace, items }) {
  await ensureCanWrite()
  const selected = items.filter((item) => Number(item.quantity_taken || 0) > 0)
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
    cost_at_time: Number(item.average_cost || 0),
    sale_price_at_time: Number(item.sale_price || 0),
    quantity_taken: Number(item.quantity_taken || 0),
  }))

  const { error: itemError } = await supabase.from('fair_items').insert(fairItems)
  if (itemError) throw itemError

  for (const item of selected) {
    const newStock = Number(item.stock || 0) - Number(item.quantity_taken || 0)
    const { error } = await supabase.from('products').update({ stock: newStock }).eq('id', item.id)
    if (error) throw error
  }
}

export async function closeFair({ fair, closingItems }) {
  await ensureCanWrite()
  let revenueTotal = 0
  let costTotal = 0
  let profitTotal = 0
  let lossTotal = 0

  for (const item of closingItems) {
    const taken = Number(item.quantity_taken || 0)
    const returned = Number(item.quantity_returned || 0)
    const lost = Number(item.quantity_lost || 0)
    const sold = Math.max(taken - returned - lost, 0)
    const revenue = sold * Number(item.sale_price_at_time || 0)
    const cost = sold * Number(item.cost_at_time || 0)
    const profit = revenue - cost
    const lossValue = lost * Number(item.cost_at_time || 0)

    revenueTotal += revenue
    costTotal += cost
    profitTotal += profit
    lossTotal += lossValue

    const { error: itemError } = await supabase
      .from('fair_items')
      .update({
        quantity_returned: returned,
        quantity_lost: lost,
        quantity_sold: sold,
        revenue,
        cost,
        profit,
        loss_value: lossValue,
      })
      .eq('id', item.id)

    if (itemError) throw itemError

    if (returned > 0) {
      const { data: product, error: productReadError } = await supabase
        .from('products')
        .select('stock')
        .eq('id', item.product_id)
        .single()

      if (productReadError) throw productReadError

      const { error: productError } = await supabase
        .from('products')
        .update({ stock: Number(product.stock || 0) + returned })
        .eq('id', item.product_id)

      if (productError) throw productError
    }
  }

  const { error } = await supabase
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

  if (error) throw error
}

export async function getClosedFairs(userId) {
  const { data, error } = await supabase
    .from('fairs')
    .select('*, fair_items(*), fair_places(name, address, weekday)')
    .eq('user_id', userId)
    .eq('status', 'closed')
    .order('closed_at', { ascending: false })

  if (error) throw error
  return data || []
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
      stock: Number(product.stock || 0),
      average_cost: Number(product.average_cost || 0),
      sale_price: Number(product.sale_price || 0),
    })
    .eq('id', product.id)

  if (error) throw error
}
