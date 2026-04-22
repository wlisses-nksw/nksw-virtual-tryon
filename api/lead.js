// api/lead.js — Salva lead no Klaviyo (name, phone, email)

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

  const apiKey  = process.env.KLAVIYO_API_KEY;
  const listId  = process.env.KLAVIYO_LIST_ID;

  if (!apiKey || !listId) {
    console.warn('[lead] KLAVIYO_API_KEY ou KLAVIYO_LIST_ID não configurados');
    return res.status(200).json({ ok: true }); // falha silenciosa — não bloqueia o cliente
  }

  const { name, phone, email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'E-mail obrigatório' });

  try {
    // 1. Criar/atualizar perfil
    const profileRes = await fetch('https://a.klaviyo.com/api/profiles/', {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${apiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-02-15',
      },
      body: JSON.stringify({
        data: {
          type: 'profile',
          attributes: {
            email,
            ...(name  ? { first_name: name }                              : {}),
            ...(phone ? { phone_number: phone.replace(/\D/g, '')
                            .replace(/^(\d{2})(\d)/, '+55$1$2') } : {}),
            properties: { source: 'Provador Virtual' },
          },
        },
      }),
    });

    const profileData = await profileRes.json();
    const profileId   = profileData?.data?.id
      || profileData?.errors?.[0]?.meta?.duplicate_profile_id;

    if (!profileId) throw new Error('Perfil não criado: ' + JSON.stringify(profileData).slice(0, 200));

    // 2. Adicionar à lista
    await fetch(`https://a.klaviyo.com/api/lists/${listId}/relationships/profiles/`, {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${apiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-02-15',
      },
      body: JSON.stringify({ data: [{ type: 'profile', id: profileId }] }),
    });

    console.log('[lead] Salvo no Klaviyo:', email);
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('[lead]', err.message);
    return res.status(200).json({ ok: true }); // falha silenciosa
  }
}
