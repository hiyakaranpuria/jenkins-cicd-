const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');

process.env.PORT = '0'; // use random free port to avoid conflicts
process.env.NODE_ENV = 'test';

const { app, server, urlStore } = require('./app.js');

let port;

async function request(method, path, body = null) {
  const http = require('http');
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port,
      path,
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('URL Shortener API', () => {

  before(() => {
    port = server.address().port;
    Object.keys(urlStore).forEach(k => delete urlStore[k]);
  });

  after(() => {
    server.close();
  });

  test('GET /api/health returns healthy status', async () => {
    const res = await request('GET', '/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'healthy');
  });

  test('POST /shorten creates a short URL', async () => {
    const res = await request('POST', '/shorten', { url: 'https://www.google.com' });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.shortCode);
    assert.ok(res.body.shortUrl.includes(res.body.shortCode));
    assert.strictEqual(res.body.originalUrl, 'https://www.google.com');
  });

  test('POST /shorten returns 400 when url is missing', async () => {
    const res = await request('POST', '/shorten', {});
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  test('POST /shorten returns 400 for invalid URL', async () => {
    const res = await request('POST', '/shorten', { url: 'not-a-url' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  test('POST /shorten returns existing code for duplicate URL', async () => {
    await request('POST', '/shorten', { url: 'https://www.github.com' });
    const res = await request('POST', '/shorten', { url: 'https://www.github.com' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.message, 'URL already shortened');
  });

  test('GET /:shortCode redirects to original URL', async () => {
    const createRes = await request('POST', '/shorten', { url: 'https://www.example.com' });
    const shortCode = createRes.body.shortCode;

    const http = require('http');
    const redirectRes = await new Promise((resolve, reject) => {
      http.get(`http://localhost:${port}/${shortCode}`, (res) => {
        resolve({ status: res.statusCode, location: res.headers.location });
      }).on('error', reject);
    });

    assert.strictEqual(redirectRes.status, 302);
    assert.strictEqual(redirectRes.location, 'https://www.example.com');
  });

  test('GET /:shortCode returns 404 for unknown code', async () => {
    const res = await request('GET', '/unknownxyz');
    assert.strictEqual(res.status, 404);
  });

  test('GET /api/all returns all stored URLs', async () => {
    const res = await request('GET', '/api/all');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.urls));
    assert.strictEqual(typeof res.body.total, 'number');
  });

  test('DELETE /api/delete/:shortCode removes a URL', async () => {
    const createRes = await request('POST', '/shorten', { url: 'https://www.delete-me.com' });
    const shortCode = createRes.body.shortCode;

    const deleteRes = await request('DELETE', `/api/delete/${shortCode}`);
    assert.strictEqual(deleteRes.status, 200);

    const getRes = await request('GET', `/${shortCode}`);
    assert.strictEqual(getRes.status, 404);
  });

  test('DELETE /api/delete/:shortCode returns 404 for unknown code', async () => {
    const res = await request('DELETE', '/api/delete/doesnotexist');
    assert.strictEqual(res.status, 404);
  });
});
