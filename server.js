const express = require("express");
const http = require("http");
const path = require("path");
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
  res.type("html");
  res.sendFile(path.join(__dirname, "public", "centrale.html"));
});

app.get("/localizza/:token", (req, res) => {
  res.type("html");
  res.sendFile(path.join(__dirname, "public", "localizza.html"));
});

app.post("/api/position", (req, res) => {
  const { token, lat, lon, accuracy, timestamp } = req.body;

  if (!token || !lat || !lon) {
    return res.status(400).json({ error: "Dati mancanti" });
  }

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

app.use(express.static("public"));

const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
  console.log("ADRN server attivo su porta " + PORT);
});