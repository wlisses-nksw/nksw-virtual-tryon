// api/debug.js — endpoint temporário para diagnóstico da FASHN API
// REMOVER após resolver o problema

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const apiKey = process.env.FASHN_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key não configurada' });

  const { jobId } = req.query;

  if (!jobId) {
    // Sem jobId: testa submit com imagem mínima
    const submitRes = await fetch('https://api.fashn.ai/v1/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model_name: 'tryon-v1.6',
        inputs: {
          model_image: 'https://images.pexels.com/photos/1308881/pexels-photo-1308881.jpeg',
          garment_image: 'https://images.pexels.com/photos/1488463/pexels-photo-1488463.jpeg',
          category: 'auto',
          mode: 'performance',
          moderation_level: 'permissive',
          garment_photo_type: 'auto',
        },
      }),
    });

    const submitText = await submitRes.text();
    return res.status(200).json({
      submit_status: submitRes.status,
      submit_response: JSON.parse(submitText),
    });
  }

  // Com jobId: verifica status
  const statusRes = await fetch(`https://api.fashn.ai/v1/status/${jobId}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });

  const statusText = await statusRes.text();
  return res.status(200).json({
    status_code: statusRes.status,
    status_response: JSON.parse(statusText),
  });
}
