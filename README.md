import { supabase } from '../supabase'

export async function getSession() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getProducts(userId) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', userId)
    .order('name')

  if (error) throw error
  return data || []
}

export async function createProduct(product) {
  const { error } = await supabase.from('products').insert(product)
  if (error) throw error
}

export async function deleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw error
}

export async function registerPurchase({ userId, product, quantity, totalValue, supplier }) {
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
    supplier,
  })
  if (purchaseError) throw purchaseError

  const { error: productError } = await supabase
    .from('products')
    .update({
      stock: newStock,
      average_cost: newAverageCost,
    })
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

export async function startFair({ userId, name, items }) {
  const selected = items.filter((item) => Number(item.quantity_taken || 0) > 0)
  if (!selected.length) throw new Error('Informe pelo menos um produto levado.')

  const { data: fair, error: fairError } = await supabase
    .from('fairs')
    .insert({ user_id: userId, name, status: 'active' })
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

  const { error: itemsError } = await supabase.from('fair_items').insert(fairItems)
  if (itemsError) throw itemsError

  for (const item of selected) {
    const newStock = Number(item.stock || 0) - Number(item.quantity_taken || 0)
    const { error } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', item.id)

    if (error) throw error
  }

  return fair
}

export async function closeFair({ fair, closingItems }) {
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

  const { error: fairError } = await supabase
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

  if (fairError) throw fairError
}

export async function getClosedFairs(userId) {
  const { data, error } = await supabase
    .from('fairs')
    .select('*, fair_items(*)')
    .eq('user_id', userId)
    .eq('status', 'closed')
    .order('closed_at', { ascending: false })

  if (error) throw error
  return data || []
}


export async function getOrCreateProfile(user) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw error
  if (data) return data

  const fallbackName = user.email?.split('@')[0] || 'Feirante'

  const { data: created, error: createError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      name: fallbackName,
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
  const { error: authError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (authError) throw authError

  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ first_login: false })
    .eq('id', userData.user.id)

  if (profileError) throw profileError
}
