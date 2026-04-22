// api/result.js — Vercel Serverless Function
// Verifica o status de um job Replicate (Kolors) e retorna o resultado quando pronto.

const REPLICATE_BASE = 'https://api.replicate.com/v1';

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default async function handler(req, res) {
  const headers = cors();
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

  const apiKey = process.env.REPLICATE_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key não configurada' });

  const { jobId } = req.query;
  if (!jobId) return res.status(400).json({ error: 'Parâmetro jobId é obrigatório' });

  try {
    const statusRes = await fetch(`${REPLICATE_BASE}/predictions/${jobId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!statusRes.ok) {
      throw new Error(`Replicate status error ${statusRes.status}`);
    }

    const data = await statusRes.json();
    console.log('[result] Replicate status:', data.status, '| id:', jobId);

    const status = (data.status || '').toLowerCase();

    if (status === 'failed' || status === 'canceled') {
      const errMsg = data.error || 'Processamento falhou';
      return res.status(200).json({ status: 'failed', error: String(errMsg) });
    }

    if (status === 'succeeded') {
      const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output;
      if (!outputUrl) {
        throw new Error('Replicate completou mas sem output');
      }
      return res.status(200).json({ status: 'completed', output: outputUrl });
    }

    // starting | processing → ainda aguardando
    return res.status(200).json({ status: 'processing' });

  } catch (err) {
    console.error('[/api/result]', err.message);
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
}
