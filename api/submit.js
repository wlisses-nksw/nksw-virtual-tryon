// api/submit.js — Vercel Serverless Function
// Recebe a foto do cliente + URL do produto, envia para Replicate (Kolors) e retorna o jobId.
// Retorna imediatamente (< 1s) — sem polling aqui, evita timeout do free tier.

const REPLICATE_BASE = 'https://api.replicate.com/v1';
const TRYON_MODEL = 'cuuupid/idm-vton';
const MAX_BODY_BYTES = 12 * 1024 * 1024; // 12 MB

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function mapCategory(category) {
  const map = {
    'tops': 'upper_body',
    'bottoms': 'lower_body',
    'one-pieces': 'dresses',
    'auto': 'upper_body',
  };
  return map[category] || 'upper_body';
}

export default async function handler(req, res) {
  const headers = cors();
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const apiKey = process.env.REPLICATE_API_KEY;
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

    const replicateRes = await fetch(`${REPLICATE_BASE}/models/${TRYON_MODEL}/predictions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Prefer': 'wait=5',
      },
      body: JSON.stringify({
        input: {
          human_img: model_image,
          garm_img: garment_image,
          category: mapCategory(category),
          crop: false,
          steps: 30,
        },
      }),
    });

    if (!replicateRes.ok) {
      const text = await replicateRes.text();
      throw new Error(`Replicate error ${replicateRes.status}: ${text}`);
    }

    const data = await replicateRes.json();
    const jobId = data.id;
    if (!jobId) throw new Error('Replicate não retornou ID');

    // Se já completou no wait=5s, retorna direto
    if (data.status === 'succeeded' && data.output) {
      return res.status(200).json({ jobId, output: data.output });
    }

    return res.status(200).json({ jobId });

  } catch (err) {
    console.error('[/api/submit]', err.message);
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: '15mb' } },
};
