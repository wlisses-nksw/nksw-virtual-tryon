// api/result.js — Vercel Serverless Function
// Verifica o status de um job FASHN e retorna o resultado quando pronto.
// Chamada pelo widget a cada 2s (polling do cliente) — cada chamada < 1s.

const FASHN_BASE = 'https://api.fashn.ai/v1';

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// Converte ArrayBuffer para base64 em chunks (evita stack overflow em imagens grandes)
function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return Buffer.from(binary, 'binary').toString('base64');
}

export default async function handler(req, res) {
  const headers = cors();
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

  const apiKey = process.env.FASHN_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key não configurada' });

  const { jobId } = req.query;
  if (!jobId) return res.status(400).json({ error: 'Parâmetro jobId é obrigatório' });

  try {
    const statusRes = await fetch(`${FASHN_BASE}/status/${jobId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!statusRes.ok) {
      throw new Error(`FASHN status error ${statusRes.status}`);
    }

    const data = await statusRes.json();

    // Log para debug (visível nos logs da Vercel)
    console.log('[result] FASHN status response:', JSON.stringify(data).slice(0, 300));

    const status = (data.status || '').toLowerCase();

    // Mapeia todos os status possíveis da FASHN (old e new API)
    const processingStatuses = ['processing', 'queued', 'in_queue', 'in_progress', 'pending', 'starting'];
    const failedStatuses = ['failed', 'error', 'cancelled'];
    const completedStatuses = ['completed', 'succeeded', 'success'];

    if (failedStatuses.includes(status)) {
      const errMsg = data.error?.message || data.error || data.message || 'Processamento falhou';
      return res.status(200).json({ status: 'failed', error: String(errMsg) });
    }

    if (completedStatuses.includes(status)) {
      // Suporta output em diferentes formatos da API
      const outputUrl = data.output?.[0]
        || data.outputs?.result?.[0]
        || data.outputs?.image
        || data.result?.[0]
        || data.image;

      if (!outputUrl) {
        console.log('[result] Completed but no output found:', JSON.stringify(data).slice(0, 500));
        throw new Error('FASHN completou mas sem output');
      }

      const imgRes = await fetch(outputUrl);
      if (!imgRes.ok) throw new Error('Falha ao buscar imagem resultado');

      const buffer = await imgRes.arrayBuffer();
      const b64 = bufferToBase64(buffer);
      const mime = imgRes.headers.get('content-type') || 'image/jpeg';

      return res.status(200).json({
        status: 'completed',
        output: `data:${mime};base64,${b64}`,
      });
    }

    // Qualquer outro status → ainda processando
    return res.status(200).json({ status: 'processing' });

  } catch (err) {
    console.error('[/api/result]', err.message);
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
}
