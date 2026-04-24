// api/lead.js — Salva lead no Shopify (clientes com aceita marketing)

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default async function handler(req, res) {
  const headers = cors();
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { name, phone, email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'E-mail obrigatório' });

  const shopDomain  = process.env.SHOPIFY_STORE?.trim();
  const adminToken  = process.env.SHOPIFY_ADMIN_TOKEN?.trim();

  if (!shopDomain || !adminToken) {
    console.warn('[lead] SHOPIFY_STORE ou SHOPIFY_ADMIN_TOKEN não configurados — lead não salvo:', email);
    return res.status(200).json({ ok: true });
  }

  try {
    const shopRes = await fetch(
      `https://${shopDomain}/admin/api/2024-01/customers.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': adminToken,
        },
        body: JSON.stringify({
          customer: {
            email,
            first_name: name || '',
            phone: phone ? phone.replace(/\D/g, '').replace(/^(\d{2})(\d{5})(\d{4})$/, '+55$1$2$3') : undefined,
            accepts_marketing: true,
            email_marketing_consent: { state: 'subscribed', opt_in_level: 'single_opt_in' },
            tags: 'newsletter,provador-virtual',
          },
        }),
      }
    );

    const data = await shopRes.json();

    // 422 = e-mail já existe — atualizar marketing
    if (shopRes.status === 422 && data.errors?.email) {
      const searchRes = await fetch(
        `https://${shopDomain}/admin/api/2024-01/customers/search.json?query=email:${encodeURIComponent(email)}`,
        { headers: { 'X-Shopify-Access-Token': adminToken } }
      );
      const searchData = await searchRes.json();
      const customerId = searchData.customers?.[0]?.id;
      if (customerId) {
        await fetch(
          `https://${shopDomain}/admin/api/2024-01/customers/${customerId}.json`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': adminToken },
            body: JSON.stringify({ customer: { id: customerId, accepts_marketing: true, tags: 'newsletter,provador-virtual' } }),
          }
        );
      }
    }

    console.log('[lead] Salvo no Shopify:', email);
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('[lead]', err.message);
    return res.status(200).json({ ok: true }); // falha silenciosa
  }
}
