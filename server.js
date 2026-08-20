const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();
const requests = new Map();
const accessKey = process.env.SMS_LOCATOR_KEY || process.env.CENTRALE_KEY || process.env.ADMIN_KEY || process.env.API_KEY || "";

app.use(express.json({ limit: "16kb" }));
app.use(express.static(path.join(__dirname, "public")));

function authorized(req, res, next) {
  if (!accessKey) return res.status(503).json({ error: "Chiave SMS Locator non configurata" });
  if (req.query.key !== accessKey) return res.status(401).json({ error: "Accesso non autorizzato" });
  next();
}

function publicRequest(item) {
  return {
    code: item.code,
    note: item.note,
    status: item.lat == null ? (item.openedAt ? "LINK APERTO" : "IN ATTESA") : "POSIZIONE RICEVUTA",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    openedAt: item.openedAt,
    lat: item.lat,
    lon: item.lon,
    accuracy: item.accuracy,
    altitude: item.altitude,
    speed: item.speed,
    heading: item.heading,
    updates: item.updates,
  };
}

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "home.html")));
app.get("/centrale", (req, res) => res.sendFile(path.join(__dirname, "public", "centrale.html")));

app.post("/api/new", authorized, (req, res) => {
  let code;
  do code = crypto.randomBytes(4).toString("hex").toUpperCase(); while (requests.has(code));
  const now = new Date().toISOString();
  const item = {
    code,
    note: String(req.body?.note || "Richiesta posizione ADRN").slice(0, 160),
    createdAt: now,
    updatedAt: now,
    openedAt: null,
    lat: null,
    lon: null,
    accuracy: null,
    altitude: null,
    speed: null,
    heading: null,
    updates: 0,
  };
  requests.set(code, item);
  const link = `${req.protocol}://${req.get("host")}/localizza/${code}`;
  res.json({ code, link, message: `ADRN Soccorso: apri il link e condividi volontariamente la posizione GPS: ${link}` });
});

app.get("/api/list", authorized, (req, res) => {
  res.json([...requests.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(publicRequest));
});

app.delete("/api/request/:code", authorized, (req, res) => {
  res.json({ ok: requests.delete(String(req.params.code).toUpperCase()) });
});

app.get("/localizza/:code", (req, res) => {
  const item = requests.get(String(req.params.code).toUpperCase());
  if (!item) return res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
  item.openedAt ||= new Date().toISOString();
  item.updatedAt = new Date().toISOString();
  res.sendFile(path.join(__dirname, "public", "localizza.html"));
});

function savePosition(code, body, res) {
  const item = requests.get(String(code || "").toUpperCase());
  if (!item) return res.status(404).json({ error: "Richiesta non trovata" });
  const lat = Number(body?.lat);
  const lon = Number(body?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return res.status(400).json({ error: "Coordinate non valide" });
  }
  item.lat = lat;
  item.lon = lon;
  item.accuracy = Number.isFinite(Number(body.accuracy)) ? Number(body.accuracy) : null;
  item.altitude = Number.isFinite(Number(body.altitude)) ? Number(body.altitude) : null;
  item.speed = Number.isFinite(Number(body.speed)) ? Number(body.speed) : null;
  item.heading = Number.isFinite(Number(body.heading)) ? Number(body.heading) : null;
  item.updates += 1;
  item.updatedAt = new Date().toISOString();
  res.json({ ok: true, updates: item.updates });
}

app.post("/api/position/:code", (req, res) => savePosition(req.params.code, req.body, res));
app.post("/api/position", (req, res) => savePosition(req.body?.token, req.body, res));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`ADRN SMS Locator attivo sulla porta ${PORT}`));
