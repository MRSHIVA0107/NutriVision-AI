const { setCorsHeaders } = require('./reference-foods');

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  res.status(200).json({
    status: 'UP',
    name: 'NutriVision AI Serverless API',
    version: '1.0.0',
    endpoints: [
      { path: '/api/health', method: 'GET', description: 'Backend and AI service health check' },
      { path: '/api/nutrition/search', method: 'GET', description: 'Search foods via USDA FoodData Central & Reference DB' },
      { path: '/api/nutrition/calculate', method: 'POST', description: 'Portion calculation & FDA Daily Value scaling' },
      { path: '/api/food/recognize', method: 'POST', description: 'Multimodal AI & Computer Vision food recognition' }
    ]
  });
};
