const code = location.pathname.split('/').pop().toUpperCase();
const result = document.getElementById('result');
const btn = document.getElementById('send');
const MONITORING_DURATION_MS = 15 * 60 * 1000;
let watchId=null, started=false, stopTimer=null, bestAccuracy=Infinity;
function msg(text, cls=''){ result.className='result '+cls; result.textContent=text; }
async function sendPosition(pos){
  const c=pos.coords; bestAccuracy=Math.min(bestAccuracy, c.accuracy || Infinity);
  msg(`Posizione inviata. Precisione attuale ~${Math.round(c.accuracy||0)} m. Monitoraggio attivo per 15 minuti: puoi lasciare aperta questa pagina.`, 'okText');
  await fetch('/api/position/'+encodeURIComponent(code),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lat:c.latitude,lon:c.longitude,accuracy:c.accuracy,altitude:c.altitude,speed:c.speed,heading:c.heading})});
}
function geoError(err){
  if(err.code===1) msg('Autorizzazione negata. Devi consentire l’accesso GPS dal browser/Safari.', 'badText');
  else if(err.code===2) msg('Posizione non disponibile. Spostati all’aperto o vicino a una finestra e riprova.', 'badText');
  else if(err.code===3) msg('Tempo scaduto. Attendi qualche secondo e riprova.', 'badText');
  else msg('Errore GPS. Riprova.', 'badText');
}
function start(){
  if(!navigator.geolocation){ msg('Questo browser non supporta la geolocalizzazione.', 'badText'); return; }
  if(started) return; started=true; btn.disabled=true; btn.textContent='Localizzazione in corso...';
  msg('Richiesta autorizzazione GPS in corso. Premi Consenti se il browser lo chiede.');
  navigator.geolocation.getCurrentPosition(sendPosition, geoError, {enableHighAccuracy:true, timeout:30000, maximumAge:0});
  watchId=navigator.geolocation.watchPosition(sendPosition, geoError, {enableHighAccuracy:true, timeout:30000, maximumAge:0});
  stopTimer=setTimeout(()=>{ if(watchId!==null) navigator.geolocation.clearWatch(watchId); btn.textContent='Monitoraggio completato'; msg(`Monitoraggio di 15 minuti completato. Migliore precisione rilevata ~${Math.round(bestAccuracy)} m.`, 'okText'); }, MONITORING_DURATION_MS);
}
btn.addEventListener('click', start);
