// Simple test API function for Vercel debugging
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  return res.status(200).json({
    message: 'Test API function working',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
}
