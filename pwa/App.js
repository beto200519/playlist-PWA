const lista  = document.querySelector('#lista');
const banner = document.querySelector('#status-banner');

// URL real de tu API en Render
const API_URL = 'https://playlist-pwa.onrender.com/api/canciones';

window.addEventListener('load', () => {
  registerSW();
  cargarCanciones();
  actualizarEstado();
});

/* ---------- ONLINE / OFFLINE ---------- */
function actualizarEstado() {
  if (navigator.onLine) {
    banner.textContent = '✅ En línea';
    banner.classList.remove('offline', 'oculto');
    banner.classList.add('online');
    // Se oculta a los 2 segundos cuando está en línea
    setTimeout(() => banner.classList.add('oculto'), 2000);
  } else {
    banner.textContent = '⚠️ Sin conexión — mostrando playlist en caché';
    banner.classList.remove('online', 'oculto');
    banner.classList.add('offline');
  }
}

window.addEventListener('online',  actualizarEstado);
window.addEventListener('offline', actualizarEstado);

/* ---------- CONSUMO DE LA API ---------- */
async function cargarCanciones() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    render(data);
  } catch (err) {
    console.warn('Fetch falló, intentando caché…', err);
    banner.textContent = '⚠️ Sin conexión — mostrando playlist en caché';
    banner.classList.remove('online', 'oculto');
    banner.classList.add('offline');
    try {
      const cache = await caches.open('playlist-dynamic');
      const cached = await cache.match(API_URL);
      if (cached) render(await cached.json());
    } catch (_) { /* silencio */ }
  }
}

function render(canciones) {
  if (!canciones.length) {
    lista.innerHTML = '<p style="text-align:center">Sin canciones 🎧</p>';
    return;
  }
  lista.innerHTML = canciones.map(c => `
    <div class="card">
      <div class="portada" style="background: ${c.color}; color: ${esColorClaro(c.color) ? '#121212' : '#fff'};">
        <span>${c.iniciales}</span>
      </div>
      <div class="info">
        <h2>${c.titulo}</h2>
        <p class="artista">${c.artista}</p>
        <p class="album">💿 ${c.album} · ${c.anio}</p>
        <div class="meta">
          <span class="tag">${c.genero}</span>
          <span class="duracion">⏱ ${c.duracion}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// Detecta si el color es claro para poner texto oscuro
function esColorClaro(hex) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}
/* ---------- SERVICE WORKER ---------- */
async function registerSW() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js');
      console.log('SW registrado ✅');
    } catch (e) {
      console.log('SW falló ❌', e);
    }
  }
}
