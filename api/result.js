// api/result.js — Vercel Serverless Function
// Verifica o status de um job FASHN e retorna o resultado quando pronto.

const FASHN_BASE = 'https://api.fashn.ai/v1';

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
    console.log('[result] FASHN status:', data.status, '| id:', jobId);

    const status = (data.status || '').toLowerCase();

    if (['failed', 'error', 'cancelled'].includes(status)) {
      const errMsg = data.error?.message || data.error || data.message || 'Processamento falhou';
      return res.status(200).json({ status: 'failed', error: String(errMsg) });
    }

    if (['completed', 'succeeded', 'success'].includes(status)) {
      const outputUrl = data.output?.[0] || data.outputs?.result?.[0] || data.result?.[0];
      if (!outputUrl) throw new Error('FASHN completou mas sem output');
      return res.status(200).json({ status: 'completed', output: outputUrl });
    }

    return res.status(200).json({ status: 'processing' });

  } catch (err) {
    console.error('[/api/result]', err.message);
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
}
