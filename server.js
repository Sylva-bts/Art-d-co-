const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 4173);
const OXAPAY_MERCHANT_API_KEY = process.env.OXAPAY_MERCHANT_API_KEY || '';

function json(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('JSON invalide'));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res) {
  const filePath = req.url === '/' ? '/index.html' : req.url;
  const safePath = path.normalize(filePath).replace(/^\.\.(\/|\\|$)/, '');
  const fullPath = path.join(__dirname, safePath);

  if (!fullPath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(fullPath);
    const contentType =
      ext === '.html' ? 'text/html; charset=utf-8' :
      ext === '.css' ? 'text/css; charset=utf-8' :
      ext === '.js' ? 'application/javascript; charset=utf-8' :
      'text/plain; charset=utf-8';

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/payments/create') {
    if (!OXAPAY_MERCHANT_API_KEY) {
      return json(res, 500, { message: 'OXAPAY_MERCHANT_API_KEY non configurée.' });
    }

    try {
      const { amount } = await readBody(req);

      if (!Number.isFinite(amount) || amount <= 0) {
        return json(res, 400, { message: 'Montant invalide.' });
      }

      const apiRes = await fetch('https://api.oxapay.com/v1/payment/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant: OXAPAY_MERCHANT_API_KEY,
          amount,
          currency: 'USD',
          lifeTime: 30,
          feePaidByPayer: 0,
          underPaidCover: 2.5,
          returnUrl: `http://localhost:${PORT}`,
        }),
      });

      const data = await apiRes.json();

      if (!apiRes.ok || data.result !== 100 || !data.payLink) {
        return json(res, 502, { message: data.message || 'Erreur OxaPay', details: data });
      }

      return json(res, 200, { payLink: data.payLink, trackId: data.trackId || null });
    } catch {
      return json(res, 500, { message: 'Erreur serveur de paiement.' });
    }
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    return serveStatic(req, res);
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
