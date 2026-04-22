// api/submit.js — Vercel Serverless Function
// Chama Google Vertex AI Virtual Try-On (virtual-try-on-001) e retorna resultado direto.

import crypto from 'crypto';

const PROJECT_ID = 'nksw-tryon';
const LOCATION   = 'us-central1';
const MODEL      = 'virtual-try-on-001';

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

async function getAccessToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss:   credentials.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud:   credentials.token_uri,
    exp:   now + 3600,
    iat:   now,
  })).toString('base64url');

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const sig = sign.sign(credentials.private_key, 'base64url');
  const jwt = `${header}.${payload}.${sig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Auth error: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function fetchBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar imagem do produto: ${res.status}`);
  const buf = await res.arrayBuffer();
  return Buffer.from(buf).toString('base64');
}

export default async function handler(req, res) {
  const headers = cors();
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT;
  if (!credentialsJson) return res.status(500).json({ error: 'Credenciais Google não configuradas' });

  try {
    const credentials = JSON.parse(credentialsJson);
    const { model_image, garment_image, category = 'auto' } = req.body;

    if (!model_image || !garment_image) {
      return res.status(400).json({ error: 'Campos obrigatórios: model_image, garment_image' });
    }

    // Extrai base64 puro da data URL
    const personBase64 = model_image.includes(',') ? model_image.split(',')[1] : model_image;

    // Baixa imagem do produto e converte para base64
    const garmentBase64 = await fetchBase64(garment_image);

    // Autenticação Google
    const accessToken = await getAccessToken(credentials);

    // Chama Vertex AI Virtual Try-On
    const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:predict`;

    const vtRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{
          person_image:   { bytesBase64Encoded: personBase64 },
          product_images: [{ bytesBase64Encoded: garmentBase64 }],
        }],
        parameters: { sampleCount: 1 },
      }),
    });

    if (!vtRes.ok) {
      const errText = await vtRes.text();
      throw new Error(`Vertex AI error ${vtRes.status}: ${errText}`);
    }

    const vtData = await vtRes.json();
    console.log('[submit] Vertex AI response keys:', Object.keys(vtData));

    const resultBase64 = vtData.predictions?.[0]?.bytesBase64Encoded;
    if (!resultBase64) throw new Error('Vertex AI não retornou imagem: ' + JSON.stringify(vtData).slice(0, 200));

    return res.status(200).json({
      jobId: `done-${Date.now()}`,
      output: `data:image/png;base64,${resultBase64}`,
    });

  } catch (err) {
    console.error('[/api/submit]', err.message);
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: '15mb' } },
};
