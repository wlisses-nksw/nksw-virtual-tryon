// api/submit.js — Vercel Serverless Function
// Recebe a foto do cliente + URL do produto, envia para FASHN e retorna o jobId.

const FASHN_BASE = 'https://api.fashn.ai/v1';
const MAX_BODY_BYTES = 12 * 1024 * 1024; // 12 MB

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

  const apiKey = process.env.FASHN_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key não configurada' });

  try {
    const { model_image, garment_image, category = 'auto' } = req.body;

    if (!model_image || !garment_image) {
      return res.status(400).json({ error: 'Campos obrigatórios: model_image, garment_image' });
    }

    const validCategories = ['tops', 'bottoms', 'one-pieces', 'auto'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: `Categoria inválida. Use: ${validCategories.join(', ')}` });
    }

    if (model_image.length > MAX_BODY_BYTES) {
      return res.status(400).json({ error: 'Imagem muito grande. Reduza para menos de 9 MB.' });
    }

    const fashnRes = await fetch(`${FASHN_BASE}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model_name: 'tryon-v1.6',
        inputs: {
          model_image,
          garment_image,
          category,
          mode: 'quality',
          moderation_level: 'permissive',
          garment_photo_type: 'flat-lay',
        },
      }),
    });

    if (!fashnRes.ok) {
      const text = await fashnRes.text();
      throw new Error(`FASHN error ${fashnRes.status}: ${text}`);
    }

    const { id: jobId } = await fashnRes.json();
    if (!jobId) throw new Error('FASHN não retornou jobId');

    return res.status(200).json({ jobId });

  } catch (err) {
    console.error('[/api/submit]', err.message);
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: '15mb' } },
};
