// Virtual Try-On — Cloudflare Worker
// Proxy seguro entre o widget Shopify e a API FASHN v1.6
// Nenhuma imagem é armazenada após a resposta ser enviada ao cliente.

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const FASHN_BASE = 'https://api.fashn.ai/v1';
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 30; // 30 × 2s = 60s timeout

function corsHeaders(origin, env) {
  const allowed = (env.ALLOWED_SHOP_DOMAIN || '').split(',').map(d => d.trim());
  const allowedOrigin =
    allowed.some(d => origin && origin.includes(d)) ? origin : allowed[0] || '*';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

// Converte ArrayBuffer para base64 em chunks para evitar stack overflow
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function submitToFashn(modelImageB64, garmentImageUrl, category, apiKey) {
  const res = await fetch(`${FASHN_BASE}/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model_image: modelImageB64,
      garment_image: garmentImageUrl,
      category,                     // tops | bottoms | one-pieces | auto
      mode: 'quality',
      moderation_level: 'permissive', // necessário para biquinis/lingerie
      garment_photo_type: 'auto',
      restore_background: true,
      restore_clothes: true,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FASHN submit error ${res.status}: ${text}`);
  }

  const { id } = await res.json();
  if (!id) throw new Error('FASHN não retornou ID de predição');
  return id;
}

async function pollFashn(predictionId, apiKey) {
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

    const res = await fetch(`${FASHN_BASE}/status/${predictionId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!res.ok) continue;

    const data = await res.json();

    if (data.status === 'completed') {
      const outputUrl = data.output?.[0];
      if (!outputUrl) throw new Error('FASHN completou mas sem output');
      return outputUrl;
    }

    if (data.status === 'failed') {
      throw new Error(`FASHN falhou: ${data.error || 'erro desconhecido'}`);
    }
    // status === 'processing' → continua polling
  }
  throw new Error('Timeout: FASHN demorou mais de 60s');
}

// Busca a imagem gerada e retorna como base64 para não expor URL externa ao cliente
async function fetchResultAsBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Falha ao buscar imagem resultado');
  const buffer = await res.arrayBuffer();
  const mime = res.headers.get('Content-Type') || 'image/jpeg';
  return `data:${mime};base64,${bufferToBase64(buffer)}`;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env);

    // Preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Método não permitido' }, 405, cors);
    }

    const url = new URL(request.url);
    if (url.pathname !== '/tryon') {
      return json({ error: 'Rota não encontrada' }, 404, cors);
    }

    if (!env.FASHN_API_KEY) {
      return json({ error: 'API key não configurada' }, 500, cors);
    }

    try {
      const contentType = request.headers.get('Content-Type') || '';
      let modelImageB64, garmentImageUrl, category;

      if (contentType.includes('multipart/form-data')) {
        // Recebe arquivo binário via FormData
        const form = await request.formData();
        const file = form.get('model_image');
        garmentImageUrl = form.get('garment_image');
        category = form.get('category') || 'auto';

        if (!file || typeof file === 'string') {
          return json({ error: 'model_image deve ser um arquivo' }, 400, cors);
        }
        if (file.size > MAX_FILE_BYTES) {
          return json({ error: 'Imagem muito grande (máx 10 MB)' }, 400, cors);
        }

        const buffer = await file.arrayBuffer();
        const b64 = bufferToBase64(buffer);
        modelImageB64 = `data:${file.type};base64,${b64}`;

      } else {
        // Recebe base64 via JSON
        const body = await request.json();
        modelImageB64 = body.model_image;
        garmentImageUrl = body.garment_image;
        category = body.category || 'auto';
      }

      if (!modelImageB64 || !garmentImageUrl) {
        return json({ error: 'Campos obrigatórios: model_image, garment_image' }, 400, cors);
      }

      // Valida categoria permitida
      const validCategories = ['tops', 'bottoms', 'one-pieces', 'auto'];
      if (!validCategories.includes(category)) {
        return json({ error: `Categoria inválida. Use: ${validCategories.join(', ')}` }, 400, cors);
      }

      // 1. Envia para FASHN
      const predictionId = await submitToFashn(modelImageB64, garmentImageUrl, category, env.FASHN_API_KEY);

      // 2. Aguarda resultado (polling)
      const resultUrl = await pollFashn(predictionId, env.FASHN_API_KEY);

      // 3. Busca imagem e retorna como base64 (zero URL externa exposta)
      const outputB64 = await fetchResultAsBase64(resultUrl);

      return json({ output: outputB64, status: 'success' }, 200, cors);

    } catch (err) {
      console.error('[TryOn Worker]', err.message);
      return json({ error: err.message || 'Erro interno' }, 500, cors);
    }
  },
};
