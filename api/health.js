const { setCorsHeaders } = require('./reference-foods');

module.exports = async function handler(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const aiConfigured = !!(
    process.env.AI_VISION_API_KEY ||
    process.env.GEMINI_API_KEY ||
    req.headers['x-ai-api-key']
  );

  return res.status(200).json({
    status: 'UP',
    service: 'NutriVision AI Backend (Vercel Serverless)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    integrations: {
      aiVisionConfigured: aiConfigured,
      usdaApiConfigured: true
    },
    message: 'NutriVision backend is active and ready on Vercel'
  });
};
