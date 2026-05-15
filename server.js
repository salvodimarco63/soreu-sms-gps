const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 10000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'cambiaquesta';
const BASE_URL = (process.env.BASE_URL || '').replace(/\/$/, '');

const requests = new Map();

app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function makeCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function publicBase(req) {
  if (BASE_URL) return BASE_URL;
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  return `${proto}://${req.get('host')}`;
}

function adminOk(req) {
  return String(req.query.key || req.headers['x-admin-key'] || '') === String(ADMIN_KEY);
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/centrale', (req, res) => {
  if (!adminOk(req)) return res.status(401).sendFile(path.join(__dirname, 'public', 'unauthorized.html'));
  res.sendFile(path.join(__dirname, 'public', 'centrale.html'));
});

app.post('/api/new', (req, res) => {
  if (!adminOk(req)) return res.status(401).json({ error: 'non autorizzato' });
  const code = makeCode();
  const now = new Date().toISOString();
  const note = String(req.body.note || '').trim().slice(0, 300);
  const item = {
    code,
    note,
    createdAt: now,
    updatedAt: now,
    status: 'in attesa',
    lat: null,
    lon: null,
    accuracy: null,
    altitude: null,
    speed: null,
    heading: null,
    updates: 0,
    userAgent: null
  };
  requests.set(code, item);
  const link = `${publicBase(req)}/localizza/${code}`;
  const message = `Richiesta posizione: apri il link e premi CONSENTI per inviare volontariamente la tua posizione GPS.\n${link}`;
  res.json({ ...item, link, message });
});

app.get('/api/list', (req, res) => {
  if (!adminOk(req)) return res.status(401).json({ error: 'non autorizzato' });
  const data = Array.from(requests.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(data);
});

app.delete('/api/request/:code', (req, res) => {
  if (!adminOk(req)) return res.status(401).json({ error: 'non autorizzato' });
  requests.delete(String(req.params.code || '').toUpperCase());
  res.json({ ok: true });
});

app.get('/localizza/:code', (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  if (!requests.has(code)) {
    requests.set(code, {
      code,
      note: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'aperta',
      lat: null,
      lon: null,
      accuracy: null,
      altitude: null,
      speed: null,
      heading: null,
      updates: 0,
      userAgent: null
    });
  }
  res.sendFile(path.join(__dirname, 'public', 'localizza.html'));
});

app.post('/api/position/:code', (req, res) => {
  const code = String(req.params.code || '').toUpperCase();
  const item = requests.get(code);
  if (!item) return res.status(404).json({ error: 'codice non trovato' });

  const lat = Number(req.body.lat);
  const lon = Number(req.body.lon);
  const accuracy = Number(req.body.accuracy);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: 'coordinate non valide' });
  }
  item.lat = lat;
  item.lon = lon;
  item.accuracy = Number.isFinite(accuracy) ? accuracy : null;
  item.altitude = Number.isFinite(Number(req.body.altitude)) ? Number(req.body.altitude) : null;
  item.speed = Number.isFinite(Number(req.body.speed)) ? Number(req.body.speed) : null;
  item.heading = Number.isFinite(Number(req.body.heading)) ? Number(req.body.heading) : null;
  item.updatedAt = new Date().toISOString();
  item.status = 'ricevuta';
  item.updates = (item.updates || 0) + 1;
  item.userAgent = req.headers['user-agent'] || null;
  requests.set(code, item);
  res.json({ ok: true, item });
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => {
  console.log(`SOREU GPS v2 avviato sulla porta ${PORT}`);
});
