const PLAN_CONFIG = {
  mensal: {
    env: 'STRIPE_PRICE_MENSAL',
    name: 'Mensal',
    amount_cents: 1990,
    billing_interval_months: 1,
  },
  trimestral: {
    env: 'STRIPE_PRICE_TRIMESTRAL',
    name: 'Trimestral',
    amount_cents: 5490,
    billing_interval_months: 3,
  },
  semestral: {
    env: 'STRIPE_PRICE_SEMESTRAL',
    name: 'Semestral',
    amount_cents: 9990,
    billing_interval_months: 6,
  },
  anual: {
    env: 'STRIPE_PRICE_ANUAL',
    name: 'Anual',
    amount_cents: 17990,
    billing_interval_months: 12,
  },
}

function getOrigin(request) {
  const host = request.headers['x-forwarded-host'] || request.headers.host
  const proto = request.headers['x-forwarded-proto'] || 'https'
  return host ? `${proto}://${host}` : 'https://o-feirante.vercel.app'
}

function add(params, key, value) {
  if (value !== undefined && value !== null && value !== '') params.append(key, String(value))
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ message: 'Método não permitido.' })
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  if (!stripeSecretKey) {
    return response.status(500).json({ message: 'STRIPE_SECRET_KEY não configurada na Vercel.' })
  }

  try {
    const body = request.body || {}
    const planId = String(body.plan_id || '').toLowerCase()
    const plan = PLAN_CONFIG[planId]

    if (!plan) {
      return response.status(400).json({ message: 'Plano inválido.' })
    }

    const priceId = process.env[plan.env]
    if (!priceId) {
      return response.status(500).json({ message: `${plan.env} não configurado na Vercel.` })
    }

    const signup = body.signup || {}
    const customer = body.customer || {}
    const customerEmail = String(customer.email || signup.email || '').trim().toLowerCase()
    const customerName = String(customer.name || signup.full_name || '').trim()
    const orderNsu = String(body.order_nsu || `OF-${planId.toUpperCase()}-${Date.now()}`)
    const origin = getOrigin(request)
    const successUrl = body.success_url || `${origin}/?pagamento=sucesso&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = body.cancel_url || `${origin}/?pagamento=cancelado`

    if (!customerEmail || !customerName) {
      return response.status(400).json({ message: 'Informe nome e e-mail para assinar.' })
    }

    const params = new URLSearchParams()
    add(params, 'mode', 'subscription')
    add(params, 'success_url', successUrl.includes('{CHECKOUT_SESSION_ID}') ? successUrl : `${successUrl}&session_id={CHECKOUT_SESSION_ID}`)
    add(params, 'cancel_url', cancelUrl)
    add(params, 'customer_email', customerEmail)
    add(params, 'client_reference_id', orderNsu)
    add(params, 'line_items[0][price]', priceId)
    add(params, 'line_items[0][quantity]', '1')
    add(params, 'allow_promotion_codes', 'true')

    const metadata = {
      order_nsu: orderNsu,
      app: 'o-feirante',
      plan_id: planId,
      plan_name: plan.name,
      billing_interval_months: plan.billing_interval_months,
      amount_cents: plan.amount_cents,
      customer_email: customerEmail,
      customer_name: customerName,
      cpf: signup.cpf || '',
      phone: signup.phone || '',
      city: signup.city || '',
      state: signup.state || '',
      stall_name: signup.stall_name || '',
      cnpj: signup.cnpj || '',
    }

    Object.entries(metadata).forEach(([key, value]) => {
      add(params, `metadata[${key}]`, value)
      add(params, `subscription_data[metadata][${key}]`, value)
    })

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })

    const data = await stripeResponse.json().catch(() => ({}))

    if (!stripeResponse.ok) {
      return response.status(stripeResponse.status).json({
        message: data.error?.message || 'Não foi possível criar o checkout da Stripe.',
        details: data,
      })
    }

    return response.status(200).json({
      id: data.id,
      url: data.url,
      price_id: priceId,
      plan_id: planId,
      plan_name: plan.name,
    })
  } catch (error) {
    return response.status(500).json({
      message: error.message || 'Erro interno ao iniciar assinatura.',
    })
  }
}
