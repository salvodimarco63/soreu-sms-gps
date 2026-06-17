const key = new URLSearchParams(location.search).get('key') || '';
let lastMessage = '';
let map, markers = [];
function initMap(){ if(map) return; map=L.map('map').setView([45.5,9.5],9); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map); }
function fmt(d){ return new Date(d).toLocaleString('it-IT'); }
async function newRequest(){
  const note=document.getElementById('note').value;
  const res=await fetch('/api/new?key='+encodeURIComponent(key),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({note})});
  const data=await res.json(); if(!res.ok){alert('Errore: '+(data.error||res.status));return;}
  lastMessage=data.message; document.getElementById('sms').textContent=data.message; document.getElementById('msgBox').classList.remove('hidden'); loadList();
}
async function copyMsg(){ await navigator.clipboard.writeText(lastMessage); alert('Messaggio copiato'); }
async function del(code){ if(!confirm('Eliminare questa richiesta?')) return; await fetch('/api/request/'+code+'?key='+encodeURIComponent(key),{method:'DELETE'}); loadList(); }
function mapsUrl(x){ return `https://www.google.com/maps?q=${x.lat},${x.lon}`; }
async function loadList(){
  initMap();
  const res=await fetch('/api/list?key='+encodeURIComponent(key)); const data=await res.json();
  const tbody=document.getElementById('rows'); tbody.innerHTML=''; markers.forEach(m=>m.remove()); markers=[];
  if(!Array.isArray(data)||data.length===0){tbody.innerHTML='<tr><td colspan="5">Nessuna richiesta presente.</td></tr>';return;}
  let bounds=[];
  for(const x of data){
    const tr=document.createElement('tr');
    const pos=x.lat?`<div class="coords">${Number(x.lat).toFixed(6)}, ${Number(x.lon).toFixed(6)}</div><div class="help">precisione ~${Math.round(x.accuracy||0)} m<br>aggiornamenti: ${x.updates||1}</div>`:'<span class="help">non ancora ricevuta</span>';
    const actions=x.lat?`<a class="btn secondary small" target="_blank" href="${mapsUrl(x)}">Apri mappa</a> `:'';
    tr.innerHTML=`<td>${fmt(x.updatedAt)}<br><span class="help">creata: ${fmt(x.createdAt)}</span></td><td><b>${x.code}</b><br><span class="help">${x.note||''}</span></td><td><span class="status ${x.lat?'ok':'wait'}">${x.status}</span></td><td>${pos}</td><td>${actions}<button class="btn danger small" onclick="del('${x.code}')">Elimina</button></td>`;
    tbody.appendChild(tr);
    if(x.lat){ const marker=L.marker([x.lat,x.lon]).addTo(map).bindPopup(`<b>${x.code}</b><br>${x.note||''}<br>${Number(x.lat).toFixed(6)}, ${Number(x.lon).toFixed(6)}<br>~${Math.round(x.accuracy||0)} m`); markers.push(marker); bounds.push([x.lat,x.lon]); }
  }
  if(bounds.length) map.fitBounds(bounds,{padding:[40,40],maxZoom:16});
}
loadList(); setInterval(loadList,5000);
