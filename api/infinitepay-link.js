export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ message: 'Método não permitido.' })
  }

  const handle = process.env.INFINITEPAY_HANDLE
  if (!handle) {
    return response.status(500).json({ message: 'INFINITEPAY_HANDLE não configurado na Vercel.' })
  }

  try {
    const body = request.body || {}
    const payload = {
      handle,
      redirect_url: body.redirect_url,
      order_nsu: body.order_nsu,
      customer: body.customer,
      items: body.items,
    }

    const infiniteResponse = await fetch('https://api.checkout.infinitepay.io/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await infiniteResponse.json().catch(() => ({}))

    if (!infiniteResponse.ok) {
      return response.status(infiniteResponse.status).json({
        message: data.message || 'Não foi possível gerar o link de pagamento.',
        details: data,
      })
    }

    return response.status(200).json(data)
  } catch (error) {
    return response.status(500).json({
      message: error.message || 'Erro interno ao gerar pagamento.',
    })
  }
}
