app.disable("x-powered-by");
const app = express();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

let positions = {};

app.get("/", (req, res) => {
  res.redirect("/centrale");
});
app.get("/centrale", (req, res) => {

  res.setHeader("Content-Type", "text/html");

  res.end(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>ADRN</title>
<style>
html,body{
margin:0;
height:100%;
}
iframe{
border:0;
width:100%;
height:100%;
}
</style>
</head>
<body>

<iframe src="https://www.openstreetmap.org/export/embed.html"></iframe>

</body>
</html>
  `);

});
.target { border-bottom:1px solid #ddd; padding:6px; }
</style>
</head>
<body>
<div id="sidebar">
<h2>ADRN</h2>
<div id="targets">Nessun target</div>
</div>
<div id="map"></div>

<script src="/socket.io/socket.io.js"></script>
<script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
<script>
const map = L.map("map").setView([45.4642, 9.19], 8);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
 attribution: "&copy; OpenStreetMap"
}).addTo(map);

const socket = io();
const markers = {};

function updateSidebar() {
 const box = document.getElementById("targets");
 let html = "";
 Object.values(markers).forEach(m => {
   html += "<div class='target'><b>" + m.token + "</b><br>" + m.timestamp + "</div>";
 });
 box.innerHTML = html || "Nessun target";
}

function updateMarker(data) {
 const key = data.token;

 if (markers[key]) {
   markers[key].marker.setLatLng([data.lat, data.lon]);
   markers[key].timestamp = data.timestamp;
 } else {
   const marker = L.marker([data.lat, data.lon]).addTo(map);
   marker.bindPopup("<b>" + data.token + "</b><br>Accuratezza: " + Math.round(data.accuracy) + " m");
   markers[key] = { marker: marker, token: data.token, timestamp: data.timestamp };
 }

 updateSidebar();
 map.setView([data.lat, data.lon], 15);
}

fetch("/api/positions")
 .then(r => r.json())
 .then(list => list.forEach(updateMarker));

socket.on("position", updateMarker);
</script>
</body>
</html>
  `);
});

app.get("/localizza/:token", (req, res) => {
  res.type("html").send(`
<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<title>ADRN Localizzazione</title>
<style>
body { font-family:Arial; text-align:center; padding:40px; }
h1 { color:#d32f2f; }
button {
 padding:16px 28px; font-size:20px; border:0; border-radius:10px;
 background:#1976d2; color:white;
}
#status { margin-top:25px; font-size:20px; font-weight:bold; }
</style>
</head>
<body>
<h1>ADRN</h1>
<p>Premi il pulsante per inviare volontariamente la tua posizione GPS ai soccorritori.</p>
<button onclick="sendPosition()">INVIA POSIZIONE GPS</button>
<div id="status"></div>

<script>
function sendPosition() {
 const status = document.getElementById("status");
 const token = window.location.pathname.split("/").pop();

 if (!navigator.geolocation) {
   status.innerHTML = "GPS non supportato";
   return;
 }

 status.innerHTML = "Acquisizione GPS...";

 navigator.geolocation.getCurrentPosition(async function(pos) {
   const body = {
     token: token,
     lat: pos.coords.latitude,
     lon: pos.coords.longitude,
     accuracy: pos.coords.accuracy,
     timestamp: new Date().toISOString()
   };

   const r = await fetch("/api/position", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify(body)
   });

   status.innerHTML = r.ok ? "Posizione inviata correttamente" : "Errore invio posizione";
 }, function() {
   status.innerHTML = "Impossibile ottenere la posizione GPS";
 }, {
   enableHighAccuracy: true,
   timeout: 15000,
   maximumAge: 0
 });
}
</script>
</body>
</html>
  `);
});

app.post("/api/position", (req, res) => {
  const { token, lat, lon, accuracy, timestamp } = req.body;

  const position = {
    token,
    lat,
    lon,
    accuracy,
    timestamp: timestamp || new Date().toISOString()
  };

  positions[token] = position;
  io.emit("position", position);

  res.json({ ok: true });
});

app.get("/api/positions", (req, res) => {
  res.json(Object.values(positions));
});

const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
  console.log("ADRN server attivo su porta " + PORT);
});