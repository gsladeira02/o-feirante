import crypto from 'node:crypto'

const PLAN_BY_PRICE_ENV = [
  ['STRIPE_PRICE_MENSAL', 'mensal', 'Mensal', 1],
  ['STRIPE_PRICE_TRIMESTRAL', 'trimestral', 'Trimestral', 3],
  ['STRIPE_PRICE_SEMESTRAL', 'semestral', 'Semestral', 6],
  ['STRIPE_PRICE_ANUAL', 'anual', 'Anual', 12],
]

function getRawBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = []
    request.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    request.on('end', () => resolve(Buffer.concat(chunks)))
    request.on('error', reject)
  })
}

function verifyStripeSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => {
      const [key, ...rest] = part.split('=')
      return [key, rest.join('=')]
    })
  )
  const timestamp = parts.t
  const signature = parts.v1
  if (!timestamp || !signature) return false

  const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}

function normalizeStripeStatus(status) {
  if (status === 'active' || status === 'trialing') return 'active'
  if (status === 'past_due' || status === 'unpaid') return 'past_due'
  if (status === 'canceled') return 'canceled'
  if (status === 'incomplete_expired') return 'expired'
  if (status === 'incomplete') return 'pending'
  return status || 'pending'
}

function isoFromUnix(value) {
  if (!value) return null
  return new Date(value * 1000).toISOString()
}

function getPlanByPrice(priceId, metadata = {}) {
  const found = PLAN_BY_PRICE_ENV.find(([env]) => process.env[env] && process.env[env] === priceId)
  if (found) return { plan_id: found[1], plan_name: found[2], billing_interval_months: found[3] }

  const months = Number(metadata.billing_interval_months || 1)
  return {
    plan_id: metadata.plan_id || null,
    plan_name: metadata.plan_name || null,
    billing_interval_months: Number.isFinite(months) && months > 0 ? months : 1,
  }
}

async function stripeGet(path) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error?.message || 'Erro ao consultar Stripe.')
  return data
}

async function applySubscription(payload) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL/VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.')
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/stripe_apply_subscription_update`, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Erro ao atualizar Supabase: ${text}`)
  }
}

async function buildPayloadFromSubscription(subscription, overrides = {}) {
  const item = subscription.items?.data?.[0]
  const priceId = item?.price?.id || overrides.stripe_price_id || null
  const metadata = { ...(subscription.metadata || {}), ...(overrides.metadata || {}) }
  const plan = getPlanByPrice(priceId, metadata)

  return {
    p_order_nsu: metadata.order_nsu || overrides.order_nsu || null,
    p_email: metadata.customer_email || overrides.email || null,
    p_stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id || overrides.stripe_customer_id || null,
    p_stripe_subscription_id: subscription.id,
    p_stripe_checkout_session_id: overrides.stripe_checkout_session_id || null,
    p_stripe_price_id: priceId,
    p_plan_id: plan.plan_id,
    p_plan_name: plan.plan_name,
    p_billing_interval_months: plan.billing_interval_months,
    p_subscription_status: normalizeStripeStatus(overrides.status || subscription.status),
    p_current_period_start: isoFromUnix(subscription.current_period_start),
    p_current_period_end: isoFromUnix(subscription.current_period_end),
    p_last_payment_at: overrides.last_payment_at || null,
    p_cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
  }
}

async function handleCheckoutCompleted(session) {
  if (!session.subscription) return
  const subscription = await stripeGet(`/subscriptions/${session.subscription}`)
  const payload = await buildPayloadFromSubscription(subscription, {
    order_nsu: session.client_reference_id || session.metadata?.order_nsu,
    email: session.customer_details?.email || session.customer_email || session.metadata?.customer_email,
    stripe_customer_id: session.customer,
    stripe_checkout_session_id: session.id,
    metadata: session.metadata || {},
    status: 'active',
    last_payment_at: new Date().toISOString(),
  })
  await applySubscription(payload)
}

async function handleSubscription(subscription) {
  const payload = await buildPayloadFromSubscription(subscription)
  await applySubscription(payload)
}

async function handleInvoice(invoice, paid) {
  const subscriptionId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id
  if (!subscriptionId) return
  const subscription = await stripeGet(`/subscriptions/${subscriptionId}`)
  const payload = await buildPayloadFromSubscription(subscription, {
    email: invoice.customer_email,
    stripe_customer_id: invoice.customer,
    status: paid ? 'active' : 'past_due',
    last_payment_at: paid ? new Date().toISOString() : null,
  })
  await applySubscription(payload)
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ message: 'Método não permitido.' })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return response.status(500).json({ message: 'STRIPE_WEBHOOK_SECRET não configurado.' })
  }

  try {
    const rawBody = await getRawBody(request)
    const signature = request.headers['stripe-signature']
    const isValid = verifyStripeSignature(rawBody, signature, webhookSecret)

    if (!isValid) {
      return response.status(400).json({ message: 'Assinatura do webhook inválida.' })
    }

    const event = JSON.parse(rawBody.toString('utf8'))

    if (event.type === 'checkout.session.completed') {
      await handleCheckoutCompleted(event.data.object)
    } else if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      await handleSubscription(event.data.object)
    } else if (event.type === 'invoice.payment_succeeded') {
      await handleInvoice(event.data.object, true)
    } else if (event.type === 'invoice.payment_failed') {
      await handleInvoice(event.data.object, false)
    }

    return response.status(200).json({ received: true })
  } catch (error) {
    console.error(error)
    return response.status(500).json({ message: error.message || 'Erro ao processar webhook Stripe.' })
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}
