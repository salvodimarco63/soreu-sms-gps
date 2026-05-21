const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end("<h1>ADRN FUNZIONA</h1><p>Pagina HTML Render OK</p>");
});

app.get("/centrale", (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end("<h1>ADRN CENTRALE</h1><p>Se vedi questo come pagina normale, il problema è nel file centrale.html.</p>");
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("ADRN test server attivo su porta " + PORT);
});