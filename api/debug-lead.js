// api/debug-lead.js — diagnóstico temporário (remover após corrigir)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const shopDomain = process.env.SHOPIFY_STORE;
  const adminToken = process.env.SHOPIFY_ADMIN_TOKEN;

  const info = {
    SHOPIFY_STORE:       shopDomain ? `✅ "${shopDomain}"` : '❌ não definido',
    SHOPIFY_ADMIN_TOKEN: adminToken ? `✅ começa com "${adminToken.slice(0, 14)}..."` : '❌ não definido',
  };

  if (!shopDomain || !adminToken) {
    return res.status(200).json({ status: 'env vars faltando', info });
  }

  // Tenta criar cliente de teste
  try {
    const r = await fetch(`https://${shopDomain}/admin/api/2024-01/customers.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': adminToken },
      body: JSON.stringify({ customer: { email: 'debug-test-2@nksw.com.br', first_name: 'Debug', accepts_marketing: true, tags: 'newsletter' } }),
    });
    const data = await r.json();
    return res.status(200).json({ status: r.status, info, shopify: data });
  } catch (err) {
    return res.status(200).json({ status: 'erro', info, error: err.message });
  }
}
